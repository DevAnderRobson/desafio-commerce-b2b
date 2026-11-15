<?php

namespace App\Pricing;

/**
 * Result of pricing one product line for one customer. All amounts are in cents.
 */
final readonly class PriceQuote
{
    public function __construct(
        public PriceAvailability $availability,
        public int $quantity = 0,
        public int $listUnitPriceCents = 0,
        public int $unitPriceCents = 0,
        public bool $wholesaleApplied = false,
        public ?string $promotionPercent = null,
        public ?int $wholesalePriceCents = null,
        public ?int $wholesaleMinQuantity = null,
    ) {}

    public static function hidden(): self
    {
        return new self(PriceAvailability::Hidden);
    }

    public static function unavailableForTable(): self
    {
        return new self(PriceAvailability::UnavailableForTable);
    }

    public function isAvailable(): bool
    {
        return $this->availability === PriceAvailability::Available;
    }

    public function totalCents(): int
    {
        return $this->unitPriceCents * $this->quantity;
    }

    /**
     * Savings against the regular table price (wholesale and promotion combined).
     */
    public function savingsCents(): int
    {
        return ($this->listUnitPriceCents - $this->unitPriceCents) * $this->quantity;
    }
}
