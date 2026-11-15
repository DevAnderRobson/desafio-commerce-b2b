<?php

namespace App\Storefront;

use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use App\Pricing\PriceAvailability;
use App\Pricing\PriceQuote;
use App\Pricing\PriceResolver;
use Illuminate\Support\Collection;

/**
 * Builds the props consumed by the React `ProductCard`. This is the only place where prices
 * become frontend props, so visitors and customers that are not approved never receive them.
 */
class ProductCardPresenter
{
    public function __construct(private PriceResolver $prices) {}

    /**
     * @param  Collection<int, Product>  $products  with `category`, `images` and `stock` loaded
     * @return list<array<string, mixed>>
     */
    public function presentMany(Collection $products, ?User $user): array
    {
        $customer = $user?->customer;
        $quotes = $this->prices->resolveMany($customer, $products);

        return array_values($products
            ->map(fn (Product $product): array => $this->present($product, $user, $customer, $quotes[$product->id]))
            ->all());
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Product $product, ?User $user, ?Customer $customer, PriceQuote $quote): array
    {
        $available = $product->stock?->availableQuantity() ?? 0;
        $image = $product->images->first();
        $inStock = $available > 0;

        return [
            'id' => $product->id,
            'sku' => $product->sku,
            'name' => $product->name,
            'brand' => $product->brand ?? '',
            'slug' => $product->slug,
            'href' => '/produtos/'.$product->slug,
            'categoryName' => $product->category->name,
            'imageUrl' => $image !== null ? asset($image->path) : null,
            'imageAlt' => $image !== null ? $image->alt : $product->name,
            'inStock' => $inStock,
            'stockQuantity' => $available,
            'priceState' => $this->priceState($quote, $user),
            'showAddToCart' => $quote->isAvailable() && $inStock,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function priceState(PriceQuote $quote, ?User $user): array
    {
        $customer = $user?->customer;

        return match ($quote->availability) {
            PriceAvailability::Hidden => $user === null
                ? ['status' => 'guest', 'loginHref' => route('login', absolute: false)]
                : ['status' => 'pending_approval'],
            PriceAvailability::UnavailableForTable => [
                'status' => 'unavailable_for_model',
                'purchaseModelName' => $this->modelName($customer),
            ],
            PriceAvailability::Available => [
                'status' => 'available',
                'unitPriceCents' => $quote->unitPriceCents,
                'originalPriceCents' => $quote->unitPriceCents < $quote->listUnitPriceCents ? $quote->listUnitPriceCents : null,
                'discountPercent' => $quote->promotionPercent !== null ? (float) $quote->promotionPercent : null,
                'wholesalePriceCents' => $quote->wholesalePriceCents,
                'wholesaleMinQuantity' => $quote->wholesaleMinQuantity,
                'savingsCents' => $quote->listUnitPriceCents - $quote->unitPriceCents,
            ],
        };
    }

    private function modelName(?Customer $customer): string
    {
        $table = $customer?->priceTable;

        return match ($table?->code) {
            'PADRAO' => 'Padrão',
            'ATACADISTA' => 'Atacadista',
            default => $table !== null ? $table->description : 'Padrão',
        };
    }
}
