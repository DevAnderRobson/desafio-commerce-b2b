<?php

namespace App\Models;

use Database\Factories\PriceTableFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property string $code
 * @property string $description
 */
#[Fillable(['code', 'description'])]
class PriceTable extends Model
{
    /** @use HasFactory<PriceTableFactory> */
    use HasFactory;

    /**
     * @return HasMany<PriceTableItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(PriceTableItem::class);
    }
}
