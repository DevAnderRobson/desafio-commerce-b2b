<?php

namespace Database\Factories;

use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PriceTableItem>
 */
class PriceTableItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'price_table_id' => PriceTable::factory(),
            'product_id' => Product::factory(),
            'price_cents' => 1000,
            'wholesale_price_cents' => null,
            'wholesale_min_quantity' => null,
        ];
    }

    public function withWholesale(int $priceCents, int $minQuantity): static
    {
        return $this->state([
            'wholesale_price_cents' => $priceCents,
            'wholesale_min_quantity' => $minQuantity,
        ]);
    }
}
