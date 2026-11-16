<?php

use App\Cart\CartService;
use App\Cart\CartTotals;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\Promotion;
use App\Models\Stock;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => $this->travelTo('2026-11-15'));

function cartProduct(PriceTable $table, int $priceCents = 1000, int $stock = 50, ?array $wholesale = null): Product
{
    $product = Product::factory()->create();
    Stock::factory()->for($product)->create(['quantity' => $stock]);
    $item = PriceTableItem::factory()->for($table)->for($product);
    $item = $wholesale === null ? $item : $item->withWholesale($wholesale[0], $wholesale[1]);
    $item->create(['price_cents' => $priceCents]);

    return $product;
}

function cartBuyer(PriceTable $table, array $company = []): User
{
    return User::factory()->ownerOf(Customer::factory()->create(['price_table_id' => $table->id, ...$company]))->create();
}

describe('adding', function () {
    it('adds products and sums quantities for repeated adds', function () {
        $table = PriceTable::factory()->create();
        $user = cartBuyer($table);
        $product = cartProduct($table);

        $this->actingAs($user)->post(route('cart.items.store'), ['product_id' => $product->id, 'quantity' => 2])->assertRedirect();
        $this->actingAs($user)->post(route('cart.items.store'), ['product_id' => $product->id, 'quantity' => 3]);

        expect(CartItem::query()->count())->toBe(1)
            ->and(CartItem::query()->first()->quantity)->toBe(5)
            ->and(app(CartService::class)->unitCount($user))->toBe(5);
    });

    it('refuses more units than the stock holds, counting what is already in the cart', function () {
        $table = PriceTable::factory()->create();
        $user = cartBuyer($table);
        $product = cartProduct($table, stock: 5);

        $this->actingAs($user)->post(route('cart.items.store'), ['product_id' => $product->id, 'quantity' => 4]);
        $this->actingAs($user)->post(route('cart.items.store'), ['product_id' => $product->id, 'quantity' => 2])
            ->assertSessionHasErrors('quantity');

        expect(CartItem::query()->first()->quantity)->toBe(4);
    });

    it('refuses inactive products, products outside the price table and products without stock', function () {
        $table = PriceTable::factory()->create();
        $user = cartBuyer($table);
        $inactive = cartProduct($table);
        $inactive->update(['is_active' => false]);
        $outside = Product::factory()->create();
        Stock::factory()->for($outside)->create(['quantity' => 10]);
        $empty = cartProduct($table, stock: 0);

        foreach ([$inactive, $outside, $empty] as $product) {
            $this->actingAs($user)->post(route('cart.items.store'), ['product_id' => $product->id, 'quantity' => 1])
                ->assertSessionHasErrors('quantity');
        }

        expect(CartItem::query()->count())->toBe(0);
    });

    it('refuses visitors and companies that are not approved', function () {
        $table = PriceTable::factory()->create();
        $product = cartProduct($table);
        $pending = User::factory()->ownerOf(Customer::factory()->pending()->create(['price_table_id' => $table->id]))->create();

        $this->post(route('cart.items.store'), ['product_id' => $product->id, 'quantity' => 1])->assertRedirect(route('login'));
        $this->actingAs($pending)->post(route('cart.items.store'), ['product_id' => $product->id, 'quantity' => 1])
            ->assertSessionHasErrors('quantity');
    });

    it('validates the payload', function (array $payload) {
        $table = PriceTable::factory()->create();
        $product = cartProduct($table);

        $this->actingAs(cartBuyer($table))->post(route('cart.items.store'), ['product_id' => $product->id, ...$payload])
            ->assertSessionHasErrors('quantity');
    })->with([[['quantity' => 0]], [['quantity' => -3]], [['quantity' => 'abc']], [['quantity' => null]]]);
});

describe('changing', function () {
    it('updates the quantity within stock, removes items and clears the cart', function () {
        $table = PriceTable::factory()->create();
        $user = cartBuyer($table);
        $first = cartProduct($table, stock: 10);
        $second = cartProduct($table);
        $service = app(CartService::class);
        $item = $service->add($user, $first, 1);
        $service->add($user, $second, 1);

        $this->actingAs($user)->patch(route('cart.items.update', $item), ['quantity' => 7])->assertRedirect();
        expect($item->fresh()->quantity)->toBe(7);

        $this->actingAs($user)->patch(route('cart.items.update', $item), ['quantity' => 11])->assertSessionHasErrors('quantity');
        expect($item->fresh()->quantity)->toBe(7);

        $this->actingAs($user)->delete(route('cart.items.destroy', $item))->assertRedirect();
        expect(CartItem::query()->count())->toBe(1);

        $this->actingAs($user)->delete(route('cart.clear'))->assertRedirect();
        expect(CartItem::query()->count())->toBe(0);
    });

    it('keeps carts separate between users of the same company', function () {
        $table = PriceTable::factory()->create();
        $company = Customer::factory()->create(['price_table_id' => $table->id]);
        $owner = User::factory()->ownerOf($company)->create();
        $member = User::factory()->memberOf($company)->create();
        $product = cartProduct($table);
        $item = app(CartService::class)->add($owner, $product, 2);

        expect(app(CartService::class)->unitCount($member))->toBe(0);

        $this->actingAs($member)->patch(route('cart.items.update', $item), ['quantity' => 9])->assertNotFound();
        $this->actingAs($member)->delete(route('cart.items.destroy', $item))->assertNotFound();

        expect($item->fresh()->quantity)->toBe(2);
    });
});

