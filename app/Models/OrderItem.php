<?php

namespace App\Models;

use Database\Factories\OrderItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $order_id
 * @property int $product_id
 * @property int $quantity
 * @property int $unit_price_cents
 * @property string|null $product_name
 * @property string|null $sku
 * @property int $list_unit_price_cents
 * @property string|null $promotion_percent
 * @property int $line_total_cents
 */
#[Fillable(['order_id', 'product_id', 'quantity', 'unit_price_cents', 'product_name', 'sku', 'list_unit_price_cents', 'promotion_percent', 'line_total_cents'])]
class OrderItem extends Model
{
    /** @use HasFactory<OrderItemFactory> */
    use HasFactory;

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
