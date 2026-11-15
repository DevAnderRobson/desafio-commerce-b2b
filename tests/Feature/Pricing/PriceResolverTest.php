<?php

use App\Models\Customer;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\Promotion;
use App\Pricing\PriceAvailability;
use App\Pricing\PriceResolver;

function pricedProduct(Customer $customer, int $priceCents = 1000, ?int $wholesaleCents = null, ?int $minQuantity = null): Product
{
    $product = Product::factory()->create();

    PriceTableItem::factory()
        ->for($customer->priceTable)
        ->for($product)
        ->state(['price_cents' => $priceCents, 'wholesale_price_cents' => $wholesaleCents, 'wholesale_min_quantity' => $minQuantity])
        ->create();

    return $product;
}

beforeEach(function () {
    $this->travelTo('2026-11-15');
    $this->resolver = app(PriceResolver::class);
});

it('hides prices from visitors and customers that are not approved', function (?string $state) {
    $customer = $state === null ? null : Customer::factory()->{$state}()->create();
    $product = Product::factory()->create();

    $quote = $this->resolver->resolve($customer, $product);

    expect($quote->availability)->toBe(PriceAvailability::Hidden)
        ->and($quote->isAvailable())->toBeFalse()
        ->and($quote->unitPriceCents)->toBe(0);
})->with([
    'visitor' => [null],
    'pending' => ['pending'],
    'rejected' => ['rejected'],
]);

it('marks products outside the customer price table as unavailable for the buying model', function () {
    $customer = Customer::factory()->create();
    $otherTable = PriceTable::factory()->create();
    $product = Product::factory()->create();
    PriceTableItem::factory()->for($otherTable)->for($product)->create();

    expect($this->resolver->resolve($customer, $product)->availability)->toBe(PriceAvailability::UnavailableForTable);
});

it('marks everything as unavailable when the customer has no price table', function () {
    $customer = Customer::factory()->create(['price_table_id' => null]);

    expect($this->resolver->resolve($customer, Product::factory()->create())->availability)
        ->toBe(PriceAvailability::UnavailableForTable);
});

it('uses the table price for the quantity', function () {
    $customer = Customer::factory()->create();
    $product = pricedProduct($customer, 307);

    $quote = $this->resolver->resolve($customer, $product, 4);

    expect($quote->unitPriceCents)->toBe(307)
        ->and($quote->totalCents())->toBe(1228)
        ->and($quote->savingsCents())->toBe(0)
        ->and($quote->wholesaleApplied)->toBeFalse();
});

it('applies the wholesale price only from the minimum quantity', function (int $quantity, int $expectedUnit, bool $wholesale) {
    $customer = Customer::factory()->create();
    $product = pricedProduct($customer, 307, 276, 50);

    $quote = $this->resolver->resolve($customer, $product, $quantity);

    expect($quote->unitPriceCents)->toBe($expectedUnit)
        ->and($quote->wholesaleApplied)->toBe($wholesale);
})->with([
    'one below the minimum' => [49, 307, false],
    'exactly the minimum' => [50, 276, true],
    'above the minimum' => [80, 276, true],
]);

it('applies a promotion only to its own product unit price', function () {
    $customer = Customer::factory()->create();
    $promoted = pricedProduct($customer, 1000);
    $regular = pricedProduct($customer, 1000);
    Promotion::factory()->for($promoted)->percent(20)->create();

    $promotedQuote = $this->resolver->resolve($customer, $promoted, 3);
    $regularQuote = $this->resolver->resolve($customer, $regular, 3);

    expect($promotedQuote->unitPriceCents)->toBe(800)
        ->and($promotedQuote->promotionPercent)->toBe('20.00')
        ->and($promotedQuote->savingsCents())->toBe(600)
        ->and($regularQuote->unitPriceCents)->toBe(1000)
        ->and($regularQuote->promotionPercent)->toBeNull();
});

it('gives each promoted item its own percentage', function () {
    $customer = Customer::factory()->create();
    $first = pricedProduct($customer, 1000);
    $second = pricedProduct($customer, 2000);
    Promotion::factory()->for($first)->percent(10)->create();
    Promotion::factory()->for($second)->percent(50)->create();

    $total = $this->resolver->resolve($customer, $first, 2)->totalCents()
        + $this->resolver->resolve($customer, $second, 1)->totalCents();

    expect($total)->toBe(1800 + 1000);
});

it('stacks the promotion on top of the wholesale price of the same item', function () {
    $customer = Customer::factory()->create();
    $product = pricedProduct($customer, 1000, 900, 10);
    Promotion::factory()->for($product)->percent(20)->create();

    $quote = $this->resolver->resolve($customer, $product, 10);

    expect($quote->unitPriceCents)->toBe(720)
        ->and($quote->listUnitPriceCents)->toBe(1000)
        ->and($quote->savingsCents())->toBe(2800);
});

it('only applies promotions within their dates, boundaries included', function (string $startsOn, string $endsOn, int $expectedUnit) {
    $customer = Customer::factory()->create();
    $product = pricedProduct($customer, 1000);
    Promotion::factory()->for($product)->percent(10)->between($startsOn, $endsOn)->create();

    expect($this->resolver->resolve($customer, $product)->unitPriceCents)->toBe($expectedUnit);
})->with([
    'expired yesterday' => ['2026-10-01', '2026-11-14', 1000],
    'starts tomorrow' => ['2026-11-16', '2026-12-31', 1000],
    'ends today' => ['2026-10-01', '2026-11-15', 900],
    'starts today' => ['2026-11-15', '2026-12-31', 900],
]);

it('rounds the discounted unit price half up to the cent', function (int $priceCents, float $percent, int $expectedUnit) {
    $customer = Customer::factory()->create();
    $product = pricedProduct($customer, $priceCents);
    Promotion::factory()->for($product)->percent($percent)->create();

    expect($this->resolver->resolve($customer, $product)->unitPriceCents)->toBe($expectedUnit);
})->with([
    'exact half rounds up' => [305, 10, 275],
    'below half rounds down' => [301, 10, 271],
    'fractional percent' => [999, 2.5, 974],
]);

it('picks the biggest discount when promotions overlap', function () {
    $customer = Customer::factory()->create();
    $product = pricedProduct($customer, 1000);
    Promotion::factory()->for($product)->percent(5)->create();
    Promotion::factory()->for($product)->percent(30)->create();

    expect($this->resolver->resolve($customer, $product)->unitPriceCents)->toBe(700);
});

it('treats a blocked but approved customer as able to see prices', function () {
    $customer = Customer::factory()->blocked()->create();
    $product = pricedProduct($customer, 500);

    expect($this->resolver->resolve($customer, $product)->unitPriceCents)->toBe(500);
});
