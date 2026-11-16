<?php

use App\Cart\CartService;
use App\Models\Address;
use App\Models\Customer;
use App\Models\PaymentTerm;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;

/**
 * Buyer with an approved company, a PIX / 28-day / 28-56-day setup, one address and one product
 * in the cart (price in cents per unit). Freight for PR with the default simulation: 1800 + 1%.
 *
 * @return array{user: User, product: Product, address: Address, stock: Stock}
 */
function orderSetup(int $unitPriceCents = 100_000, int $quantity = 1, int $stockUnits = 100, array $company = []): array
{
    PaymentTerm::query()->firstOrCreate(['code' => 'PIX'], ['description' => 'PIX à vista', 'minimum_amount_cents' => 0, 'surcharge_percent' => 0, 'is_deferred' => false]);
    PaymentTerm::query()->firstOrCreate(['code' => 'BOL28'], ['description' => 'Boleto 28 dias', 'minimum_amount_cents' => 30_000, 'surcharge_percent' => 0, 'is_deferred' => true]);
    PaymentTerm::query()->firstOrCreate(['code' => 'BOL2856'], ['description' => 'Boleto 28/56 dias', 'minimum_amount_cents' => 100_000, 'surcharge_percent' => 2.5, 'is_deferred' => true]);

    $table = PriceTable::factory()->create();
    $customer = Customer::factory()->create(['price_table_id' => $table->id, 'credit_limit_cents' => 1_000_000, 'credit_used_cents' => 0, ...$company]);
    $user = User::factory()->ownerOf($customer)->create();
    $product = Product::factory()->create();
    $stock = Stock::factory()->for($product)->create(['quantity' => $stockUnits, 'reserved' => 0]);
    PriceTableItem::factory()->for($table)->for($product)->create(['price_cents' => $unitPriceCents]);
    app(CartService::class)->add($user, $product, $quantity);
    $address = Address::factory()->for($customer)->inState('PR')->create();

    return compact('user', 'product', 'address', 'stock');
}

function chooseDelivery(User $user, Address $address, string $freight = 'economic'): void
{
    test()->actingAs($user)->get(route('checkout.delivery', ['address' => $address->id, 'freight' => $freight]))->assertOk();
}

function placeOrder(User $user, string $term = 'PIX', string $key = 'key-1')
{
    return test()->actingAs($user)->post(route('checkout.place'), ['payment_term_code' => $term, 'idempotency_key' => $key]);
}
