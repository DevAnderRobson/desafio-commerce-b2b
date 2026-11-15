<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\PromotionFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $product_id
 * @property string $discount_percent
 * @property Carbon $starts_on
 * @property Carbon $ends_on
 * @property bool $is_demo
 */
#[Fillable(['product_id', 'discount_percent', 'starts_on', 'ends_on', 'is_demo'])]
class Promotion extends Model
{
    /** @use HasFactory<PromotionFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'starts_on' => 'date',
            'ends_on' => 'date',
            'is_demo' => 'boolean',
        ];
    }

    /**
     * @param  Builder<Promotion>  $query
     * @return Builder<Promotion>
     */
    #[Scope]
    protected function activeOn(Builder $query, CarbonInterface $date): Builder
    {
        return $query
            ->whereDate('starts_on', '<=', $date)
            ->whereDate('ends_on', '>=', $date);
    }

    /**
     * @return BelongsTo<Product, $this>
     */
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * Discount expressed in basis points (1% = 100) to keep price math in integers.
     */
    public function discountBasisPoints(): int
    {
        return (int) round(((float) $this->discount_percent) * 100);
    }
}
