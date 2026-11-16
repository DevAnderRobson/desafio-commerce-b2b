<?php

namespace App\Models;

use App\Enums\PaymentStatus;
use Database\Factories\PaymentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One payment attempt of an order (simulated gateway). Payloads never hold card or bank data.
 *
 * @property int $id
 * @property int $order_id
 * @property string $payment_term_code
 * @property PaymentStatus $status
 * @property int $attempts
 * @property int $amount_cents
 * @property string|null $external_reference
 * @property array<string, mixed>|null $payload
 */
#[Fillable(['order_id', 'payment_term_code', 'status', 'attempts', 'amount_cents', 'external_reference', 'payload'])]
class Payment extends Model
{
    /** @use HasFactory<PaymentFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => PaymentStatus::class,
            'payload' => 'array',
        ];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
