<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\Promotion;
use App\Storefront\ProductCardPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    private const SHOWCASE_SIZE = 12;

    public function __construct(private ProductCardPresenter $presenter) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user()?->loadMissing('customer.priceTable');

        return Inertia::render('store/home', [
            'categories' => fn () => $this->categories(),
            'promotions' => Inertia::defer(fn () => $this->presenter->presentMany($this->promotions(), $user), 'showcase'),
            'bestSellers' => Inertia::defer(fn () => $this->presenter->presentMany($this->bestSellers(), $user), 'showcase'),
            'featured' => Inertia::defer(fn () => $this->presenter->presentMany($this->featured(), $user), 'showcase'),
        ]);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function categories(): array
    {
        $categories = Category::query()
            ->withCount(['products as active_products_count' => fn ($query) => $query->where('is_active', true)])
            ->orderBy('name')
            ->get();

        return array_values($categories->map(fn (Category $category): array => [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'href' => '/categorias/'.$category->slug,
            'productCount' => (int) $category->getAttribute('active_products_count'),
        ])->all());
    }

    /**
     * @return Collection<int, Product>
     */
    private function promotions(): Collection
    {
        $active = fn (): Builder => Promotion::query()->activeOn(now());

        return $this->showcase()
            ->whereIn('products.id', $active()->select('product_id'))
            ->orderByDesc($active()
                ->whereColumn('promotions.product_id', 'products.id')
                ->selectRaw('max(discount_percent)'))
            ->orderBy('products.id')
            ->get();
    }

    /**
     * @return Collection<int, Product>
     */
    private function bestSellers(): Collection
    {
        return $this->showcase()
            ->join('product_sales_stats', 'product_sales_stats.product_id', '=', 'products.id')
            ->where('product_sales_stats.units_sold', '>', 0)
            ->orderByDesc('product_sales_stats.units_sold')
            ->orderBy('products.id')
            ->select('products.*')
            ->get();
    }

    /**
     * Newest active products that have images and stock.
     *
     * @return Collection<int, Product>
     */
    private function featured(): Collection
    {
        return $this->showcase()->whereHas('images')->orderByDesc('products.id')->get();
    }

    /**
     * Active, in-stock products with what the cards need, capped to the showcase size.
     *
     * @return Builder<Product>
     */
    private function showcase(): Builder
    {
        return Product::query()
            ->active()
            ->whereHas('stock', fn (Builder $query) => $query->whereColumn('quantity', '>', 'reserved'))
            ->with(['category', 'stock', 'images'])
            ->limit(self::SHOWCASE_SIZE);
    }
}
