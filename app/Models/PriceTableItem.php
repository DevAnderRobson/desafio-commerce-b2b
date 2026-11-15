<?php

namespace App\Models;

use Database\Factories\PriceTableItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $price_table_id
 * @property int $product_id
 * @property int $price_cents
 * @property int|null $wholesale_price_cents
 * @property int|null $wholesale_min_quantity
 */
#[Fillable(['price_table_id', 'product_id', 'price_cents', 'wholesale_price_cents', 'wholesale_min_quantity'])]
class PriceTableItem extends Model
{
    /** @use HasFactory<PriceTableItemFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<PriceTable, $this>
     */
    public function priceTable(): BelongsTo
    {
        return $this->belongsTo(PriceTable::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function hasWholesalePrice(): bool
    {
        return $this->wholesale_price_cents !== null && $this->wholesale_min_quantity !== null;
    }
}
