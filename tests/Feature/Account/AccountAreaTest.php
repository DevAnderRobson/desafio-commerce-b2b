<?php

use App\Cart\CartService;
use App\Enums\OrderStatus;
use App\Models\Address;
use App\Models\CartItem;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\Product;
use App\Models\Stock;
use App\Models\User;
use App\Models\WishlistItem;
use Inertia\Testing\AssertableInertia;

beforeEach(fn () => $this->travelTo('2026-11-16 10:00:00'));

function accountOrder(User $user, OrderStatus $status = OrderStatus::PendingPayment, ?Product $product = null, int $quantity = 2): Order
{
    $order = Order::factory()->for($user)->for($user->customer)->create(['status' => $status, 'total_cents' => 5_000, 'delivered_at' => $status === OrderStatus::Delivered ? now() : null]);
    OrderItem::factory()->for($order)->for($product ?? Product::factory()->create())->create(['quantity' => $quantity, 'unit_price_cents' => 1_000, 'line_total_cents' => $quantity * 1_000, 'product_name' => 'Produto do pedido']);

    return $order;
}

describe('dashboard', function () {
    it('shows company, purchase model, credit and recent orders of the company', function () {
        $table = PriceTable::factory()->create(['code' => 'ATACADISTA']);
        $company = Customer::factory()->create(['price_table_id' => $table->id, 'credit_limit_cents' => 100_000, 'credit_used_cents' => 30_000]);
        $owner = User::factory()->ownerOf($company)->create();
        $member = User::factory()->memberOf($company)->create(['name' => 'Joana Prado']);
        accountOrder($owner);
        accountOrder($member, OrderStatus::Delivered);
        accountOrder(User::factory()->ownerOf(Customer::factory()->create())->create());

        $this->actingAs($member)->get(route('account.dashboard'))->assertInertia(fn (AssertableInertia $page) => $page
            ->component('account/dashboard')
            ->where('accountCompany.purchaseModel', 'Atacadista')
            ->where('accountCompany.isOwner', false)
            ->where('credit', ['limitCents' => 100_000, 'usedCents' => 30_000, 'availableCents' => 70_000])
            ->has('recentOrders', 2)
            ->where('recentOrders.0.placedBy', 'Joana P.')
            ->where('counts.orders', 2)
            ->where('routes.users', null));
    });

    it('hides credit for companies that are not approved and works without a company', function () {
        $pending = User::factory()->ownerOf(Customer::factory()->pending()->create())->create();

        $this->actingAs($pending)->get(route('account.dashboard'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('credit', null)->where('accountCompany.approvalStatus', 'pending')->where('routes.users', fn ($users) => $users !== null));

        $this->actingAs(User::factory()->create())->get(route('account.dashboard'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('accountCompany', null)->where('credit', null)->where('recentOrders', []));
    });
});

describe('orders', function () {
    it('lists only the orders of the own company, filtered by status group', function () {
        $owner = User::factory()->ownerOf(Customer::factory()->create())->create();
        accountOrder($owner, OrderStatus::PendingPayment);
        accountOrder($owner, OrderStatus::Shipped);
        accountOrder($owner, OrderStatus::Delivered);
        accountOrder($owner, OrderStatus::PaymentRefused);
        accountOrder(User::factory()->ownerOf(Customer::factory()->create())->create(), OrderStatus::Delivered);

        $this->actingAs($owner)->get(route('account.orders.index'))->assertInertia(fn (AssertableInertia $page) => $page
            ->component('account/orders/index')
            ->where('orders.total', 4)
            ->where('filters.0', ['value' => 'all', 'label' => 'Todos', 'count' => 4])
            ->where('filters.2', ['value' => 'in_progress', 'label' => 'Em andamento', 'count' => 1]));

        $this->actingAs($owner)->get(route('account.orders.index', ['status' => 'not_completed']))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('filter', 'not_completed')->where('orders.total', 1)->where('orders.data.0.status', 'payment_refused'));

        $this->actingAs($owner)->get(route('account.orders.index', ['status' => 'bogus']))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('filter', 'all'));
    });

    it('paginates the list', function () {
        $owner = User::factory()->ownerOf(Customer::factory()->create())->create();
        foreach (range(1, 12) as $ignored) {
            accountOrder($owner);
        }

        $this->actingAs($owner)->get(route('account.orders.index'))->assertInertia(fn (AssertableInertia $page) => $page
            ->has('orders.data', 10)->where('orders.lastPage', 2)->where('orders.nextPageUrl', fn ($url) => $url !== null));
    });

    it('shows the detail to any user of the company and never to another company', function () {
        $owner = User::factory()->ownerOf(Customer::factory()->create())->create();
        $member = User::factory()->memberOf($owner->customer)->create();
        $order = accountOrder($owner, OrderStatus::PaymentRefused);
        $stranger = User::factory()->ownerOf(Customer::factory()->create())->create();

        $this->actingAs($member)->get(route('account.orders.show', $order->number))->assertInertia(fn (AssertableInertia $page) => $page
            ->component('account/orders/show')
            ->where('order.number', $order->number)
            ->where('order.canRetryPayment', true)
            ->where('routes.payment', route('orders.confirmation', $order->number, false))
            ->where('routes.repeat', route('account.orders.repeat', $order->number, false)));

        $this->actingAs($stranger)->get(route('account.orders.show', $order->number))->assertForbidden();
        $this->actingAs($stranger)->post(route('account.orders.repeat', $order->number))->assertForbidden();
        auth()->logout();
        $this->get(route('account.orders.show', $order->number))->assertRedirect(route('login'));
    });
});

