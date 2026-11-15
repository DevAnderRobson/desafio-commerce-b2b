<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Models\Customer;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductImage;
use App\Models\Promotion;
use App\Models\Review;
use App\Models\Stock;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => $this->travelTo('2026-11-15'));

function detailProduct(?PriceTable $table = null, int $stock = 50, array $attributes = []): Product
{
    $product = Product::factory()->create($attributes);
    Stock::factory()->for($product)->create(['quantity' => $stock]);
    ProductImage::factory()->count(3)->for($product)->create();
    ProductAttribute::factory()->for($product)->create(['name' => 'Peso', 'value' => '500 g']);

    if ($table !== null) {
        PriceTableItem::factory()->for($table)->for($product)->create(['price_cents' => 1000]);
    }

    return $product;
}

function approvedBuyer(PriceTable $table): User
{
    return User::factory()->ownerOf(Customer::factory()->create(['price_table_id' => $table->id]))->create();
}

it('renders the product with gallery, specifications and canonical url', function () {
    $product = detailProduct(attributes: ['slug' => 'cafe-torrado']);

    $this->get('/produtos/cafe-torrado')->assertInertia(fn (AssertableInertia $page) => $page
        ->component('store/product')
        ->where('product.slug', 'cafe-torrado')
        ->where('product.canonicalUrl', url('/produtos/cafe-torrado'))
        ->has('product.images', 3)
        ->where('product.specifications.0.name', 'Peso')
        ->where('product.category.name', $product->category->name)
        ->where('routes.reviewSubmit', route('reviews.store', $product, false))
        ->missing('reviews'));
});

it('returns 404 for inactive or unknown products', function () {
    Product::factory()->inactive()->create(['slug' => 'inativo']);

    $this->get('/produtos/inativo')->assertNotFound();
    $this->get('/produtos/nao-existe')->assertNotFound();
});

it('never exposes the price to visitors or pending companies', function () {
    $table = PriceTable::factory()->create();
    detailProduct($table, attributes: ['slug' => 'produto-a']);

    $this->get('/produtos/produto-a')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('product.priceState.status', 'guest')
        ->missing('product.priceState.unitPriceCents'));

    $pending = User::factory()->ownerOf(Customer::factory()->pending()->create(['price_table_id' => $table->id]))->create();

    $this->actingAs($pending)->get('/produtos/produto-a')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('product.priceState.status', 'pending_approval')
        ->missing('product.priceState.unitPriceCents'));
});

it('shows the final wholesale unit price including the promotion', function () {
    $table = PriceTable::factory()->create();
    $product = detailProduct(attributes: ['slug' => 'produto-b']);
    PriceTableItem::factory()->for($table)->for($product)->withWholesale(800, 10)->create(['price_cents' => 1000]);
    Promotion::factory()->for($product)->create([
        'discount_percent' => 10,
        'starts_on' => '2026-11-01',
        'ends_on' => '2026-11-30',
    ]);

    $this->actingAs(approvedBuyer($table))->get('/produtos/produto-b')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('product.priceState.status', 'available')
        ->where('product.priceState.unitPriceCents', 900)
        ->where('product.priceState.wholesaleMinQuantity', 10)
        ->where('product.priceState.wholesalePriceCents', 720)
        ->where('product.promotionEndsAt', '2026-11-30')
        ->where('product.canPurchase', true));
});

it('flags products outside the price table and out-of-stock products as not purchasable', function () {
    $table = PriceTable::factory()->create();
    detailProduct(attributes: ['slug' => 'fora-da-tabela']);
    detailProduct($table, stock: 0, attributes: ['slug' => 'sem-estoque']);
    $user = approvedBuyer($table);

    $this->actingAs($user)->get('/produtos/fora-da-tabela')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('product.priceState.status', 'unavailable_for_model')
        ->where('product.canPurchase', false));

    $this->actingAs($user)->get('/produtos/sem-estoque')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('product.availability.status', 'out_of_stock')
        ->where('product.canPurchase', false));
});

