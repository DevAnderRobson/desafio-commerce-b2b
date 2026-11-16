<?php

namespace App\Orders;

use App\Enums\ReservationState;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Stock;
use Illuminate\Database\Eloquent\Collection;

/**
 * Holds, releases and consumes the stock and the company credit of an order (D30). The state is
 * kept on the order, so calling release or consume twice never changes the numbers twice.
 * Callers run inside a transaction.
 */
class Reservations
{
    /**
     * @throws OrderCannotBePlaced when stock or credit is no longer enough
     */
    public function reserve(Order $order): void
    {
        if ($order->reservation_state === ReservationState::Reserved) {
            return;
        }

        $order->loadMissing('items');
        $stocks = Stock::query()
            ->whereIn('product_id', $order->items->pluck('product_id'))
            ->orderBy('product_id')
            ->lockForUpdate()
            ->get()
            ->keyBy('product_id');

        foreach ($order->items as $item) {
            $stock = $stocks->get($item->product_id);

            if ($stock === null || $stock->availableQuantity() < $item->quantity) {
                throw new OrderCannotBePlaced("Estoque insuficiente para \"{$item->product_name}\". Volte ao carrinho e ajuste a quantidade.");
            }
        }

        foreach ($order->items as $item) {
            $stocks->get($item->product_id)?->increment('reserved', $item->quantity);
        }

        $creditHeld = 0;

        if ($order->is_deferred) {
            $customer = Customer::query()->whereKey($order->customer_id)->lockForUpdate()->firstOrFail();

            if ($customer->availableCreditCents() < $order->total_cents) {
                throw new OrderCannotBePlaced('O limite de crédito da empresa não comporta este pedido. Escolha outra condição de pagamento.', OrderCannotBePlaced::FIELD_TERM);
            }

            $customer->increment('credit_used_cents', $order->total_cents);
            $creditHeld = $order->total_cents;
        }

        $order->forceFill(['reservation_state' => ReservationState::Reserved, 'credit_reserved_cents' => $creditHeld])->save();
    }

    /**
     * Gives the reserved stock and credit back (refused, failed, expired or cancelled orders).
     */
    public function release(Order $order): void
    {
        if ($order->reservation_state !== ReservationState::Reserved) {
            return;
        }

        $order->loadMissing('items');
        $this->lockStocks($order)->each(function (Stock $stock) use ($order): void {
            $stock->decrement('reserved', (int) $order->items->where('product_id', $stock->product_id)->sum('quantity'));
        });

        if ($order->credit_reserved_cents > 0) {
            Customer::query()->whereKey($order->customer_id)->lockForUpdate()->firstOrFail()
                ->decrement('credit_used_cents', $order->credit_reserved_cents);
        }

        $order->forceFill(['reservation_state' => ReservationState::Released, 'credit_reserved_cents' => 0])->save();
    }

    /**
     * Payment approved: the reserved units leave the stock for good; the credit stays used.
     */
    public function consume(Order $order): void
    {
        if ($order->reservation_state !== ReservationState::Reserved) {
            return;
        }

        $order->loadMissing('items');
        $this->lockStocks($order)->each(function (Stock $stock) use ($order): void {
            $quantity = (int) $order->items->where('product_id', $stock->product_id)->sum('quantity');
            $stock->decrement('reserved', $quantity);
            $stock->decrement('quantity', $quantity);
        });

        $order->forceFill(['reservation_state' => ReservationState::Consumed])->save();
    }

    /**
     * @return Collection<int, Stock>
     */
    private function lockStocks(Order $order): Collection
    {
        return Stock::query()
            ->whereIn('product_id', $order->items->pluck('product_id'))
            ->orderBy('product_id')
            ->lockForUpdate()
            ->get();
    }
}
