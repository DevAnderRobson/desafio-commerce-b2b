<?php

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReservationState;
use App\Jobs\ProcessOrderPayment;
use App\Mail\OrderConfirmedMail;
use App\Mail\PaymentNotCompletedMail;
use App\Messaging\Events\OrderPaid;
use App\Messaging\Testing\FakeEventPublisher;
use App\Models\Cart;
use App\Models\Order;
use App\Orders\OrderCreator;
use App\Orders\PaymentProcessor;
use App\Payments\GatewayTransientError;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

/**
 * Places an order without running the payment job.
 *
 * @return array<string, mixed>
 */
function pendingOrder(string $term = 'PIX', int $unitPriceCents = 10_000, int $quantity = 2): array
{
    Queue::fake();
    $setup = orderSetup(unitPriceCents: $unitPriceCents, quantity: $quantity);
    $order = app(OrderCreator::class)->create($setup['user'], $setup['address'], 'economic', $term, 'key-'.uniqid());

    return [...$setup, 'order' => $order];
}

beforeEach(function () {
    $this->travelTo('2026-11-16 10:00:00');
    config(['shop.freight.free_shipping_threshold_cents' => 0, 'shop.payment.outcome' => 'approved']);
});

describe('approved', function () {
    it('pays the order, consumes the stock, clears the cart and announces it', function () {
        $events = FakeEventPublisher::fake();
        Mail::fake();
        ['order' => $order, 'stock' => $stock, 'user' => $user] = pendingOrder();

        app(PaymentProcessor::class)->process($order);

        $order->refresh();
        expect($order->status)->toBe(OrderStatus::Paid)
            ->and($order->paid_at)->not->toBeNull()
            ->and($order->reservation_state)->toBe(ReservationState::Consumed)
            ->and($order->payments->first()->status)->toBe(PaymentStatus::Approved)
            ->and($order->payments->first()->external_reference)->toStartWith('SIM-')
            ->and($stock->fresh()->quantity)->toBe(98)
            ->and($stock->fresh()->reserved)->toBe(0)
            ->and(Cart::query()->where('user_id', $user->id)->first()?->items()->count() ?? 0)->toBe(0);
        $events->assertPublished(OrderPaid::class, fn (OrderPaid $event) => $event->orderId === $order->id);
        Mail::assertQueued(OrderConfirmedMail::class, fn (OrderConfirmedMail $mail) => $mail->hasTo($user->email));
    });

    it('keeps the credit used after paying a deferred order', function () {
        ['order' => $order, 'user' => $user] = pendingOrder('BOL28', 50_000, 1);
        $used = $user->customer->fresh()->credit_used_cents;

        app(PaymentProcessor::class)->process($order);

        expect($user->customer->fresh()->credit_used_cents)->toBe($used)->and($used)->toBe($order->total_cents);
    });

    it('handles a duplicated delivery of the same result only once', function () {
        $events = FakeEventPublisher::fake();
        ['order' => $order, 'stock' => $stock] = pendingOrder();

        app(PaymentProcessor::class)->process($order);
        app(PaymentProcessor::class)->process($order);

        expect($stock->fresh()->quantity)->toBe(98)
            ->and($order->payments()->count())->toBe(1);
        $events->assertPublishedTimes(OrderPaid::class, 1);
    });
});

describe('refused', function () {
    it('refuses the order and gives back stock and credit', function () {
        config(['shop.payment.outcome' => 'refused']);
        Mail::fake();
        ['order' => $order, 'stock' => $stock, 'user' => $user] = pendingOrder('BOL28', 50_000, 1);

        app(PaymentProcessor::class)->process($order);

        $order->refresh();
        expect($order->status)->toBe(OrderStatus::PaymentRefused)
            ->and($order->reservation_state)->toBe(ReservationState::Released)
            ->and($order->payments->first()->status)->toBe(PaymentStatus::Refused)
            ->and($stock->fresh()->reserved)->toBe(0)
            ->and($stock->fresh()->quantity)->toBe(100)
            ->and($user->customer->fresh()->credit_used_cents)->toBe(0);
        Mail::assertQueued(PaymentNotCompletedMail::class);
    });

    it('does not release twice when processed again', function () {
        config(['shop.payment.outcome' => 'refused']);
        ['order' => $order, 'stock' => $stock] = pendingOrder();

        app(PaymentProcessor::class)->process($order);
        app(PaymentProcessor::class)->process($order);

        expect($stock->fresh()->reserved)->toBe(0);
    });
});

