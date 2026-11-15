<?php

namespace App\Pricing;

use App\Models\Customer;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\Promotion;
use Carbon\CarbonInterface;

/**
 * Single place that decides the unit price of a product for a customer.
 *
 * Order (see docs/planejamento/02-modelo-de-dados.md): table price, then wholesale price when
 * the minimum quantity is reached, then the product's own promotion on top of that unit price,
 * rounded half-up to cents per unit. Promotions never apply to a cart total.
 */
class PriceResolver
{
    public function resolve(?Customer $customer, Product $product, int $quantity = 1, ?CarbonInterface $on = null): PriceQuote
    {
        if ($customer === null || ! $customer->isApproved()) {
            return PriceQuote::hidden();
        }

        if ($customer->price_table_id === null) {
            return PriceQuote::unavailableForTable();
        }

        $item = PriceTableItem::query()
            ->where('price_table_id', $customer->price_table_id)
            ->where('product_id', $product->id)
            ->first();

        if ($item === null) {
            return PriceQuote::unavailableForTable();
        }

        $quantity = max(1, $quantity);
        $wholesaleApplied = $item->hasWholesalePrice() && $quantity >= (int) $item->wholesale_min_quantity;
        $unitPrice = $wholesaleApplied ? (int) $item->wholesale_price_cents : $item->price_cents;

        $promotion = $this->bestPromotion($product, $on ?? now());

        if ($promotion !== null) {
            $unitPrice = $this->applyDiscount($unitPrice, $promotion->discountBasisPoints());
        }

        return new PriceQuote(
            availability: PriceAvailability::Available,
            quantity: $quantity,
            listUnitPriceCents: $item->price_cents,
            unitPriceCents: $unitPrice,
            wholesaleApplied: $wholesaleApplied,
            promotionPercent: $promotion?->discount_percent,
        );
    }

    private function bestPromotion(Product $product, CarbonInterface $on): ?Promotion
    {
        return Promotion::query()
            ->where('product_id', $product->id)
            ->activeOn($on)
            ->orderByDesc('discount_percent')
            ->first();
    }

    private function applyDiscount(int $unitPriceCents, int $discountBasisPoints): int
    {
        return intdiv($unitPriceCents * (10_000 - $discountBasisPoints) + 5_000, 10_000);
    }
}
