<?php

namespace App\Models;

use Database\Factories\ProductSalesStatFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Units sold per product, used by the "best sellers" showcase. Updated when orders are
 * delivered (wave 7); seeded with demo figures until then.
 *
 * @property int $id
 * @property int $product_id
 * @property int $units_sold
 */
#[Fillable(['product_id', 'units_sold'])]
class ProductSalesStat extends Model
{
    /** @use HasFactory<ProductSalesStatFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