describe('temporary errors', function () {
    it('lets the job retry: a transient error leaves the order pending and the reservation intact', function () {
        config(['shop.payment.outcome' => 'transient']);
        ['order' => $order, 'stock' => $stock] = pendingOrder();

        expect(fn () => app(PaymentProcessor::class)->process($order))->toThrow(GatewayTransientError::class);

        expect($order->fresh()->status)->toBe(OrderStatus::PendingPayment)
            ->and($stock->fresh()->reserved)->toBe(2)
            ->and($order->payments->first()->attempts)->toBe(1);
    });

    it('eventually approves a flaky gateway after retries', function () {
        config(['shop.payment.outcome' => 'flaky']);
        ['order' => $order] = pendingOrder();

        foreach (range(1, 2) as $ignored) {
            expect(fn () => app(PaymentProcessor::class)->process($order))->toThrow(GatewayTransientError::class);
        }
        app(PaymentProcessor::class)->process($order);

        expect($order->fresh()->status)->toBe(OrderStatus::Paid)->and($order->payments->first()->attempts)->toBe(3);
    });

    it('fails the order for good when the job runs out of retries, releasing everything', function () {
        config(['shop.payment.outcome' => 'transient']);
        Mail::fake();
        ['order' => $order, 'stock' => $stock, 'user' => $user] = pendingOrder('BOL28', 50_000, 1);

        (new ProcessOrderPayment($order))->failed(new GatewayTransientError('x'));

        $order->refresh();
        expect($order->status)->toBe(OrderStatus::PaymentFailed)
            ->and($order->payments->first()->status)->toBe(PaymentStatus::Failed)
            ->and($stock->fresh()->reserved)->toBe(0)
            ->and($user->customer->fresh()->credit_used_cents)->toBe(0);
        Mail::assertQueued(PaymentNotCompletedMail::class);
    });

    it('configures the job with attempts and growing backoff', function () {
        $job = new ProcessOrderPayment(Order::factory()->make(['id' => 1]));

        expect($job->tries)->toBe(5)->and($job->backoff())->toBe([2, 5, 10, 20]);
    });
});

describe('expiration', function () {
    it('expires old pending orders, releasing stock and credit, and spares recent ones', function () {
        ['order' => $old, 'stock' => $stock, 'user' => $user] = pendingOrder('BOL28', 50_000, 1);
        $old->forceFill(['created_at' => now()->subMinutes(45)])->save();

        $this->artisan('orders:expire')->assertSuccessful();

        expect($old->fresh()->status)->toBe(OrderStatus::Expired)
            ->and($stock->fresh()->reserved)->toBe(0)
            ->and($user->customer->fresh()->credit_used_cents)->toBe(0);

        ['order' => $recent] = pendingOrder();
        $this->artisan('orders:expire')->assertSuccessful();

        expect($recent->fresh()->status)->toBe(OrderStatus::PendingPayment);
    });

    it('does not process the payment of an order that already expired', function () {
        ['order' => $order] = pendingOrder();
        $order->forceFill(['created_at' => now()->subHour()])->save();
        $this->artisan('orders:expire');

        app(PaymentProcessor::class)->process($order);

        expect($order->fresh()->status)->toBe(OrderStatus::Expired);
    });
});

describe('retry with another term', function () {
    it('reopens a refused order with a new payment term, re-reserving stock and recalculating totals', function () {
        config(['shop.payment.outcome' => 'refused']);
        ['order' => $order, 'user' => $user, 'stock' => $stock] = pendingOrder('BOL28', 50_000, 1);
        app(PaymentProcessor::class)->process($order);

        config(['shop.payment.outcome' => 'approved']);
        $this->actingAs($user)->post(route('orders.retry', $order->number), ['payment_term_code' => 'PIX', 'idempotency_key' => 'retry-1'])
            ->assertRedirect(route('orders.processing', $order->number));

        $order->refresh();
        expect($order->status)->toBe(OrderStatus::PendingPayment)
            ->and($order->payment_term_code)->toBe('PIX')
            ->and($order->is_deferred)->toBeFalse()
            ->and($order->surcharge_cents)->toBe(0)
            ->and($order->payments)->toHaveCount(2)
            ->and($stock->fresh()->reserved)->toBe(1);
    });

    it('does not create a second attempt for the same key or for an order that is not retryable', function () {
        config(['shop.payment.outcome' => 'refused']);
        ['order' => $order, 'user' => $user] = pendingOrder();
        app(PaymentProcessor::class)->process($order);

        $this->actingAs($user)->post(route('orders.retry', $order->number), ['payment_term_code' => 'PIX', 'idempotency_key' => 'retry-1']);
        $this->actingAs($user)->post(route('orders.retry', $order->number), ['payment_term_code' => 'PIX', 'idempotency_key' => 'retry-1']);
        $this->actingAs($user)->post(route('orders.retry', $order->number), ['payment_term_code' => 'PIX', 'idempotency_key' => 'retry-2'])
            ->assertSessionHasErrors('order');

        expect($order->payments()->count())->toBe(2);
    });

    it('rejects an unavailable term on retry', function () {
        config(['shop.payment.outcome' => 'refused']);
        ['order' => $order, 'user' => $user] = pendingOrder('PIX', 10_000, 1);
        app(PaymentProcessor::class)->process($order);

        $this->actingAs($user)->post(route('orders.retry', $order->number), ['payment_term_code' => 'BOL2856', 'idempotency_key' => 'retry-1'])
            ->assertSessionHasErrors('payment_term_code');

        expect($order->fresh()->status)->toBe(OrderStatus::PaymentRefused);
    });
});
