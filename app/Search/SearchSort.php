<?php

namespace App\Search;

enum SearchSort: string
{
    case Relevance = 'relevance';
    case Name = 'name';
    case PriceAsc = 'price_asc';
    case PriceDesc = 'price_desc';

    public function label(): string
    {
        return match ($this) {
            self::Relevance => 'Mais relevantes',
            self::Name => 'Nome (A–Z)',
            self::PriceAsc => 'Menor preço',
            self::PriceDesc => 'Maior preço',
        };
    }

    public function needsPrice(): bool
    {
        return $this === self::PriceAsc || $this === self::PriceDesc;
    }
}
