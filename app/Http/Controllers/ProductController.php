<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Review;
use App\Models\WishlistItem;
use App\Storefront\ProductDetailPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProductController extends Controller
{
    private const REVIEWS_PER_PAGE = 5;

    private const SORTS = ['recent', 'highest', 'lowest'];

    public function __construct(private ProductDetailPresenter $presenter) {}

    public function show(Request $request, string $slug): Response
    {
        $product = Product::query()->active()->where('slug', $slug)->firstOrFail();
        $user = $request->user()?->loadMissing('customer.priceTable');

        if ($user === null) {
            $request->session()->put('url.intended', route('products.show', $product->slug, false));
        }

        $wishlisted = $user !== null && WishlistItem::query()
            ->where('user_id', $user->id)
            ->where('product_id', $product->id)
            ->exists();

        return Inertia::render('store/product', [
            'product' => $this->presenter->present($product, $user, $wishlisted),
            'routes' => [
                'login' => route('login', absolute: false),
                'wishlistAdd' => route('wishlist.store', $product, false),
                'wishlistRemove' => route('wishlist.destroy', $product, false),
                'cartAdd' => route('cart.items.store', absolute: false),
                'reviewSubmit' => route('reviews.store', $product, false),
            ],
            'reviews' => Inertia::defer(fn (): array => $this->reviews($request, $product), 'reviews'),
        ])->withViewData(['title' => $product->name]);
    }

    /**
     * @return array<string, mixed>
     */
    private function reviews(Request $request, Product $product): array
    {
        $user = $request->user();
        $onlyBuyers = $request->boolean('reviews_only_buyers');
        $sort = in_array($request->query('reviews_sort'), self::SORTS, true) ? $request->query('reviews_sort') : 'recent';

        $base = Review::query()->where('product_id', $product->id);
        $counts = (clone $base)->selectRaw('rating, count(*) as total')->groupBy('rating')->pluck('total', 'rating');
        $total = (int) $counts->sum();

        $listQuery = (clone $base)->with('user:id,name');
        if ($onlyBuyers) {
            $listQuery->where('verified_purchase', true);
        }
        match ($sort) {
            'highest' => $listQuery->orderByDesc('rating')->orderByDesc('id'),
            'lowest' => $listQuery->orderBy('rating')->orderByDesc('id'),
            default => $listQuery->orderByDesc('created_at')->orderByDesc('id'),
        };

        $own = $user !== null ? (clone $base)->where('user_id', $user->id)->first() : null;
        $canReview = $user?->can('view-prices') ?? false;

        return [
            'summary' => [
                'average' => $total > 0 ? round((float) $counts->map(fn ($count, $rating): int => $count * $rating)->sum() / $total, 1) : null,
                'total' => $total,
                'distribution' => collect(range(1, 5))->mapWithKeys(fn (int $rating): array => [(string) $rating => (int) ($counts[$rating] ?? 0)])->all(),
            ],
            'filters' => ['onlyBuyers' => $onlyBuyers, 'sort' => $sort],
            'list' => $this->presenter->presentReviewList(
                $listQuery->paginate(self::REVIEWS_PER_PAGE, pageName: 'reviews_page')->withQueryString()->withPath(route('products.show', $product->slug, false)),
                $user,
            ),
            'permission' => [
                'canReview' => $canReview,
                'reason' => $canReview ? null : ($user === null ? 'guest' : 'pending_approval'),
                'own' => $own !== null ? ['rating' => $own->rating, 'title' => $own->title, 'body' => $own->body] : null,
            ],
        ];
    }
}
