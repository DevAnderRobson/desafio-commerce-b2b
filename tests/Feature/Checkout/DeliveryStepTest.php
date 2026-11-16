<?php

use App\Cart\CartService;
use App\Checkout\FreightCalculator;
use App\Checkout\FreightUnavailable;
use App\Models\Address;
use App\Models\Customer;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia;

function checkoutBuyer(int $subtotalCents = 1000, array $company = []): User
{
    $table = PriceTable::factory()->create();
    $user = User::factory()->ownerOf(Customer::factory()->create(['price_table_id' => $table->id, ...$company]))->create();
    $product = Product::factory()->create();
    Stock::factory()->for($product)->create(['quantity' => 500]);
    PriceTableItem::factory()->for($table)->for($product)->create(['price_cents' => $subtotalCents]);
    app(CartService::class)->add($user, $product, 1);

    return $user;
}

describe('access', function () {
    it('requires login and sends empty carts, blocked or pending companies back to the cart', function () {
        $this->get(route('checkout.delivery'))->assertRedirect(route('login'));

        $empty = User::factory()->ownerOf(Customer::factory()->create())->create();
        $this->actingAs($empty)->get(route('checkout.delivery'))->assertRedirect(route('cart.show'));

        $blocked = checkoutBuyer(company: ['is_blocked' => true]);
        $this->actingAs($blocked)->get(route('checkout.delivery'))->assertRedirect(route('cart.show'));
    });

    it('sends carts with unavailable items back to the cart', function () {
        $user = checkoutBuyer();
        Product::query()->update(['is_active' => false]);

        $this->actingAs($user)->get(route('checkout.delivery'))->assertRedirect(route('cart.show'));
    });
});

