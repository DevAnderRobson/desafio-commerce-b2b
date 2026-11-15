<?php

namespace App\Models;

use Database\Factories\PaymentTermFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $code
 * @property string $description
 * @property int $minimum_amount_cents
 * @property string $surcharge_percent
 * @property bool $is_deferred
 */
#[Fillable(['code', 'description', 'minimum_amount_cents', 'surcharge_percent', 'is_deferred'])]
class PaymentTerm extends Model
{
    /** @use HasFactory<PaymentTermFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_deferred' => 'boolean',
        ];
    }
}