it('reports low stock using the single threshold constant', function () {
    detailProduct(stock: 10, attributes: ['slug' => 'poucas']);
    detailProduct(stock: 11, attributes: ['slug' => 'muitas']);

    $this->get('/produtos/poucas')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('product.availability.status', 'low_stock'));
    $this->get('/produtos/muitas')->assertInertia(fn (AssertableInertia $page) => $page
        ->where('product.availability.status', 'in_stock'));
});

it('remembers the product for the login redirect when a visitor views it', function () {
    detailProduct(attributes: ['slug' => 'voltar-aqui']);

    $this->get('/produtos/voltar-aqui')->assertSessionHas('url.intended', '/produtos/voltar-aqui');
});

describe('reviews listing', function () {
    function deferredReviews($test, string $slug, array $query = []): array
    {
        $version = (string) app(HandleInertiaRequests::class)->version(request());

        return $test->withHeaders([
            'X-Inertia' => 'true',
            'X-Inertia-Version' => $version,
            'X-Inertia-Partial-Component' => 'store/product',
            'X-Inertia-Partial-Data' => 'reviews',
        ])->get('/produtos/'.$slug.'?'.http_build_query($query))->assertOk()->json('props.reviews');
    }

    it('summarizes average and distribution and filters by buyers', function () {
        $product = detailProduct(attributes: ['slug' => 'avaliado']);
        Review::factory()->for($product)->create(['rating' => 5, 'verified_purchase' => true]);
        Review::factory()->for($product)->create(['rating' => 4]);
        Review::factory()->for($product)->create(['rating' => 4]);

        $all = deferredReviews($this, 'avaliado');
        expect($all['summary']['average'])->toEqual(4.3)
            ->and($all['summary']['total'])->toBe(3)
            ->and($all['summary']['distribution'])->toBe(['1' => 0, '2' => 0, '3' => 0, '4' => 2, '5' => 1])
            ->and($all['list']['total'])->toBe(3);

        $buyers = deferredReviews($this, 'avaliado', ['reviews_only_buyers' => 1]);
        expect($buyers['list']['total'])->toBe(1)
            ->and($buyers['list']['data'][0]['badge'])->toBe('purchased')
            ->and($buyers['summary']['total'])->toBe(3);
    });

    it('sorts, paginates and abbreviates author names', function () {
        $product = detailProduct(attributes: ['slug' => 'paginado']);
        Review::factory()->count(6)->for($product)->create(['rating' => 3]);
        Review::factory()->for($product)->for(User::factory()->create(['name' => 'Maria Souza Lima']))->create(['rating' => 1]);

        $lowest = deferredReviews($this, 'paginado', ['reviews_sort' => 'lowest']);

        expect($lowest['list']['data'])->toHaveCount(5)
            ->and($lowest['list']['lastPage'])->toBe(2)
            ->and($lowest['list']['data'][0]['rating'])->toBe(1)
            ->and($lowest['list']['data'][0]['authorName'])->toBe('Maria L.');
    });

    it('describes what the visitor, pending and approved users may do', function () {
        $table = PriceTable::factory()->create();
        $product = detailProduct($table, attributes: ['slug' => 'permissoes']);
        $buyer = approvedBuyer($table);
        Review::factory()->for($product)->for($buyer)->create(['rating' => 2, 'title' => 'Ok', 'body' => 'Texto da avaliação']);

        expect(deferredReviews($this, 'permissoes')['permission'])->toBe(['canReview' => false, 'reason' => 'guest', 'own' => null]);

        $pending = User::factory()->ownerOf(Customer::factory()->pending()->create())->create();
        expect(deferredReviews($this->actingAs($pending), 'permissoes')['permission']['reason'])->toBe('pending_approval');

        $own = deferredReviews($this->actingAs($buyer), 'permissoes');
        expect($own['permission']['canReview'])->toBeTrue()
            ->and($own['permission']['own'])->toBe(['rating' => 2, 'title' => 'Ok', 'body' => 'Texto da avaliação'])
            ->and($own['list']['data'][0]['isOwn'])->toBeTrue();
    });
});
