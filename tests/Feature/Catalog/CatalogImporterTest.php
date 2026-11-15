<?php

use App\Catalog\CatalogImporter;
use App\Catalog\InvalidCatalogData;
use App\Enums\ApprovalStatus;
use App\Models\Customer;
use App\Models\PaymentTerm;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Stock;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;

function catalogFixtureCopy(): string
{
    $directory = sys_get_temp_dir().'/catalog-'.Str::uuid();
    File::copyDirectory(base_path('tests/Fixtures/Catalog'), $directory);

    return $directory;
}

afterEach(function () {
    foreach (glob(sys_get_temp_dir().'/catalog-*') ?: [] as $directory) {
        File::deleteDirectory($directory);
    }
});

it('imports the catalog with prices converted to cents', function () {
    $report = app(CatalogImporter::class)->import(base_path('tests/Fixtures/Catalog'));

    expect(Product::count())->toBe(3)
        ->and(Product::active()->count())->toBe(2)
        ->and(Product::find(1)->slug)->toBe('agua-mineral-500ml-1')
        ->and(Stock::where('product_id', 2)->value('quantity'))->toBe(0)
        ->and(PriceTable::count())->toBe(2)
        ->and(PaymentTerm::first()->minimum_amount_cents)->toBe(100_000)
        ->and(PaymentTerm::first()->is_deferred)->toBeTrue()
        ->and(Promotion::first()->discount_percent)->toBe('20.00')
        ->and($report->counts['products'])->toBe(3);

    $item = PriceTableItem::where('product_id', 1)->whereRelation('priceTable', 'code', 'PADRAO')->first();
    expect($item->price_cents)->toBe(307)
        ->and($item->wholesale_price_cents)->toBe(276)
        ->and($item->wholesale_min_quantity)->toBe(50);

    $blocked = Customer::find(2);
    expect($blocked->is_blocked)->toBeTrue()
        ->and($blocked->credit_limit_cents)->toBe(500_000)
        ->and($blocked->approval_status)->toBe(ApprovalStatus::Approved)
        ->and($blocked->priceTable->code)->toBe('ATACADISTA');
});

it('does not duplicate rows when imported again', function () {
    $importer = app(CatalogImporter::class);

    $importer->import(base_path('tests/Fixtures/Catalog'));
    $importer->import(base_path('tests/Fixtures/Catalog'));

    expect(Product::count())->toBe(3)
        ->and(Stock::count())->toBe(3)
        ->and(PriceTableItem::count())->toBe(4)
        ->and(Customer::count())->toBe(2)
        ->and(Promotion::count())->toBe(1)
        ->and(PaymentTerm::count())->toBe(1);
});

it('keeps approval and used credit recorded after the first import', function () {
    $importer = app(CatalogImporter::class);
    $importer->import(base_path('tests/Fixtures/Catalog'));

    Customer::find(1)->update(['approval_status' => ApprovalStatus::Rejected, 'credit_used_cents' => 999]);
    $importer->import(base_path('tests/Fixtures/Catalog'));

    expect(Customer::find(1)->approval_status)->toBe(ApprovalStatus::Rejected)
        ->and(Customer::find(1)->credit_used_cents)->toBe(999);
});

it('lets new rows be created after importing explicit ids', function () {
    app(CatalogImporter::class)->import(base_path('tests/Fixtures/Catalog'));

    $product = Product::factory()->create();

    expect($product->id)->toBeGreaterThan(3);
});

it('reports inconsistencies without aborting the import', function () {
    $directory = catalogFixtureCopy();
    File::put("$directory/estoque.json", json_encode([['produto_id' => 1, 'quantidade' => 10], ['produto_id' => 999, 'quantidade' => 1]]));
    File::put("$directory/promocoes.json", json_encode([['id' => 7, 'produto_id' => 888, 'percentual_desconto' => 5, 'inicio' => '2026-01-01', 'fim' => '2026-02-01']]));

    $report = app(CatalogImporter::class)->import($directory);

    expect($report->warnings)->toContain('Stock ignored: product 999 does not exist')
        ->toContain('Product 2 has no stock record; stock set to 0')
        ->toContain('Promotion 7 ignored: product 888 does not exist')
        ->and(Product::count())->toBe(3)
        ->and(Promotion::count())->toBe(0);
});

it('reports products without a price in a table', function () {
    $report = app(CatalogImporter::class)->import(base_path('tests/Fixtures/Catalog'));

    expect($report->warnings)->toContain('Price table ATACADISTA: 2 products have no price (unavailable for this table)');
});

it('rejects malformed json and missing files', function (string $file, string $content) {
    $directory = catalogFixtureCopy();
    $content === '' ? File::delete("$directory/$file") : File::put("$directory/$file", $content);

    app(CatalogImporter::class)->import($directory);
})->with([
    'invalid json' => ['produtos.json', '{not json'],
    'not a list' => ['clientes.json', '{"a": 1}'],
    'missing file' => ['estoque.json', ''],
])->throws(InvalidCatalogData::class);

it('does not persist anything when the import fails midway', function () {
    $directory = catalogFixtureCopy();
    File::put("$directory/condicoes_pagamento.json", '{broken');

    try {
        app(CatalogImporter::class)->import($directory);
    } catch (InvalidCatalogData) {
    }

    expect(Product::count())->toBe(0);
});

it('imports through the artisan command and fails with a clear message on bad input', function () {
    $this->artisan('catalog:import', ['--path' => base_path('tests/Fixtures/Catalog')])
        ->expectsOutputToContain('products')
        ->assertSuccessful();

    $this->artisan('catalog:import', ['--path' => '/caminho/inexistente'])
        ->expectsOutputToContain('Catalog file not found')
        ->assertFailed();
});
