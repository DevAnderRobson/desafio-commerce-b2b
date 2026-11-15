<?php

namespace App\Pricing;

use App\Models\Customer;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\Promotion;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

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
        return $this->resolveMany($customer, collect([$product]), $quantity, $on)[$product->id];
    }

    /**
     * Prices several products with a fixed number of queries, for listings and carousels.
     *
     * @param  Collection<int, Product>  $products
     * @return array<int, PriceQuote> keyed by product id
     */
    public function resolveMany(?Customer $customer, Collection $products, int $quantity = 1, ?CarbonInterface $on = null): array
    {
        $ids = $products->pluck('id')->all();

        if ($customer === null || ! $customer->isApproved()) {
            return array_fill_keys($ids, PriceQuote::hidden());
        }

        if ($customer->price_table_id === null) {
            return array_fill_keys($ids, PriceQuote::unavailableForTable());
        }

        $items = PriceTableItem::query()
            ->where('price_table_id', $customer->price_table_id)
            ->whereIn('product_id', $ids)
            ->get()
            ->keyBy('product_id');

        $promotions = Promotion::query()
            ->whereIn('product_id', $ids)
            ->activeOn($on ?? now())
            ->orderByDesc('discount_percent')
            ->get()
            ->unique('product_id')
            ->keyBy('product_id');

        $quantity = max(1, $quantity);
        $quotes = [];

        foreach ($ids as $id) {
            $item = $items->get($id);

            $quotes[$id] = $item === null
                ? PriceQuote::unavailableForTable()
                : $this->quote($item, $promotions->get($id), $quantity);
        }

        return $quotes;
    }

    private function quote(PriceTableItem $item, ?Promotion $promotion, int $quantity): PriceQuote
    {
        $wholesaleApplied = $item->hasWholesalePrice() && $quantity >= (int) $item->wholesale_min_quantity;
        $unitPrice = $wholesaleApplied ? (int) $item->wholesale_price_cents : $item->price_cents;

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
            wholesalePriceCents: $item->hasWholesalePrice() ? $item->wholesale_price_cents : null,
            wholesaleMinQuantity: $item->hasWholesalePrice() ? $item->wholesale_min_quantity : null,
        );
    }

    private function applyDiscount(int $unitPriceCents, int $discountBasisPoints): int
    {
        return intdiv($unitPriceCents * (10_000 - $discountBasisPoints) + 5_000, 10_000);
    }
}
