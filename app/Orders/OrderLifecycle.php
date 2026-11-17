<?php

namespace App\Orders;

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Only place that changes `orders.status`. Validates against OrderStatus::canTransitionTo and
 * records every transition in the log (no personal or payment data).
 */
class OrderLifecycle
{
    /**
     * @throws InvalidOrderTransition
     */
    public function transition(Order $order, OrderStatus $next): Order
    {
        return DB::transaction(function () use ($order, $next): Order {
            $locked = Order::query()->whereKey($order->id)->lockForUpdate()->firstOrFail();

            if (! $locked->status->canTransitionTo($next)) {
                throw InvalidOrderTransition::between($locked->status, $next);
            }

            $previous = $locked->status;
            $locked->status = $next;

            if ($next === OrderStatus::Paid) {
                $locked->paid_at = now();
            }

            if ($next === OrderStatus::Delivered) {
                $locked->delivered_at = now();
            }

            $locked->save();

            Log::info('Transição de pedido.', ['order' => $locked->number, 'from' => $previous->value, 'to' => $next->value]);

            match ($next) {
                OrderStatus::Shipped => app(ShipmentTracker::class)->begin($locked),
                OrderStatus::Delivered => app(ShipmentTracker::class)->finish($locked),
                default => null,
            };

            $payment = $locked->payments()->latest('id')->first();
            OrderUpdated::dispatch($locked, $payment?->status, $payment->attempts ?? 0);

            return $locked;
        });
    }
}