describe('address', function () {
    it('starts without addresses so the form is shown inline', function () {
        $this->actingAs(checkoutBuyer())->get(route('checkout.delivery'))->assertInertia(fn (AssertableInertia $page) => $page
            ->component('checkout/delivery')
            ->where('addresses', [])
            ->where('selectedAddressId', null)
            ->where('freight', null)
            ->where('canContinue', false));
    });

    it('preselects the last used address of the company', function () {
        $user = checkoutBuyer();
        Address::factory()->for($user->customer)->create(['last_used_at' => '2026-01-01']);
        $last = Address::factory()->for($user->customer)->create(['last_used_at' => '2026-03-01']);
        Address::factory()->for($user->customer)->create();

        $this->actingAs($user)->get(route('checkout.delivery'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('selectedAddressId', $last->id)
            ->where('addresses.0.id', $last->id)
            ->where('canContinue', true));
    });

    it('shares addresses between users of the same company but never across companies', function () {
        $owner = checkoutBuyer();
        $member = User::factory()->memberOf($owner->customer)->create();
        $address = Address::factory()->for($owner->customer)->create();
        $foreign = Address::factory()->create();
        app(CartService::class)->add($member, Product::query()->firstOrFail(), 1);

        $this->actingAs($member)->get(route('checkout.delivery', ['address' => $address->id]))->assertOk();
        $this->actingAs($owner)->get(route('checkout.delivery', ['address' => $foreign->id]))->assertForbidden();
        $this->actingAs($owner)->put(route('checkout.delivery.confirm'), ['address_id' => $foreign->id, 'freight_code' => 'economic'])->assertForbidden();
        $this->actingAs($owner)->put(route('addresses.update', $foreign), addressPayload())->assertForbidden();
        $this->actingAs($owner)->delete(route('addresses.destroy', $foreign))->assertForbidden();

        expect($foreign->fresh())->not->toBeNull();
    });

    it('creates, edits and removes addresses, normalizing the CEP', function () {
        $user = checkoutBuyer();

        $this->actingAs($user)->post(route('addresses.store'), addressPayload(['cep' => '87020-000']))
            ->assertRedirectContains('/checkout/entrega?address=');

        $address = Address::query()->firstOrFail();
        expect($address->cep)->toBe('87020000')->and($address->customer_id)->toBe($user->customer_id);

        $this->actingAs($user)->put(route('addresses.update', $address), addressPayload(['city' => 'Maringá']))->assertRedirect();
        expect($address->fresh()->city)->toBe('Maringá');

        $this->actingAs($user)->delete(route('addresses.destroy', $address))->assertRedirect(route('checkout.delivery'));
        expect(Address::query()->count())->toBe(0);
    });

    it('validates the address fields', function (array $payload, string $field) {
        $this->actingAs(checkoutBuyer())->post(route('addresses.store'), addressPayload($payload))->assertSessionHasErrors($field);
    })->with([
        'short cep' => [['cep' => '123'], 'cep'],
        'no street' => [['street' => ''], 'street'],
        'no number' => [['number' => ''], 'number'],
        'bad state' => [['state' => 'XX'], 'state'],
        'no city' => [['city' => ''], 'city'],
    ]);
});

describe('freight', function () {
    it('quotes by region, always with an economic and an express option', function (string $state, int $economic) {
        $user = checkoutBuyer(1000);
        Address::factory()->for($user->customer)->inState($state)->create();

        $this->actingAs($user)->get(route('checkout.delivery'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('freight.error', null)
            ->where('freight.options.0.code', 'economic')
            ->where('freight.options.0.priceCents', $economic)
            ->where('freight.options.1.code', 'express')
            ->where('selectedFreightCode', 'economic')
            ->where('summary.totals.shippingCents', $economic)
            ->where('summary.totals.totalCents', 1000 + $economic));
    })->with([['PR', 1810], ['SP', 2410], ['BA', 4210]]);

    it('makes the economic option free above the configured subtotal', function () {
        config(['shop.freight.free_shipping_threshold_cents' => 5000]);
        $user = checkoutBuyer(6000);
        Address::factory()->for($user->customer)->create();

        $this->actingAs($user)->get(route('checkout.delivery'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('freight.options.0.isFree', true)
            ->where('freight.options.0.priceCents', 0)
            ->where('summary.freeShippingMissingCents', null));
    });

    it('tells how much is missing for free shipping', function () {
        config(['shop.freight.free_shipping_threshold_cents' => 5000]);
        $user = checkoutBuyer(1000);
        Address::factory()->for($user->customer)->create();

        $this->actingAs($user)->get(route('checkout.delivery'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('summary.freeShippingMissingCents', 4000));
    });

    it('recalculates when the address or the option changes and remembers the choice', function () {
        $user = checkoutBuyer(1000);
        $south = Address::factory()->for($user->customer)->inState('PR')->create();
        $north = Address::factory()->for($user->customer)->inState('BA')->create();

        $this->actingAs($user)->get(route('checkout.delivery', ['address' => $north->id, 'freight' => 'express']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('selectedAddressId', $north->id)
                ->where('selectedFreightCode', 'express')
                ->where('summary.totals.shippingCents', 7210));

        $this->actingAs($user)->get(route('checkout.delivery'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('selectedAddressId', $north->id)
            ->where('selectedFreightCode', 'express'));

        expect($south->id)->not->toBe($north->id);
    });

    it('reports an error instead of failing when the freight service is unavailable', function () {
        $user = checkoutBuyer();
        Address::factory()->for($user->customer)->create();
        $this->app->bind(FreightCalculator::class, fn () => new class implements FreightCalculator
        {
            public function options(Address $address, int $subtotalCents, int $unitCount): array
            {
                throw new FreightUnavailable('down');
            }

            public function freeShippingMissingCents(int $subtotalCents): ?int
            {
                return null;
            }
        });

        $this->actingAs($user)->get(route('checkout.delivery'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('freight.options', [])
            ->where('freight.error', 'Não foi possível calcular o frete para este endereço.')
            ->where('canContinue', false));
    });

    it('has no coverage for an invalid state', function () {
        $user = checkoutBuyer();
        Address::factory()->for($user->customer)->create(['state' => 'ZZ']);

        $this->actingAs($user)->get(route('checkout.delivery'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('freight.error', 'Não foi possível calcular o frete para este endereço.'));
    });
});

describe('confirmation', function () {
    it('stores the choice and marks the address as last used', function () {
        $user = checkoutBuyer();
        $address = Address::factory()->for($user->customer)->create();

        $this->actingAs($user)->put(route('checkout.delivery.confirm'), ['address_id' => $address->id, 'freight_code' => 'express'])
            ->assertRedirect(route('checkout.payment'));

        expect($address->fresh()->last_used_at)->not->toBeNull();
        $this->actingAs($user)->get(route('checkout.delivery'))->assertInertia(fn (AssertableInertia $page) => $page->where('selectedFreightCode', 'express'));
    });

    it('rejects an unknown freight option', function () {
        $user = checkoutBuyer();
        $address = Address::factory()->for($user->customer)->create();

        $this->actingAs($user)->put(route('checkout.delivery.confirm'), ['address_id' => $address->id, 'freight_code' => 'teleport'])
            ->assertSessionHasErrors('freight_code');
    });
});

describe('cep lookup', function () {
    it('returns the address data for a valid CEP', function () {
        Http::fake(['viacep.com.br/*' => Http::response(['logradouro' => 'Av. Brasil', 'bairro' => 'Centro', 'localidade' => 'Maringá', 'uf' => 'pr'])]);

        $this->actingAs(checkoutBuyer())->getJson('/checkout/cep/87020000')->assertOk()->assertExactJson([
            'cep' => '87020-000', 'street' => 'Av. Brasil', 'neighborhood' => 'Centro', 'city' => 'Maringá', 'state' => 'PR',
        ]);
    });

    it('answers 404 for unknown CEPs, 422 for malformed ones and 503 when the service fails', function () {
        $user = checkoutBuyer();

        Http::fake(['viacep.com.br/*' => Http::sequence()->push(['erro' => true])->push('', 500)]);

        $this->actingAs($user)->getJson('/checkout/cep/00000000')->assertNotFound();
        $this->actingAs($user)->getJson('/checkout/cep/123')->assertStatus(422);
        $this->actingAs($user)->getJson('/checkout/cep/87020000')->assertStatus(503);
    });

    it('requires login', function () {
        $this->getJson('/checkout/cep/87020000')->assertUnauthorized();
    });
});

function addressPayload(array $overrides = []): array
{
    return [
        'label' => 'Matriz', 'cep' => '87020000', 'street' => 'Av. Brasil', 'number' => '100',
        'complement' => '', 'neighborhood' => 'Centro', 'city' => 'Maringá', 'state' => 'PR', ...$overrides,
    ];
}
