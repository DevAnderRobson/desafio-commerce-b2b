<?php

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\Order;
use App\Orders\OrderCreator;
use App\Orders\OrderLifecycle;
use App\Orders\PaymentProcessor;
use App\Orders\ShipmentRoute;
use App\Orders\ShipmentTracker;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia;

function paidOrderTo(string $state, string $city = 'Cidade Destino'): Order
{
    Queue::fake();
    config(['shop.freight.free_shipping_threshold_cents' => 0, 'shop.payment.outcome' => 'approved']);
    $setup = orderSetup(unitPriceCents: 20_000, quantity: 1);
    $setup['address']->update(['state' => $state, 'city' => $city]);
    $order = app(OrderCreator::class)->create($setup['user'], $setup['address']->refresh(), 'economic', 'PIX', 'key-'.uniqid());
    app(PaymentProcessor::class)->process($order);

    return $order->refresh();
}

function advanceTo(Order $order, OrderStatus $status): void
{
    foreach ([OrderStatus::Picking, OrderStatus::Shipped, OrderStatus::Delivered] as $step) {
        app(OrderLifecycle::class)->transition($order->refresh(), $step);

        if ($step === $status) {
            return;
        }
    }
}

beforeEach(function () {
    $this->travelTo('2026-11-16 10:00:00');
    config(['shop.shipping.tracking_interval_minutes' => 5]);
});

describe('route', function () {
    it('goes from the distribution center through regional hubs to the customer city', function () {
        $order = paidOrderTo('RJ', 'Niterói');

        $plan = app(ShipmentRoute::class)->plan($order);
        $titles = array_column($plan, 'code');

        expect($plan[0])->toMatchArray(['code' => 'posted', 'city' => 'Curitiba', 'state' => 'PR'])
            ->and($titles)->toContain('in_transit', 'at_hub', 'out_for_delivery')
            ->and(end($plan))->toMatchArray(['code' => 'delivered', 'city' => 'Niterói', 'state' => 'RJ'])
            ->and(array_column(array_filter($plan, fn ($e) => $e['code'] === 'at_hub'), 'city'))->toBe(['São Paulo', 'Rio de Janeiro', 'Niterói']);
    });

    it('is short for the home state and goes through the national hub for far states', function () {
        $near = app(ShipmentRoute::class)->plan(paidOrderTo('PR', 'Maringá'));
        $far = app(ShipmentRoute::class)->plan(paidOrderTo('AM', 'Manaus'));

        expect(count($near))->toBe(5)
            ->and(array_column(array_filter($far, fn ($e) => $e['code'] === 'at_hub'), 'city'))->toBe(['São Paulo', 'Brasília', 'Manaus']);
    });
});

