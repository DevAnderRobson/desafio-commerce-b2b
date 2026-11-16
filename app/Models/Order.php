<?php

namespace App\Models;

use App\Enums\OrderStatus;
use App\Enums\ReservationState;
use Carbon\CarbonInterface;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Minimal order record. Wave 7 extends it with totals, address snapshot and payment data.
 *
 * @property int $id
 * @property string $number
 * @property int $customer_id
 * @property int $user_id
 * @property OrderStatus $status
 * @property CarbonInterface|null $delivered_at
 * @property CarbonInterface|null $paid_at
 * @property string|null $payment_term_code
 * @property string|null $payment_term_label
 * @property string $surcharge_percent
 * @property bool $is_deferred
 * @property int $subtotal_cents
 * @property int $savings_cents
 * @property int $shipping_cents
 * @property int $surcharge_cents
 * @property int $total_cents
 * @property int $credit_reserved_cents
 * @property ReservationState $reservation_state
 * @property string|null $freight_code
 * @property string|null $freight_label
 * @property array<string, string|null>|null $address_snapshot
 * @property string|null $idempotency_key
 */
#[Fillable([
    'number', 'customer_id', 'user_id', 'status', 'delivered_at', 'paid_at', 'payment_term_code', 'payment_term_label',
    'surcharge_percent', 'is_deferred', 'subtotal_cents', 'savings_cents', 'shipping_cents', 'surcharge_cents',
    'total_cents', 'credit_reserved_cents', 'reservation_state', 'freight_code', 'freight_label', 'address_snapshot',
    'idempotency_key',
])]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'delivered_at' => 'datetime',
            'paid_at' => 'datetime',
            'is_deferred' => 'boolean',
            'reservation_state' => ReservationState::class,
            'address_snapshot' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }
}
