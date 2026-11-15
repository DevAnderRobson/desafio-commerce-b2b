<?php

namespace App\Search;

use App\Http\Requests\SearchRequest;
use App\Models\Category;
use App\Storefront\ProductCardPresenter;

/**
 * Props of the `store/search` Inertia page, shared by /buscar and /categorias/{slug}.
 */
class SearchPage
{
    private const PER_PAGE = 24;

    public function __construct(private ProductSearch $search, private ProductCardPresenter $presenter) {}

    /**
     * @return array<string, mixed>
     */
    public function props(SearchRequest $request, ?Category $category = null): array
    {
        $filters = $request->filters($category?->slug);
        $user = $request->user()?->loadMissing('customer.priceTable');

        $paginator = $this->search->query($filters)
            ->with(['category', 'stock', 'images'])
            ->paginate(self::PER_PAGE)
            ->withQueryString();

        return [
            'query' => $filters->term,
            'category' => $category !== null ? ['name' => $category->name, 'slug' => $category->slug] : null,
            'products' => [
                'data' => $this->presenter->presentMany($paginator->getCollection(), $user),
                'meta' => [
                    'currentPage' => $paginator->currentPage(),
                    'lastPage' => $paginator->lastPage(),
                    'perPage' => $paginator->perPage(),
                    'total' => $paginator->total(),
                    'from' => $paginator->firstItem(),
                    'to' => $paginator->lastItem(),
                ],
                'links' => ['prev' => $paginator->previousPageUrl(), 'next' => $paginator->nextPageUrl()],
            ],
            'filters' => [
                'category' => $category === null ? $filters->categorySlug : null,
                'brand' => $filters->brand,
                'sort' => $filters->sort->value,
            ],
            'facets' => $this->search->facets($filters),
            'sortOptions' => $request->sortOptions(),
        ];
    }
}
