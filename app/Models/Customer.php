<?php

namespace App\Models;

use App\Enums\ApprovalStatus;
use Database\Factories\CustomerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $cnpj
 * @property string $legal_name
 * @property string|null $trade_name
 * @property string|null $city
 * @property string|null $state
 * @property int|null $price_table_id
 * @property int $credit_limit_cents
 * @property int $credit_used_cents
 * @property bool $is_blocked
 * @property ApprovalStatus $approval_status
 * @property Carbon|null $approved_at
 * @property int|null $duplicate_of_customer_id
 */
#[Fillable([
    'id', 'cnpj', 'legal_name', 'trade_name', 'city', 'state', 'price_table_id',
    'credit_limit_cents', 'credit_used_cents', 'is_blocked', 'approval_status',
    'approved_at', 'duplicate_of_customer_id',
])]
class Customer extends Model
{
    /** @use HasFactory<CustomerFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_blocked' => 'boolean',
            'approval_status' => ApprovalStatus::class,
            'approved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<PriceTable, $this>
     */
    public function priceTable(): BelongsTo
    {
        return $this->belongsTo(PriceTable::class);
    }

    /**
     * @return HasMany<User, $this>
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function isApproved(): bool
    {
        return $this->approval_status === ApprovalStatus::Approved;
    }

    public function availableCreditCents(): int
    {
        return max(0, $this->credit_limit_cents - $this->credit_used_cents);
    }
}
