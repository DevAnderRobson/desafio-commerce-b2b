<?php

namespace App\Orders;

use App\Models\PaymentTerm;

/**
 * A payment term as offered to one customer for one cart: amounts in cents, with the reason
 * when it is not available (minimum amount or insufficient credit, D21).
 */
final readonly class PaymentTermOption
{
    public function __construct(
        public PaymentTerm $term,
        public int $surchargeCents,
        public int $totalCents,
        public bool $available,
        public ?string $unavailableReason,
        public ?int $availableCreditCents,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'code' => $this->term->code,
            'label' => $this->term->code === 'PIX' ? 'PIX' : $this->term->description,
            'description' => $this->term->description,
            'surchargePercent' => (float) $this->term->surcharge_percent,
            'surchargeCents' => $this->surchargeCents,
            'totalCents' => $this->totalCents,
            'isDeferred' => $this->term->is_deferred,
            'available' => $this->available,
            'unavailableReason' => $this->unavailableReason,
            'availableCreditCents' => $this->availableCreditCents,
        ];
    }
}
