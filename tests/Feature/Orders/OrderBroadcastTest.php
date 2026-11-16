<?php

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Events\OrderUpdated;
use App\Models\Customer;
use App\Models\User;
use App\Orders\OrderCreator;
use App\Orders\OrderLifecycle;
use App\Orders\PaymentProcessor;
use App\Payments\GatewayTransientError;
use Illuminate\Broadcasting\Broadcasters\Broadcaster;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;

function broadcastedOrder(): array
{
    Queue::fake();
    $setup = orderSetup(unitPriceCents: 20_000, quantity: 2);
    $order = app(OrderCreator::class)->create($setup['user'], $setup['address'], 'economic', 'PIX', 'key-'.uniqid());

    return [...$setup, 'order' => $order];
}

beforeEach(function () {
    $this->travelTo('2026-11-16 10:00:00');
    config(['shop.freight.free_shipping_threshold_cents' => 0, 'shop.payment.outcome' => 'approved']);
});

describe('events', function () {
    it('announces each payment attempt and the final status on the private order channel', function () {
        ['order' => $order] = broadcastedOrder();
        Event::fake([OrderUpdated::class]);

        app(PaymentProcessor::class)->process($order);

        Event::assertDispatched(OrderUpdated::class, fn (OrderUpdated $event) => $event->paymentStatus === PaymentStatus::Pending && $event->paymentAttempts === 1);
        Event::assertDispatched(OrderUpdated::class, function (OrderUpdated $event) use ($order) {
            return $event->order->is($order)
                && $event->broadcastAs() === 'order.updated'
                && $event->broadcastOn()[0] instanceof PrivateChannel
                && $event->broadcastOn()[0]->name === 'private-orders.'.$order->number
                && $event->broadcastWith() === [
                    'number' => $order->number,
                    'status' => 'paid',
                    'statusLabel' => 'Pago',
                    'isPaymentFinal' => true,
                    'payment' => ['status' => 'approved', 'attempts' => 1],
                ];
        });
    });

    it('announces a transient failure attempt without closing the order', function () {
        config(['shop.payment.outcome' => 'transient']);
        ['order' => $order] = broadcastedOrder();
        Event::fake([OrderUpdated::class]);

        expect(fn () => app(PaymentProcessor::class)->process($order))->toThrow(GatewayTransientError::class);

        Event::assertDispatchedTimes(OrderUpdated::class, 1);
    });

    it('announces refusals, expirations and the post-payment steps', function () {
        config(['shop.payment.outcome' => 'refused']);
        ['order' => $order] = broadcastedOrder();
        app(PaymentProcessor::class)->process($order);
        Event::fake([OrderUpdated::class]);

        app(OrderLifecycle::class)->transition($order->fresh(), OrderStatus::Cancelled);

        Event::assertDispatched(OrderUpdated::class, fn (OrderUpdated $event) => $event->broadcastWith()['status'] === 'cancelled');
    });

    it('carries no items, amounts, address or personal data', function () {
        ['order' => $order] = broadcastedOrder();

        expect(array_keys((new OrderUpdated($order->fresh()))->broadcastWith()))->toBe(['number', 'status', 'statusLabel', 'isPaymentFinal', 'payment']);
    });
});

describe('channel authorization', function () {
    function channelAllows(User $user, string $number): bool
    {
        $channels = (new ReflectionProperty(Broadcaster::class, 'channels'))->getValue(Broadcast::driver());

        return (bool) $channels['orders.{number}']($user, $number);
    }

    it('lets every user of the company listen to its orders', function () {
        ['order' => $order, 'user' => $owner] = broadcastedOrder();
        $member = User::factory()->memberOf($owner->customer)->create();

        expect(channelAllows($owner, $order->number))->toBeTrue()
            ->and(channelAllows($member, $order->number))->toBeTrue();
    });

    it('refuses other companies, users without company and unknown orders', function () {
        ['order' => $order] = broadcastedOrder();
        $stranger = User::factory()->ownerOf(Customer::factory()->create())->create();

        expect(channelAllows($stranger, $order->number))->toBeFalse()
            ->and(channelAllows(User::factory()->create(), $order->number))->toBeFalse()
            ->and(channelAllows($stranger, 'PED-NOPE'))->toBeFalse();
    });
});
