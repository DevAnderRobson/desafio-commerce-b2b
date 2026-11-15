<?php

use App\Catalog\CatalogImporter;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductImage;
use App\Models\Promotion;
use App\Models\Stock;
use Database\Seeders\DemoCatalogSeeder;

use function Pest\Laravel\travelTo;

it('creates three category images and Portuguese specifications for active products only', function () {
    $category = Category::factory()->create([
        'name' => 'Bebidas',
        'slug' => 'bebidas',
    ]);
    $active = Product::factory()->for($category)->create([
        'name' => 'Refrigerante Guaraná São João 350ml',
        'brand' => 'São João',
        'ean' => '7899525652780',
    ]);
    $inactive = Product::factory()->inactive()->for($category)->create();

    app(DemoCatalogSeeder::class)->run();

    expect($active->images->pluck('path')->all())->toBe([
        'demo/products/bebidas-1.svg',
        'demo/products/bebidas-2.svg',
        'demo/products/bebidas-3.svg',
    ]);
    expect($active->images->pluck('alt')->all())->toBe([
        'Refrigerante Guaraná São João 350ml, vista 1',
        'Refrigerante Guaraná São João 350ml, vista 2',
        'Refrigerante Guaraná São João 350ml, vista 3',
    ]);
    expect($active->specifications->pluck('value', 'name')->all())->toBe([
        'Marca' => 'São João',
        'Categoria' => 'Bebidas',
        'EAN' => '7899525652780',
        'Conteúdo' => '350ml',
        'Validade' => '12 meses',
    ]);
    expect($inactive->images)->toBeEmpty()
        ->and($inactive->specifications)->toBeEmpty();
});

it('is idempotent when executed multiple times', function () {
    travelTo('2026-11-15 10:00:00');
    $category = Category::factory()->create(['name' => 'Mercearia', 'slug' => 'mercearia']);
    $products = Product::factory()->count(3)->for($category)->create();

    foreach ($products as $product) {
        Stock::factory()->for($product)->create(['quantity' => 30]);
    }

    $seeder = app(DemoCatalogSeeder::class);
    $seeder->run();
    $seeder->run();

    expect(ProductImage::count())->toBe(9)
        ->and(ProductAttribute::count())->toBe(15)
        ->and(Promotion::count())->toBe(3);
});

it('creates active demo promotions with varied discounts only for eligible products without touching non-demo promotions', function () {
    travelTo('2026-11-15 10:00:00');
    $category = Category::factory()->create(['name' => 'Limpeza', 'slug' => 'limpeza']);

    $eligible = Product::factory()->count(10)->for($category)->create();
    foreach ($eligible as $product) {
        Stock::factory()->for($product)->create(['quantity' => 40]);
    }

    $outOfStock = Product::factory()->for($category)->create();
    Stock::factory()->empty()->for($outOfStock)->create();

    $inactive = Product::factory()->inactive()->for($category)->create();
    Stock::factory()->for($inactive)->create(['quantity' => 40]);

    $withOriginalPromo = Product::factory()->for($category)->create();
    Stock::factory()->for($withOriginalPromo)->create(['quantity' => 40]);
    $originalPromo = Promotion::factory()->for($withOriginalPromo)->create([
        'discount_percent' => 12,
        'starts_on' => '2026-09-01',
        'ends_on' => '2026-10-01',
        'is_demo' => false,
    ]);

    app(DemoCatalogSeeder::class)->run();

    $demoPromotions = Promotion::query()->where('is_demo', true)->orderBy('product_id')->get();

    expect($demoPromotions)->toHaveCount(8)
        ->and(Promotion::query()->where('is_demo', true)->activeOn(now())->count())->toBe(8)
        ->and($demoPromotions->pluck('discount_percent')->all())->toBe([
            '5.00', '10.00', '15.00', '20.00', '5.00', '10.00', '15.00', '20.00',
        ])
        ->and($demoPromotions->first()->starts_on->toDateString())->toBe('2026-11-08')
        ->and($demoPromotions->first()->ends_on->toDateString())->toBe('2027-01-14');

    expect($outOfStock->promotions()->count())->toBe(0)
        ->and($inactive->promotions()->count())->toBe(0)
        ->and($withOriginalPromo->promotions()->count())->toBe(1);

    $originalPromo->refresh();
    expect($originalPromo->discount_percent)->toBe('12.00')
        ->and($originalPromo->is_demo)->toBeFalse()
        ->and($originalPromo->starts_on->toDateString())->toBe('2026-09-01')
        ->and($originalPromo->ends_on->toDateString())->toBe('2026-10-01');
});

it('does not create a second promotion for a product that already has an active demo promotion', function () {
    travelTo('2026-11-15 10:00:00');
    $product = Product::factory()->create();
    Stock::factory()->for($product)->create(['quantity' => 25]);
    $existingDemoPromo = Promotion::factory()->for($product)->create([
        'discount_percent' => 15,
        'starts_on' => '2026-11-10',
        'ends_on' => '2026-12-10',
        'is_demo' => true,
    ]);

    app(DemoCatalogSeeder::class)->run();

    expect($product->promotions()->count())->toBe(1)
        ->and($product->promotions()->first()->id)->toBe($existingDemoPromo->id);
});

it('preserves zero, low, and high stock ranges without altering stock quantities', function () {
    app(CatalogImporter::class)->import(base_path('tests/Fixtures/Catalog'));

    $lowStockActive = Product::factory()->create();
    Stock::factory()->for($lowStockActive)->create(['quantity' => 7]);

    app(DemoCatalogSeeder::class)->run();

    expect(Stock::query()->where('quantity', 0)->exists())->toBeTrue()
        ->and(Stock::query()->whereBetween('quantity', [1, 10])->exists())->toBeTrue()
        ->and(Stock::query()->where('quantity', '>', 10)->exists())->toBeTrue()
        ->and(Stock::query()->where('product_id', 1)->value('quantity'))->toBe(100)
        ->and(Stock::query()->where('product_id', 2)->value('quantity'))->toBe(0)
        ->and(Stock::query()->where('product_id', $lowStockActive->id)->value('quantity'))->toBe(7);
});
