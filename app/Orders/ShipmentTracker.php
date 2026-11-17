<?php

namespace App\Orders;

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\Order;
use App\Models\ShipmentEvent;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Simulated carrier tracking. `begin` starts it when the order is shipped, `advanceDue` adds the
 * next scan when its time has come (the order only becomes delivered with the delivery scan) and
 * `finish` records everything that is still missing when the order is delivered by hand.
 */
class ShipmentTracker
{
    public function __construct(private ShipmentRoute $route) {}

    public function begin(Order $order): void
    {
        if ($order->tracking_code !== null) {
            return;
        }

        $order->forceFill([
            'tracking_code' => 'TL'.Str::upper(Str::random(9)).'BR',
            'carrier' => (string) config('shop.shipping.carrier'),
            'shipped_at' => now(),
        ])->save();

        $this->record($order, 0, now());
    }

    /**
     * Adds the next scan of every shipped order whose interval has passed.
     *
     * @return int number of scans recorded
     */
    public function advanceDue(): int
    {
        $interval = (int) config('shop.shipping.tracking_interval_minutes');
        $recorded = 0;

        Order::query()->where('status', OrderStatus::Shipped)->each(function (Order $order) use ($interval, &$recorded): void {
            $last = $order->shipmentEvents()->first();

            if ($last !== null && $last->occurred_at->gt(now()->subMinutes($interval))) {
                return;
            }

            $next = $order->shipmentEvents()->count();
            $plan = $this->route->plan($order);

            if ($next >= count($plan)) {
                return;
            }

            if ($plan[$next]['code'] === 'delivered') {
                app(OrderLifecycle::class)->transition($order, OrderStatus::Delivered);
            } else {
                $this->record($order, $next, now());
                OrderUpdated::dispatch($order->refresh());
            }

            $recorded++;
        });

        return $recorded;
    }

    /**
     * Fills the scans that are still missing (delivery confirmed ahead of the simulation).
     */
    public function finish(Order $order): void
    {
        DB::transaction(function () use ($order): void {
            $this->begin($order);
            $existing = $order->shipmentEvents()->count();
            $plan = $this->route->plan($order);

            for ($index = $existing; $index < count($plan); $index++) {
                $this->record($order, $index, now()->addSeconds($index - $existing));
            }
        });
    }

    private function record(Order $order, int $index, CarbonInterface $at): void
    {
        $step = $this->route->plan($order)[$index];

        ShipmentEvent::query()->create([...$step, 'order_id' => $order->id, 'occurred_at' => $at]);
    }
}
