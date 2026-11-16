<?php

namespace App\Checkout;

final readonly class FreightOption
{
    public function __construct(
        public string $code,
        public string $label,
        public int $priceCents,
        public int $deliveryDaysMin,
        public int $deliveryDaysMax,
        public bool $isFree = false,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'code' => $this->code,
            'label' => $this->label,
            'priceCents' => $this->priceCents,
            'deliveryDaysMin' => $this->deliveryDaysMin,
            'deliveryDaysMax' => $this->deliveryDaysMax,
            'isFree' => $this->isFree,
        ];
    }
}