describe('repeat order', function () {
    function repeatSetup(array $stocks = [50, 50]): array
    {
        $table = PriceTable::factory()->create();
        $company = Customer::factory()->create(['price_table_id' => $table->id]);
        $user = User::factory()->ownerOf($company)->create();
        $order = Order::factory()->for($user)->for($company)->delivered()->create();
        $products = [];

        foreach ($stocks as $units) {
            $product = Product::factory()->create();
            Stock::factory()->for($product)->create(['quantity' => $units, 'reserved' => 0]);
            PriceTableItem::factory()->for($table)->for($product)->create(['price_cents' => 2_500]);
            OrderItem::factory()->for($order)->for($product)->create(['quantity' => 5, 'unit_price_cents' => 100, 'product_name' => 'Produto '.$product->id]);
            $products[] = $product;
        }

        return compact('user', 'order', 'products');
    }

    it('fills the cart of the user with today prices', function () {
        ['user' => $user, 'order' => $order] = repeatSetup();

        $this->actingAs($user)->post(route('account.orders.repeat', $order->number))->assertRedirect(route('cart.show'));

        expect(app(CartService::class)->unitCount($user))->toBe(10);
        $this->actingAs($user)->get(route('cart.show'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('cart.items.0.unitPriceCents', 2_500)->where('cart.totals.subtotalCents', 10 * 2_500));
    });

    it('adjusts quantities to the stock, skips unavailable items and keeps what was already in the cart', function () {
        ['user' => $user, 'order' => $order, 'products' => [$first, $second]] = repeatSetup([3, 50]);
        app(CartService::class)->add($user, $second, 2);
        $first->update(['is_active' => true]);
        $third = Product::factory()->inactive()->create();
        OrderItem::factory()->for($order)->for($third)->create(['quantity' => 1, 'product_name' => 'Descontinuado']);

        $this->actingAs($user)->post(route('account.orders.repeat', $order->number))->assertRedirect(route('cart.show'));

        expect(CartItem::query()->where('product_id', $first->id)->value('quantity'))->toBe(3)
            ->and(CartItem::query()->where('product_id', $second->id)->value('quantity'))->toBe(7)
            ->and(CartItem::query()->where('product_id', $third->id)->exists())->toBeFalse();
    });

    it('does not touch the cart of another user of the same company', function () {
        ['user' => $user, 'order' => $order] = repeatSetup();
        $member = User::factory()->memberOf($user->customer)->create();

        $this->actingAs($member)->post(route('account.orders.repeat', $order->number));

        expect(app(CartService::class)->unitCount($user))->toBe(0)->and(app(CartService::class)->unitCount($member))->toBe(10);
    });
});

describe('addresses', function () {
    function addressPayloadForAccount(array $overrides = []): array
    {
        return ['label' => 'Filial', 'cep' => '87020-000', 'street' => 'Av. Brasil', 'number' => '10', 'complement' => '', 'neighborhood' => 'Centro', 'city' => 'Maringá', 'state' => 'PR', ...$overrides];
    }

    it('manages the addresses of the company, shared by its users', function () {
        $owner = User::factory()->ownerOf(Customer::factory()->create())->create();
        $member = User::factory()->memberOf($owner->customer)->create();

        $this->actingAs($owner)->post(route('account.addresses.store'), addressPayloadForAccount())->assertRedirect(route('account.addresses.index'));
        $address = Address::query()->firstOrFail();
        expect($address->customer_id)->toBe($owner->customer_id)->and($address->cep)->toBe('87020000');

        $this->actingAs($member)->put(route('account.addresses.update', $address), addressPayloadForAccount(['city' => 'Londrina']))->assertRedirect();
        expect($address->fresh()->city)->toBe('Londrina');

        $this->actingAs($member)->get(route('account.addresses.index'))->assertInertia(fn (AssertableInertia $page) => $page
            ->component('account/addresses')->has('addresses', 1)->where('routes.base', '/conta/enderecos'));

        $this->actingAs($owner)->delete(route('account.addresses.destroy', $address))->assertRedirect(route('account.addresses.index'));
        expect(Address::query()->count())->toBe(0);
    });

    it('never touches addresses of another company and validates fields', function () {
        $owner = User::factory()->ownerOf(Customer::factory()->create())->create();
        $foreign = Address::factory()->create();

        $this->actingAs($owner)->put(route('account.addresses.update', $foreign), addressPayloadForAccount())->assertForbidden();
        $this->actingAs($owner)->delete(route('account.addresses.destroy', $foreign))->assertForbidden();
        $this->actingAs($owner)->post(route('account.addresses.store'), addressPayloadForAccount(['cep' => '12']))->assertSessionHasErrors('cep');

        expect($foreign->fresh())->not->toBeNull();
    });

    it('lets a blocked company keep its addresses but not a pending one', function () {
        $blocked = User::factory()->ownerOf(Customer::factory()->blocked()->create())->create();
        $pending = User::factory()->ownerOf(Customer::factory()->pending()->create())->create();

        $this->actingAs($blocked)->post(route('account.addresses.store'), addressPayloadForAccount())->assertRedirect();
        $this->actingAs($pending)->post(route('account.addresses.store'), addressPayloadForAccount())->assertForbidden();

        expect(Address::query()->count())->toBe(1);
    });
});

describe('wishlist', function () {
    it('lists only the products the user favorited, with prices for approved companies', function () {
        $table = PriceTable::factory()->create();
        $company = Customer::factory()->create(['price_table_id' => $table->id]);
        $owner = User::factory()->ownerOf($company)->create();
        $member = User::factory()->memberOf($company)->create();
        $mine = Product::factory()->create();
        Stock::factory()->for($mine)->create(['quantity' => 10]);
        PriceTableItem::factory()->for($table)->for($mine)->create(['price_cents' => 1_234]);
        $theirs = Product::factory()->create();
        Stock::factory()->for($theirs)->create(['quantity' => 10]);
        WishlistItem::factory()->for($owner)->for($mine)->create();
        WishlistItem::factory()->for($member)->for($theirs)->create();
        WishlistItem::factory()->for($owner)->for(Product::factory()->inactive()->create())->create();

        $this->actingAs($owner)->get(route('account.wishlist.index'))->assertInertia(fn (AssertableInertia $page) => $page
            ->component('account/wishlist')
            ->has('products', 1)
            ->where('products.0.id', $mine->id)
            ->where('products.0.priceState.unitPriceCents', 1_234)
            ->where('routes.removeBase', '/lista-de-desejos'));
    });

    it('moves a product to the cart and takes it off the list', function () {
        $table = PriceTable::factory()->create();
        $owner = User::factory()->ownerOf(Customer::factory()->create(['price_table_id' => $table->id]))->create();
        $product = Product::factory()->create();
        Stock::factory()->for($product)->create(['quantity' => 10]);
        PriceTableItem::factory()->for($table)->for($product)->create(['price_cents' => 500]);
        WishlistItem::factory()->for($owner)->for($product)->create();

        $this->actingAs($owner)->post(route('account.wishlist.move', $product))->assertRedirect();

        expect(app(CartService::class)->unitCount($owner))->toBe(1)->and(WishlistItem::query()->count())->toBe(0);
    });

    it('keeps the product on the list when it cannot be bought', function () {
        $owner = User::factory()->ownerOf(Customer::factory()->create())->create();
        $product = Product::factory()->create();
        WishlistItem::factory()->for($owner)->for($product)->create();

        $this->actingAs($owner)->post(route('account.wishlist.move', $product))->assertSessionHasErrors('quantity');

        expect(WishlistItem::query()->count())->toBe(1);
    });
});

describe('redirects', function () {
    it('returns to the page the visitor wanted after logging in', function () {
        $user = User::factory()->ownerOf(Customer::factory()->create())->create(['password' => bcrypt('password')]);

        $this->get(route('cart.show'))->assertRedirect(route('login'));
        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password'])->assertRedirect(route('cart.show'));
    });
});
