<?php

namespace App\Cart;

/**
 * Totals of a cart in cents. Lines with issues stay listed but are left out of the amounts.
 */
final readonly class CartSummary
{
    /**
     * @param  list<CartLine>  $lines
     */
    public function __construct(
        public array $lines,
        public int $subtotalCents,
        public int $savingsCents,
        public int $shippingCents,
        public int $surchargeCents,
        public int $totalCents,
    ) {}

    public function hasIssues(): bool
    {
        foreach ($this->lines as $line) {
            if (! $line->isValid()) {
                return true;
            }
        }

        return false;
    }

    public function isEmpty(): bool
    {
        return $this->lines === [];
    }

    public function unitCount(): int
    {
        return array_sum(array_map(fn (CartLine $line): int => $line->item->quantity, $this->lines));
    }
}
