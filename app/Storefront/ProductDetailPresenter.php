<?php

namespace App\Storefront;

use App\Models\Product;
use App\Models\Promotion;
use App\Models\Review;
use App\Models\Stock;
use App\Models\User;
use App\Pricing\PriceResolver;
use App\Support\PersonName;
use Illuminate\Pagination\LengthAwarePaginator;

/**
 * Builds the props of the product detail page. Prices go through ProductCardPresenter so the
 * visibility rules (D13/D14) live in one place.
 */
class ProductDetailPresenter
{
    public function __construct(
        private PriceResolver $prices,
        private ProductCardPresenter $cards,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function present(Product $product, ?User $user, bool $wishlisted): array
    {
        $product->loadMissing(['category', 'images', 'specifications', 'stock']);

        $customer = $user?->customer;
        $quote = $this->prices->resolve($customer, $product);
        $available = $product->stock?->availableQuantity() ?? 0;
        $priceState = $this->cards->priceState($quote, $user);

        if ($quote->isAvailable() && $quote->wholesaleMinQuantity !== null) {
            $wholesale = $this->prices->resolve($customer, $product, $quote->wholesaleMinQuantity);
            $priceState['wholesalePriceCents'] = $wholesale->unitPriceCents;
        }

        return [
            'id' => $product->id,
            'sku' => $product->sku,
            'ean' => $product->ean,
            'name' => $product->name,
            'slug' => $product->slug,
            'brand' => $product->brand ?? '',
            'description' => $product->description,
            'category' => ['name' => $product->category->name, 'href' => '/categorias/'.$product->category->slug],
            'canonicalUrl' => route('products.show', $product->slug),
            'images' => array_values($product->images->map(fn ($image): array => [
                'id' => $image->id,
                'url' => asset($image->path),
                'zoomUrl' => asset($image->path),
                'alt' => $image->alt,
            ])->all()),
            'specifications' => array_values($product->specifications->map(fn ($attribute): array => [
                'name' => $attribute->name,
                'value' => $attribute->value,
            ])->all()),
            'availability' => [
                'status' => match (true) {
                    $available <= 0 => 'out_of_stock',
                    $available <= Stock::LOW_STOCK_THRESHOLD => 'low_stock',
                    default => 'in_stock',
                },
                'quantity' => $available,
                'lowStockThreshold' => Stock::LOW_STOCK_THRESHOLD,
            ],
            'priceState' => $priceState,
            'promotionEndsAt' => $quote->isAvailable() && $quote->promotionPercent !== null
                ? Promotion::query()->activeOn(now())->where('product_id', $product->id)
                    ->orderByDesc('discount_percent')->first()?->ends_on->toDateString()
                : null,
            'canPurchase' => $quote->isAvailable() && $available > 0,
            'wishlisted' => $wishlisted,
        ];
    }

    /**
     * @param  LengthAwarePaginator<int, Review>  $reviews
     * @return array<string, mixed>
     */
    public function presentReviewList(LengthAwarePaginator $reviews, ?User $user): array
    {
        return [
            'data' => array_values($reviews->getCollection()->map(fn (Review $review): array => [
                'id' => $review->id,
                'rating' => $review->rating,
                'title' => $review->title,
                'body' => $review->body,
                'authorName' => PersonName::short($review->user->name),
                'badge' => $review->verified_purchase ? 'purchased' : 'not_purchased',
                'createdAt' => $review->created_at?->toIso8601String(),
                'isOwn' => $user !== null && $review->user_id === $user->id,
            ])->all()),
            'currentPage' => $reviews->currentPage(),
            'lastPage' => $reviews->lastPage(),
            'total' => $reviews->total(),
            'nextPageUrl' => $reviews->nextPageUrl(),
            'prevPageUrl' => $reviews->previousPageUrl(),
        ];
    }
}
