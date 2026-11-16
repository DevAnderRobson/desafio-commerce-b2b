<?php

namespace App\Models;

use Database\Factories\AddressFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Delivery address of a company, shared by all its users (D24). Orders keep a snapshot, so
 * editing or removing an address never changes past orders.
 *
 * @property int $id
 * @property int $customer_id
 * @property string|null $label
 * @property string $cep digits only
 * @property string $street
 * @property string $number
 * @property string|null $complement
 * @property string $neighborhood
 * @property string $city
 * @property string $state
 * @property Carbon|null $last_used_at
 */
#[Fillable(['customer_id', 'label', 'cep', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'last_used_at'])]
class Address extends Model
{
    /** @use HasFactory<AddressFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['last_used_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function formattedCep(): string
    {
        return substr($this->cep, 0, 5).'-'.substr($this->cep, 5);
    }
}
