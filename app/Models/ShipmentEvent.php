<?php

namespace App\Models;

use Database\Factories\ShipmentEventFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One tracking scan of a shipped order (simulated carrier).
 *
 * @property int $id
 * @property int $order_id
 * @property string $code posted | in_transit | at_hub | out_for_delivery | delivered
 * @property string $title
 * @property string $description
 * @property string $city
 * @property string $state
 * @property Carbon $occurred_at
 */
#[Fillable(['order_id', 'code', 'title', 'description', 'city', 'state', 'occurred_at'])]
class ShipmentEvent extends Model
{
    /** @use HasFactory<ShipmentEventFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['occurred_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
