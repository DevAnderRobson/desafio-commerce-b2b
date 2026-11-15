<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\ProductSalesStat;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProductSalesStat>
 */
class ProductSalesStatFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'units_sold' => fake()->numberBetween(1, 500),
        ];
    }
}