describe('simulation', function () {
    it('starts tracking when the order is shipped, with a code and the first scan', function () {
        $order = paidOrderTo('PR', 'Maringá');

        expect($order->tracking_code)->toBeNull();
        advanceTo($order, OrderStatus::Shipped);
        $order->refresh();

        expect($order->tracking_code)->toStartWith('TL')->toEndWith('BR')
            ->and($order->carrier)->toBe('TransLog Express')
            ->and($order->shipmentEvents)->toHaveCount(1)
            ->and($order->shipmentEvents->first()->code)->toBe('posted');
    });

    it('records one scan per interval and only delivers the order with the delivery scan', function () {
        Event::fake([OrderUpdated::class]);
        $order = paidOrderTo('PR', 'Maringá');
        advanceTo($order, OrderStatus::Shipped);
        $tracker = app(ShipmentTracker::class);

        expect($tracker->advanceDue())->toBe(0);

        $codes = ['posted'];
        foreach (range(1, 3) as $ignored) {
            $this->travel(5)->minutes();
            expect($tracker->advanceDue())->toBe(1);
            $codes[] = $order->shipmentEvents()->first()->code;
            expect($order->refresh()->status)->toBe(OrderStatus::Shipped);
        }

        expect($codes)->toBe(['posted', 'in_transit', 'at_hub', 'out_for_delivery']);

        $this->travel(5)->minutes();
        $tracker->advanceDue();

        $order->refresh();
        expect($order->status)->toBe(OrderStatus::Delivered)
            ->and($order->delivered_at)->not->toBeNull()
            ->and($order->shipmentEvents()->first()->code)->toBe('delivered')
            ->and($order->shipmentEvents()->count())->toBe(5);
        Event::assertDispatched(OrderUpdated::class);
    });

    it('runs from the scheduled command', function () {
        $order = paidOrderTo('PR', 'Maringá');
        advanceTo($order, OrderStatus::Shipped);
        $this->travel(6)->minutes();

        $this->artisan('orders:track')->expectsOutput('1 evento(s) de rastreamento registrado(s).')->assertSuccessful();

        expect($order->shipmentEvents()->count())->toBe(2);
    });

    it('completes the whole trail when the order is delivered by hand', function () {
        $order = paidOrderTo('SP', 'Campinas');
        advanceTo($order, OrderStatus::Delivered);

        $events = $order->refresh()->shipmentEvents;
        expect($events->first()->code)->toBe('delivered')
            ->and($events->pluck('code')->last())->toBe('posted')
            ->and($events->count())->toBe(count(app(ShipmentRoute::class)->plan($order)));
    });

    it('does not duplicate scans or touch orders that are not shipped', function () {
        $order = paidOrderTo('PR', 'Maringá');
        $this->travel(10)->minutes();

        expect(app(ShipmentTracker::class)->advanceDue())->toBe(0);
        advanceTo($order, OrderStatus::Shipped);
        app(ShipmentTracker::class)->begin($order->refresh());

        expect($order->shipmentEvents()->count())->toBe(1);
    });
});

describe('screens', function () {
    it('shows the full timeline and the tracking history on the order detail, newest first', function () {
        $order = paidOrderTo('PR', 'Maringá');
        advanceTo($order, OrderStatus::Shipped);
        $this->travel(5)->minutes();
        app(ShipmentTracker::class)->advanceDue();
        $order->refresh();

        $this->actingAs($order->user)->get(route('account.orders.show', $order->number))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('order.steps', fn ($steps) => collect($steps)->pluck('key')->all() === ['received', 'payment', 'confirmed', 'picking', 'shipped', 'delivered']
                && collect($steps)->pluck('state')->all() === ['done', 'done', 'done', 'done', 'current', 'pending'])
            ->where('order.shipment.trackingCode', $order->tracking_code)
            ->where('order.shipment.carrier', 'TransLog Express')
            ->where('order.shipment.isDelivered', false)
            ->where('order.shipment.events.0.code', 'in_transit')
            ->where('order.shipment.events.0.location', 'Curitiba/PR')
            ->where('order.shipment.events.1.code', 'posted'));
    });

    it('marks every step done after delivery and has no tracking before shipping', function () {
        $order = paidOrderTo('PR', 'Maringá');

        $this->actingAs($order->user)->get(route('account.orders.show', $order->number))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('order.shipment', null)
            ->where('order.steps.3.state', 'pending'));

        advanceTo($order, OrderStatus::Delivered);

        $this->actingAs($order->user)->get(route('account.orders.show', $order->number))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('order.steps', fn ($steps) => collect($steps)->pluck('state')->unique()->all() === ['done'])
            ->where('order.shipment.isDelivered', true));
    });

    it('keeps the failed payment state with the fulfillment steps pending', function () {
        Queue::fake();
        config(['shop.payment.outcome' => 'refused', 'shop.freight.free_shipping_threshold_cents' => 0]);
        $setup = orderSetup(unitPriceCents: 20_000);
        $order = app(OrderCreator::class)->create($setup['user'], $setup['address'], 'economic', 'PIX', 'k-refused');
        app(PaymentProcessor::class)->process($order);

        $this->actingAs($setup['user'])->get(route('orders.confirmation', $order->number))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('order.steps', fn ($steps) => collect($steps)->pluck('state')->all() === ['done', 'failed', 'pending', 'pending', 'pending', 'pending']));
    });
});