describe('totals', function () {
    it('applies wholesale and promotion per item, never on the cart total', function () {
        $table = PriceTable::factory()->create();
        $user = cartBuyer($table);
        $wholesale = cartProduct($table, 1000, wholesale: [800, 10]);
        $promoted = cartProduct($table, 500);
        $plain = cartProduct($table, 300);
        Promotion::factory()->for($promoted)->create(['discount_percent' => 10, 'starts_on' => '2026-11-01', 'ends_on' => '2026-11-30']);
        $service = app(CartService::class);
        $service->add($user, $wholesale, 10);
        $service->add($user, $promoted, 2);
        $service->add($user, $plain, 1);

        $summary = app(CartTotals::class)->summarize($user);

        expect($summary->subtotalCents)->toBe(10 * 800 + 2 * 450 + 300)
            ->and($summary->savingsCents)->toBe(10 * 200 + 2 * 50)
            ->and($summary->totalCents)->toBe($summary->subtotalCents)
            ->and($summary->unitCount())->toBe(13);
    });

    it('excludes lines with issues from the amounts but keeps them listed', function () {
        $table = PriceTable::factory()->create();
        $user = cartBuyer($table);
        $good = cartProduct($table, 1000);
        $gone = cartProduct($table, 2000);
        app(CartService::class)->add($user, $good, 1);
        app(CartService::class)->add($user, $gone, 1);
        $gone->update(['is_active' => false]);

        $summary = app(CartTotals::class)->summarize($user);

        expect($summary->lines)->toHaveCount(2)
            ->and($summary->hasIssues())->toBeTrue()
            ->and($summary->subtotalCents)->toBe(1000);
    });
});

describe('page', function () {
    it('shows items, wholesale hint, issues and blocks proceeding while there are issues', function () {
        $table = PriceTable::factory()->create();
        $user = cartBuyer($table);
        $wholesale = cartProduct($table, 1000, wholesale: [800, 10]);
        $gone = cartProduct($table);
        app(CartService::class)->add($user, $wholesale, 4);
        app(CartService::class)->add($user, $gone, 1);
        $gone->update(['is_active' => false]);

        $this->actingAs($user)->get(route('cart.show'))->assertInertia(fn (AssertableInertia $page) => $page
            ->component('store/cart')
            ->where('cart.count', 5)
            ->where('cart.items.0.wholesaleHint', ['missingUnits' => 6, 'unitPriceCents' => 800])
            ->where('cart.items.1.issue', 'inactive')
            ->where('cart.canProceed', false)
            ->where('cart.blockers.0.type', 'item_issue')
            ->where('cart.totals.subtotalCents', 4000));
    });

    it('allows proceeding when valid, and warns when the company is blocked', function () {
        $table = PriceTable::factory()->create();
        $user = cartBuyer($table);
        app(CartService::class)->add($user, cartProduct($table), 1);

        $this->actingAs($user)->get(route('cart.show'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('cart.canProceed', true)->where('cart.blockers', []));

        $user->customer->update(['is_blocked' => true]);

        $this->actingAs($user->fresh())->get(route('cart.show'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('cart.canProceed', false)->where('cart.blockers.0.type', 'customer_blocked'));
    });

    it('warns about price changes since the last visit', function () {
        $table = PriceTable::factory()->create();
        $user = cartBuyer($table);
        $product = cartProduct($table, 1000);
        app(CartService::class)->add($user, $product, 1);

        $this->actingAs($user)->get(route('cart.show'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('cart.items.0.changeNotice', null));

        PriceTableItem::query()->where('product_id', $product->id)->update(['price_cents' => 1200]);

        $this->actingAs($user)->get(route('cart.show'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('cart.items.0.changeNotice', 'O preço deste item mudou desde a sua última visita.')
            ->where('cart.items.0.unitPriceCents', 1200));
    });

    it('shares the unit count with every page and requires login', function () {
        $table = PriceTable::factory()->create();
        $user = cartBuyer($table);
        app(CartService::class)->add($user, cartProduct($table), 3);

        $this->get(route('cart.show'))->assertRedirect(route('login'));
        $this->get(route('home'))->assertInertia(fn (AssertableInertia $page) => $page->where('cart.count', 0));
        $this->actingAs($user)->get(route('home'))->assertInertia(fn (AssertableInertia $page) => $page->where('cart.count', 3));
    });

    it('starts without a cart row for new users', function () {
        $user = cartBuyer(PriceTable::factory()->create());

        $this->actingAs($user)->get(route('cart.show'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('cart.items', [])->where('cart.canProceed', false));

        expect(Cart::query()->count())->toBe(0);
    });
});
