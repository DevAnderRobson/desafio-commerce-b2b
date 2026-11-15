<?php

namespace App\Search;

/**
 * What the catalog search needs to know. `priceTableId` is only set for approved companies,
 * which is what allows sorting by price.
 */
final readonly class SearchFilters
{
    public function __construct(
        public string $term = '',
        public ?string $categorySlug = null,
        public ?string $brand = null,
        public SearchSort $sort = SearchSort::Relevance,
        public ?int $priceTableId = null,
    ) {}

    public function withoutCategory(): self
    {
        return new self($this->term, null, $this->brand, $this->sort, $this->priceTableId);
    }

    public function withoutBrand(): self
    {
        return new self($this->term, $this->categorySlug, null, $this->sort, $this->priceTableId);
    }
}
