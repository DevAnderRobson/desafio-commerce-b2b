<?php

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use App\Orders\InvalidOrderTransition;
use App\Orders\OrderCreator;
use App\Orders\OrderLifecycle;
use App\Orders\PaymentProcessor;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia;

function trackedOrder(string $term = 'PIX'): array
{
    Queue::fake();
    $setup = orderSetup(unitPriceCents: 20_000, quantity: 2);
    $order = app(OrderCreator::class)->create($setup['user'], $setup['address'], 'economic', $term, 'key-'.uniqid());

    return [...$setup, 'order' => $order];
}

beforeEach(function () {
    $this->travelTo('2026-11-16 10:00:00');
    config(['shop.freight.free_shipping_threshold_cents' => 0, 'shop.payment.outcome' => 'approved']);
});

describe('tracking screens', function () {
    it('shows the processing screen for a pending order with steps and polling settings', function () {
        ['order' => $order, 'user' => $user] = trackedOrder();

        $this->actingAs($user)->get(route('orders.processing', $order->number))->assertInertia(fn (AssertableInertia $page) => $page
            ->component('orders/processing')
            ->where('order.number', $order->number)
            ->where('order.outcome', 'processing')
            ->where('order.isPaymentFinal', false)
            ->where('order.steps.1.state', 'current')
            ->where('order.items.0.quantity', 2)
            ->where('order.address.city', fn ($city) => $city !== '')
            ->where('polling.timeoutMinutes', 3)
            ->where('polling.intervalsMs.0', 1500));
    });

    it('moves to the confirmation as soon as the payment is final', function () {
        ['order' => $order, 'user' => $user] = trackedOrder();
        app(PaymentProcessor::class)->process($order);

        $this->actingAs($user)->get(route('orders.processing', $order->number))->assertRedirect(route('orders.confirmation', $order->number));
        $this->actingAs($user)->get(route('orders.confirmation', $order->number))->assertInertia(fn (AssertableInertia $page) => $page
            ->component('orders/confirmation')
            ->where('order.outcome', 'paid')
            ->where('order.steps.2.state', 'done')
            ->where('order.canRetryPayment', false)
            ->where('retryIdempotencyKey', null));
    });

    it('sends back to the processing screen while the payment is still pending', function () {
        ['order' => $order, 'user' => $user] = trackedOrder();

        $this->actingAs($user)->get(route('orders.confirmation', $order->number))->assertRedirect(route('orders.processing', $order->number));
    });

    it('offers retry terms after a refusal, with a key for the new attempt', function () {
        config(['shop.payment.outcome' => 'refused']);
        ['order' => $order, 'user' => $user] = trackedOrder('BOL28');
        app(PaymentProcessor::class)->process($order);

        $this->actingAs($user)->get(route('orders.confirmation', $order->number))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('order.outcome', 'refused')
            ->where('order.steps.1.state', 'failed')
            ->where('order.canRetryPayment', true)
            ->where('order.retryTerms.0.code', 'PIX')
            ->where('retryIdempotencyKey', fn ($key) => str_starts_with($key, 'retry-')));
    });

    it('is visible to every user of the company but never to another company', function () {
        ['order' => $order, 'user' => $owner] = trackedOrder();
        $member = User::factory()->memberOf($owner->customer)->create();
        $stranger = User::factory()->ownerOf(Customer::factory()->create())->create();

        $this->actingAs($member)->get(route('orders.processing', $order->number))->assertOk();
        $this->actingAs($stranger)->get(route('orders.processing', $order->number))->assertForbidden();
        $this->actingAs($stranger)->get(route('orders.confirmation', $order->number))->assertForbidden();
        $this->actingAs($stranger)->post(route('orders.retry', $order->number), ['payment_term_code' => 'PIX', 'idempotency_key' => 'x'])->assertForbidden();
        auth()->logout();
        $this->get(route('orders.processing', $order->number))->assertRedirect(route('login'));
    });
});

describe('after payment', function () {
    it('allows only valid transitions', function () {
        expect(OrderStatus::PendingPayment->canTransitionTo(OrderStatus::Paid))->toBeTrue()
            ->and(OrderStatus::Paid->canTransitionTo(OrderStatus::Picking))->toBeTrue()
            ->and(OrderStatus::Picking->canTransitionTo(OrderStatus::Shipped))->toBeTrue()
            ->and(OrderStatus::Shipped->canTransitionTo(OrderStatus::Delivered))->toBeTrue()
            ->and(OrderStatus::PaymentRefused->canTransitionTo(OrderStatus::PendingPayment))->toBeTrue()
            ->and(OrderStatus::PendingPayment->canTransitionTo(OrderStatus::Delivered))->toBeFalse()
            ->and(OrderStatus::Paid->canTransitionTo(OrderStatus::Delivered))->toBeFalse()
            ->and(OrderStatus::Delivered->canTransitionTo(OrderStatus::Paid))->toBeFalse()
            ->and(OrderStatus::Cancelled->allowedTransitions())->toBe([]);
    });

    it('rejects an invalid transition without changing the order', function () {
        ['order' => $order] = trackedOrder();

        expect(fn () => app(OrderLifecycle::class)->transition($order, OrderStatus::Delivered))->toThrow(InvalidOrderTransition::class);
        expect($order->fresh()->status)->toBe(OrderStatus::PendingPayment);
    });

    it('advances through the demo command and stamps delivered_at', function () {
        ['order' => $order] = trackedOrder();
        app(PaymentProcessor::class)->process($order);

        foreach (['picking', 'shipped', 'delivered'] as $status) {
            $this->artisan('orders:advance', ['order' => $order->number, 'status' => $status])->assertSuccessful();
        }

        expect($order->fresh()->status)->toBe(OrderStatus::Delivered)->and($order->fresh()->delivered_at)->not->toBeNull();
        $this->artisan('orders:advance', ['order' => $order->number, 'status' => 'paid'])->assertFailed();
        $this->artisan('orders:advance', ['order' => 'PED-NOPE', 'status' => 'paid'])->assertFailed();
    });

    it('only grants the "bought" badge after delivery', function () {
        ['order' => $order, 'user' => $user, 'product' => $product] = trackedOrder();
        app(PaymentProcessor::class)->process($order);

        $review = fn () => $this->actingAs($user)->post(route('reviews.store', $product), ['rating' => 5, 'body' => 'Produto muito bom, recomendo.']);

        $review();
        expect(Review::query()->where('user_id', $user->id)->firstOrFail()->verified_purchase)->toBeFalse();

        foreach ([OrderStatus::Picking, OrderStatus::Shipped, OrderStatus::Delivered] as $status) {
            app(OrderLifecycle::class)->transition($order->fresh(), $status);
        }

        $review();
        expect(Review::query()->where('user_id', $user->id)->firstOrFail()->verified_purchase)->toBeTrue()
            ->and(Order::query()->count())->toBe(1);
    });
});
