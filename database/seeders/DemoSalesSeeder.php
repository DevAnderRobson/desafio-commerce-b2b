<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductSalesStat;
use Illuminate\Database\Seeder;

/**
 * Demo sales figures that feed the "best sellers" showcase until real orders exist (wave 7).
 * Deterministic and idempotent: the same products always get the same units.
 */
class DemoSalesSeeder extends Seeder
{
    public function run(): void
    {
        Product::query()->active()->orderBy('id')->each(function (Product $product): void {
            ProductSalesStat::updateOrCreate(
                ['product_id' => $product->id],
                ['units_sold' => (($product->id * 7919) % 480) + 20],
            );
        });
    }
}
