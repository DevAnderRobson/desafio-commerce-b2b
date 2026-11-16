<?php

namespace App\Cart;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\User;
use App\Pricing\PriceAvailability;
use App\Pricing\PriceResolver;
use Illuminate\Support\Collection;

/**
 * Single source of cart amounts, reused by the cart page and the checkout (D: price order in
 * 02-modelo-de-dados.md). Shipping and payment-term surcharge are filled by the checkout
 * (wave 6) and are zero here.
 */
class CartTotals
{
    public function __construct(private PriceResolver $prices) {}

    public function summarize(User $user, int $shippingCents = 0, int $surchargeCents = 0): CartSummary
    {
        $cart = Cart::query()->where('user_id', $user->id)->first();

        /** @var Collection<int, CartItem> $items */
        $items = $cart === null
            ? new Collection
            : $cart->items()->with(['product.stock', 'product.images', 'product.promotions'])->orderBy('id')->get();

        $customer = $user->customer;
        $quotes = [];

        foreach ($items->groupBy('quantity') as $quantity => $group) {
            $quotes += $this->prices->resolveMany($customer, $group->map(fn (CartItem $item) => $item->product)->values(), (int) $quantity);
        }

        $lines = [];
        $subtotal = 0;
        $savings = 0;

        foreach ($items as $item) {
            $quote = $quotes[$item->product_id];
            $available = $item->product->stock?->availableQuantity() ?? 0;
            $line = new CartLine($item, $quote, $available, $this->issueFor($item, $quote->availability, $available));

            $subtotal += $line->totalCents();
            $savings += $line->savingsCents();
            $lines[] = $line;
        }

        return new CartSummary(
            lines: $lines,
            subtotalCents: $subtotal,
            savingsCents: $savings,
            shippingCents: $shippingCents,
            surchargeCents: $surchargeCents,
            totalCents: $subtotal + $shippingCents + $surchargeCents,
        );
    }

    private function issueFor(CartItem $item, PriceAvailability $availability, int $available): ?CartItemIssue
    {
        return match (true) {
            ! $item->product->is_active => CartItemIssue::Inactive,
            $availability !== PriceAvailability::Available => CartItemIssue::UnavailableForModel,
            $available <= 0 => CartItemIssue::OutOfStock,
            $item->quantity > $available => CartItemIssue::InsufficientStock,
            default => null,
        };
    }
}
