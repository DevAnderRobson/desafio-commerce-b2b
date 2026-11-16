<?php

namespace App\Cart;

use App\Models\CartItem;
use App\Pricing\PriceQuote;

final readonly class CartLine
{
    public function __construct(
        public CartItem $item,
        public PriceQuote $quote,
        public int $available,
        public ?CartItemIssue $issue,
    ) {}

    public function isValid(): bool
    {
        return $this->issue === null;
    }

    public function totalCents(): int
    {
        return $this->isValid() ? $this->quote->totalCents() : 0;
    }

    public function savingsCents(): int
    {
        return $this->isValid() ? $this->quote->savingsCents() : 0;
    }
}
