<?php

use App\Models\Category;
use App\Models\Customer;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductSalesStat;
use App\Models\Promotion;
use App\Models\Stock;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => $this->travelTo('2026-11-15'));

function showcaseProduct(?PriceTable $table = null, int $priceCents = 1000, int $stock = 50, array $attributes = []): Product
{
    $product = Product::factory()->create($attributes);
    Stock::factory()->for($product)->create(['quantity' => $stock]);
    ProductImage::factory()->for($product)->create();

    if ($table !== null) {
        PriceTableItem::factory()->for($table)->for($product)->create(['price_cents' => $priceCents]);
    }

    return $product;
}

/**
 * Props of the home page after the deferred showcase sections were loaded.
 *
 * @return array<string, mixed>
 */
function homeProps(?User $user = null): array
{
    $test = $user ? test()->actingAs($user) : test();
    $version = $test->get(route('home'))->viewData('page')['version'] ?? null;

    return $test->withHeaders([
        'X-Inertia' => 'true',
        'X-Inertia-Version' => (string) $version,
        'X-Inertia-Partial-Component' => 'store/home',
        'X-Inertia-Partial-Data' => 'promotions,bestSellers,featured',
    ])->get(route('home'))->assertOk()->json('props');
}

it('lists categories with the number of active products', function () {
    $category = Category::factory()->create(['name' => 'Bebidas', 'slug' => 'bebidas']);
    Product::factory()->count(2)->for($category)->create();
    Product::factory()->inactive()->for($category)->create();

    $this->get(route('home'))->assertInertia(fn (AssertableInertia $page) => $page
        ->component('store/home')
        ->where('categories.0.slug', 'bebidas')
        ->where('categories.0.productCount', 2)
        ->where('categories.0.href', '/categorias/bebidas'));
});

it('defers the showcase sections', function () {
    $this->get(route('home'))->assertInertia(fn (AssertableInertia $page) => $page
        ->missing('promotions')
        ->missing('bestSellers')
        ->missing('featured'));
});

it('shows only active in-stock products with a current promotion, biggest discount first', function () {
    $small = showcaseProduct();
    $big = showcaseProduct();
    $expired = showcaseProduct();
    $outOfStock = showcaseProduct(stock: 0);
    $inactive = showcaseProduct(attributes: ['is_active' => false]);
    Promotion::factory()->for($small)->percent(5)->create();
    Promotion::factory()->for($big)->percent(30)->create();
    Promotion::factory()->for($expired)->between('2026-01-01', '2026-02-01')->create();
    Promotion::factory()->for($outOfStock)->create();
    Promotion::factory()->for($inactive)->create();

    expect(array_column(homeProps()['promotions'], 'id'))->toBe([$big->id, $small->id]);
});

it('orders best sellers by units sold and ignores products without sales', function () {
    $top = showcaseProduct();
    $second = showcaseProduct();
    $never = showcaseProduct();
    ProductSalesStat::factory()->for($top)->create(['units_sold' => 300]);
    ProductSalesStat::factory()->for($second)->create(['units_sold' => 40]);
    ProductSalesStat::factory()->for($never)->create(['units_sold' => 0]);

    expect(array_column(homeProps()['bestSellers'], 'id'))->toBe([$top->id, $second->id]);
});

it('returns empty lists so the frontend can hide sections without data', function () {
    $props = homeProps();

    expect($props['promotions'])->toBe([])
        ->and($props['bestSellers'])->toBe([])
        ->and($props['featured'])->toBe([]);
});

it('never exposes prices to visitors', function () {
    $table = PriceTable::factory()->standard()->create();
    $product = showcaseProduct($table, priceCents: 98765);
    Promotion::factory()->for($product)->create();

    $props = homeProps();

    expect($props['promotions'][0]['priceState']['status'])->toBe('guest')
        ->and($props['promotions'][0]['showAddToCart'])->toBeFalse()
        ->and(json_encode($props))->not->toContain('98765')->not->toContain('unitPriceCents');
});

it('shows pending analysis to users whose company is not approved yet', function () {
    $table = PriceTable::factory()->standard()->create();
    $product = showcaseProduct($table, priceCents: 98765);
    Promotion::factory()->for($product)->create();
    $user = User::factory()->ownerOf(Customer::factory()->pending()->create(['price_table_id' => $table->id]))->create();

    $props = homeProps($user);

    expect($props['promotions'][0]['priceState']['status'])->toBe('pending_approval')
        ->and($props['promotions'][0]['showAddToCart'])->toBeFalse()
        ->and(json_encode($props))->not->toContain('98765')->not->toContain('unitPriceCents');
});

it('shows the customer price with promotion and wholesale info to approved companies', function () {
    $table = PriceTable::factory()->standard()->create();
    $product = showcaseProduct();
    PriceTableItem::factory()->for($table)->for($product)->withWholesale(700, 10)->create(['price_cents' => 1000]);
    Promotion::factory()->for($product)->percent(20)->create();
    $user = User::factory()->ownerOf(Customer::factory()->create(['price_table_id' => $table->id]))->create();

    $card = homeProps($user)['promotions'][0];

    expect($card['priceState'])->toEqual([
        'status' => 'available',
        'unitPriceCents' => 800,
        'originalPriceCents' => 1000,
        'discountPercent' => 20,
        'wholesalePriceCents' => 700,
        'wholesaleMinQuantity' => 10,
        'savingsCents' => 200,
    ])->and($card['showAddToCart'])->toBeTrue();
});

it('flags products outside the price table of the customer', function () {
    $standard = PriceTable::factory()->standard()->create();
    $wholesale = PriceTable::factory()->wholesale()->create();
    $product = showcaseProduct($standard);
    Promotion::factory()->for($product)->create();
    $user = User::factory()->ownerOf(Customer::factory()->create(['price_table_id' => $wholesale->id]))->create();

    $card = homeProps($user)['promotions'][0];

    expect($card['priceState']['status'])->toBe('unavailable_for_model')
        ->and($card['priceState']['purchaseModelName'])->toBe('Atacadista')
        ->and($card['showAddToCart'])->toBeFalse();
});

it('serves the card data the frontend needs', function () {
    $product = showcaseProduct(attributes: ['name' => 'Água Mineral 500ml', 'brand' => 'Fonte']);
    ProductSalesStat::factory()->for($product)->create();

    $card = homeProps()['bestSellers'][0];

    expect($card['name'])->toBe('Água Mineral 500ml')
        ->and($card['brand'])->toBe('Fonte')
        ->and($card['href'])->toBe('/produtos/'.$product->slug)
        ->and($card['inStock'])->toBeTrue()
        ->and($card['stockQuantity'])->toBe(50)
        ->and($card['imageUrl'])->toContain('demo/products/placeholder.svg');
});
