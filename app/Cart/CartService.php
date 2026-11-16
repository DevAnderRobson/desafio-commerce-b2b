<?php

namespace App\Cart;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Cart mutations. Every operation re-validates the product, the customer and the stock on the
 * server; quantities and prices sent by the browser are never trusted.
 */
class CartService
{
    public function __construct(private CartGuard $guard) {}

    /**
     * Adds units to the cart, summing with what is already there.
     *
     * @throws ValidationException
     */
    public function add(User $user, Product $product, int $quantity): CartItem
    {
        return DB::transaction(function () use ($user, $product, $quantity): CartItem {
            $cart = Cart::query()->firstOrCreate(['user_id' => $user->id]);
            // Serializes concurrent adds of the same user so quantities are summed, not overwritten.
            Cart::query()->whereKey($cart->id)->lockForUpdate()->first();
            $item = CartItem::query()->firstOrNew(['cart_id' => $cart->id, 'product_id' => $product->id], ['quantity' => 0]);
            $target = $item->quantity + $quantity;

            $this->guard->assertCanHold($user, $product, $target);

            $item->quantity = $target;
            $item->save();

            return $item;
        });
    }

    /**
     * @throws ValidationException
     */
    public function setQuantity(User $user, CartItem $item, int $quantity): CartItem
    {
        $this->guard->assertCanHold($user, $item->product, $quantity);
        $item->update(['quantity' => $quantity]);

        return $item;
    }

    public function remove(CartItem $item): void
    {
        $item->delete();
    }

    public function clear(User $user): void
    {
        Cart::query()->where('user_id', $user->id)->first()?->items()->delete();
    }

    /**
     * Total of units in the user's cart (what the navbar badge shows).
     */
    public function unitCount(User $user): int
    {
        return (int) CartItem::query()
            ->whereIn('cart_id', Cart::query()->where('user_id', $user->id)->select('id'))
            ->sum('quantity');
    }
}
