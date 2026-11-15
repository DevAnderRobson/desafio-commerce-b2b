<?php

namespace App\Search;

use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Catalog search on PostgreSQL. A product matches when any of these holds:
 * the Portuguese full-text vector matches every term (prefix match), every term appears in the
 * accent-insensitive name, the term is exactly its SKU/EAN, or the name is trigram-similar
 * (typos). Active products only; out-of-stock products always come last.
 */
class ProductSearch
{
    private const MAX_TERMS = 6;

    private const MAX_TERM_LENGTH = 50;

    private const SIMILARITY_THRESHOLD = 0.3;

    /**
     * @return Builder<Product>
     */
    public function query(SearchFilters $filters): Builder
    {
        $query = $this->matching($filters->term)->active();

        if ($filters->categorySlug !== null) {
            $query->whereHas('category', fn ($category) => $category->where('slug', $filters->categorySlug));
        }

        if ($filters->brand !== null) {
            $query->where('products.brand', $filters->brand);
        }

        $query
            ->leftJoin('stocks', 'stocks.product_id', '=', 'products.id')
            ->select('products.*')
            ->orderByRaw('(coalesce(stocks.quantity - stocks.reserved, 0) > 0) desc');

        return $this->applySort($query, $filters);
    }

    /**
     * Up to $limit products for the navbar suggestions.
     *
     * @return array{items: list<Product>, total: int}
     */
    public function suggest(string $term, int $limit = 5): array
    {
        if (mb_strlen(trim($term)) < 2) {
            return ['items' => [], 'total' => 0];
        }

        $filters = new SearchFilters(term: $term);
        $total = $this->query($filters)->reorder()->toBase()->getCountForPagination();

        return [
            'items' => array_values($this->query($filters)->with(['category', 'images'])->limit($limit)->get()->all()),
            'total' => $total,
        ];
    }

    /**
     * Matching products per category and per brand, each ignoring its own filter so the
     * user can switch within the facet.
     *
     * @return array{categories: list<array{name: string, slug: string, count: int}>, brands: list<array{name: string, count: int}>}
     */
    public function facets(SearchFilters $filters): array
    {
        $categories = $this->query($filters->withoutCategory())->reorder()
            ->join('categories', 'categories.id', '=', 'products.category_id')
            ->toBase()
            ->select('categories.name', 'categories.slug', DB::raw('count(distinct products.id) as total'))
            ->groupBy('categories.name', 'categories.slug')
            ->orderBy('categories.name')
            ->get();

        $brands = $this->query($filters->withoutBrand())->reorder()
            ->whereNotNull('products.brand')
            ->toBase()
            ->select('products.brand', DB::raw('count(distinct products.id) as total'))
            ->groupBy('products.brand')
            ->orderBy('products.brand')
            ->get();

        $categoryFacets = [];
        foreach ($categories as $row) {
            $categoryFacets[] = ['name' => (string) $row->name, 'slug' => (string) $row->slug, 'count' => (int) $row->total];
        }

        $brandFacets = [];
        foreach ($brands as $row) {
            $brandFacets[] = ['name' => (string) $row->brand, 'count' => (int) $row->total];
        }

        return ['categories' => $categoryFacets, 'brands' => $brandFacets];
    }

    /**
     * @return Builder<Product>
     */
    private function matching(string $term): Builder
    {
        $query = Product::query();
        $tokens = $this->tokens($term);

        if ($tokens === []) {
            return $query;
        }

        $tsQuery = implode(' & ', array_map(fn (string $token): string => $token.':*', $tokens));
        $folded = fn (string $token): string => '%'.addcslashes($token, '%_\\').'%';

        $query->where(function (Builder $match) use ($tokens, $tsQuery, $term, $folded): void {
            $match->whereRaw("products.search_vector @@ to_tsquery('portuguese', immutable_unaccent(?))", [$tsQuery])
                ->orWhere(function (Builder $all) use ($tokens, $folded): void {
                    foreach ($tokens as $token) {
                        $all->whereRaw('lower(immutable_unaccent(products.name)) like lower(immutable_unaccent(?))', [$folded($token)]);
                    }
                })
                ->orWhereRaw('products.sku = ? or products.ean = ?', [mb_strtoupper(trim($term)), trim($term)])
                ->orWhereRaw('similarity(lower(immutable_unaccent(products.name)), lower(immutable_unaccent(?))) > ?', [implode(' ', $tokens), self::SIMILARITY_THRESHOLD]);
        });

        return $query;
    }

    /**
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    private function applySort(Builder $query, SearchFilters $filters): Builder
    {
        $tokens = $this->tokens($filters->term);

        if ($filters->sort->needsPrice() && $filters->priceTableId !== null) {
            $direction = $filters->sort === SearchSort::PriceAsc ? 'asc' : 'desc';

            return $query
                ->leftJoin('price_table_items as sort_prices', function ($join) use ($filters): void {
                    $join->on('sort_prices.product_id', '=', 'products.id')
                        ->where('sort_prices.price_table_id', '=', $filters->priceTableId);
                })
                ->orderByRaw("sort_prices.price_cents {$direction} nulls last")
                ->orderBy('products.name');
        }

        if ($filters->sort === SearchSort::Relevance && $tokens !== []) {
            $tsQuery = implode(' & ', array_map(fn (string $token): string => $token.':*', $tokens));

            return $query
                ->orderByRaw(
                    '(case when products.sku = ? or products.ean = ? then 10 else 0 end'
                    ." + coalesce(ts_rank(products.search_vector, to_tsquery('portuguese', immutable_unaccent(?))), 0)"
                    .' + similarity(lower(immutable_unaccent(products.name)), lower(immutable_unaccent(?)))) desc',
                    [mb_strtoupper(trim($filters->term)), trim($filters->term), $tsQuery, implode(' ', $tokens)],
                )
                ->orderBy('products.name');
        }

        return $query->orderBy('products.name');
    }

    /**
     * Lower-cased alphanumeric tokens, safe to embed in a tsquery.
     *
     * @return list<string>
     */
    private function tokens(string $term): array
    {
        preg_match_all('/[\p{L}\p{N}]+/u', mb_strtolower($term), $matches);

        return array_slice(array_values(array_unique(array_map(
            fn (string $token): string => mb_substr($token, 0, self::MAX_TERM_LENGTH),
            $matches[0],
        ))), 0, self::MAX_TERMS);
    }
}
