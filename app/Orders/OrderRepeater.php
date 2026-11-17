<?php

namespace App\Orders;

use App\Cart\CartService;
use App\Models\CartItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * Puts the items of a past order into the user's cart again. Prices come from today's price
 * table and quantities are limited by today's stock; what cannot be bought is reported.
 */
class OrderRepeater
{
    public function __construct(private CartService $cart) {}

    public function repeat(User $user, Order $order): RepeatResult
    {
        $order->loadMissing('items.product.stock');
        $added = 0;
        $adjusted = [];
        $skipped = [];

        foreach ($order->items as $item) {
            $quantity = $this->quantityToAdd($user, $item);

            if ($quantity <= 0) {
                $skipped[] = $this->name($item);

                continue;
            }

            try {
                $this->cart->add($user, $item->product, $quantity);
            } catch (ValidationException) {
                $skipped[] = $this->name($item);

                continue;
            }

            $added++;

            if ($quantity < $item->quantity) {
                $adjusted[] = $this->name($item);
            }
        }

        return new RepeatResult($added, $adjusted, $skipped);
    }

    private function quantityToAdd(User $user, OrderItem $item): int
    {
        $inCart = (int) CartItem::query()
            ->whereIn('cart_id', $user->cart()->select('id'))
            ->where('product_id', $item->product_id)
            ->sum('quantity');
        $room = ($item->product->stock?->availableQuantity() ?? 0) - $inCart;

        return min($item->quantity, max(0, $room));
    }

    private function name(OrderItem $item): string
    {
        return $item->product_name ?? $item->product->name;
    }
}
