<?php

use App\Cart\CartService;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Enums\ReservationState;
use App\Jobs\ProcessOrderPayment;
use App\Messaging\Events\OrderCreated;
use App\Messaging\Testing\FakeEventPublisher;
use App\Models\Address;
use App\Models\Customer;
use App\Models\Order;
use App\Models\PriceTable;
use App\Models\PriceTableItem;
use App\Models\User;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $this->travelTo('2026-11-16 10:00:00');
    config(['shop.freight.free_shipping_threshold_cents' => 0]);
});

describe('payment step', function () {
    it('lists terms with surcharge and total, disabling the ones that do not fit', function () {
        ['user' => $user, 'address' => $address] = orderSetup(unitPriceCents: 40_000, company: ['credit_limit_cents' => 35_000]);
        chooseDelivery($user, $address);

        $this->actingAs($user)->get(route('checkout.payment'))->assertInertia(fn (AssertableInertia $page) => $page
            ->component('checkout/payment')
            ->where('paymentTerms.0.code', 'PIX')
            ->where('paymentTerms.0.available', true)
            ->where('paymentTerms.0.totalCents', 40_000 + 1_800 + 400)
            ->where('paymentTerms.1.code', 'BOL28')
            ->where('paymentTerms.1.available', false)
            ->where('paymentTerms.1.unavailableReason', fn ($reason) => str_contains($reason, 'Limite de crédito insuficiente'))
            ->where('paymentTerms.2.available', false)
            ->where('paymentTerms.2.unavailableReason', fn ($reason) => str_contains($reason, 'a partir de R$ 1.000,00'))
            ->where('selectedTermCode', 'PIX')
            ->where('address.id', $address->id)
            ->where('freight.priceCents', 1_800 + 400));
    });

    it('applies the surcharge to subtotal plus freight, half-up', function () {
        ['user' => $user, 'address' => $address] = orderSetup(unitPriceCents: 100_000);
        chooseDelivery($user, $address);
        $freight = 1_800 + 1_000;

        $this->actingAs($user)->get(route('checkout.payment'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('paymentTerms.2.available', true)
            ->where('paymentTerms.2.surchargeCents', intdiv((100_000 + $freight) * 250 + 5_000, 10_000))
            ->where('paymentTerms.2.totalCents', 100_000 + $freight + intdiv((100_000 + $freight) * 250 + 5_000, 10_000)));
    });

    it('sends the user back when there is no saved delivery, an empty cart or a blocked company', function () {
        ['user' => $user] = orderSetup();
        $this->actingAs($user)->get(route('checkout.payment'))->assertRedirect(route('checkout.delivery'));

        $empty = User::factory()->ownerOf(Customer::factory()->create())->create();
        $this->actingAs($empty)->get(route('checkout.payment'))->assertRedirect(route('cart.show'));

        ['user' => $blocked] = orderSetup(company: ['is_blocked' => true]);
        $this->actingAs($blocked)->get(route('checkout.payment'))->assertRedirect(route('cart.show'));
    });

    it('continues from the delivery confirmation to the payment step', function () {
        ['user' => $user, 'address' => $address] = orderSetup();

        $this->actingAs($user)->put(route('checkout.delivery.confirm'), ['address_id' => $address->id, 'freight_code' => 'economic'])
            ->assertRedirect(route('checkout.payment'));
    });
});

describe('creation', function () {
    it('creates a pending order with frozen prices, address, totals and a payment', function () {
        Queue::fake();
        $events = FakeEventPublisher::fake();
        ['user' => $user, 'address' => $address, 'product' => $product, 'stock' => $stock] = orderSetup(unitPriceCents: 5_000, quantity: 3);
        chooseDelivery($user, $address);

        $response = placeOrder($user);
        $order = Order::query()->with('items', 'payments')->firstOrFail();

        $response->assertRedirect(route('orders.processing', $order->number));
        expect($order->status)->toBe(OrderStatus::PendingPayment)
            ->and($order->user_id)->toBe($user->id)
            ->and($order->customer_id)->toBe($user->customer_id)
            ->and($order->subtotal_cents)->toBe(15_000)
            ->and($order->shipping_cents)->toBe(1_800 + 150)
            ->and($order->total_cents)->toBe(15_000 + 1_800 + 150)
            ->and($order->address_snapshot['street'])->toBe($address->street)
            ->and($order->items->first()->unit_price_cents)->toBe(5_000)
            ->and($order->items->first()->product_name)->toBe($product->name)
            ->and($order->items->first()->line_total_cents)->toBe(15_000)
            ->and($order->payments)->toHaveCount(1)
            ->and($order->payments->first()->status)->toBe(PaymentStatus::Pending)
            ->and($order->reservation_state)->toBe(ReservationState::Reserved)
            ->and($stock->fresh()->reserved)->toBe(3)
            ->and($stock->fresh()->quantity)->toBe(100);
        Queue::assertPushed(ProcessOrderPayment::class, fn (ProcessOrderPayment $job) => $job->order->is($order));
        $events->assertPublished(OrderCreated::class, fn (OrderCreated $event) => $event->orderId === $order->id && $event->totalInCents === $order->total_cents);
    });

    it('keeps the order price when the catalog price changes afterwards', function () {
        Queue::fake();
        ['user' => $user, 'address' => $address] = orderSetup(unitPriceCents: 5_000);
        chooseDelivery($user, $address);
        placeOrder($user);

        PriceTableItem::query()->update(['price_cents' => 9_999]);

        expect(Order::query()->firstOrFail()->items->first()->unit_price_cents)->toBe(5_000);
    });

    it('is idempotent: the same key never creates two orders or reserves stock twice', function () {
        Queue::fake();
        ['user' => $user, 'address' => $address, 'stock' => $stock] = orderSetup(quantity: 2);
        chooseDelivery($user, $address);

        placeOrder($user, key: 'same-key');
        placeOrder($user, key: 'same-key');

        expect(Order::query()->count())->toBe(1)->and($stock->fresh()->reserved)->toBe(2);
        Queue::assertPushed(ProcessOrderPayment::class, 1);
    });

    it('never returns an order of another company for a repeated key', function () {
        Queue::fake();
        ['user' => $owner, 'address' => $address] = orderSetup();
        chooseDelivery($owner, $address);
        placeOrder($owner, key: 'shared-key');
        ['user' => $other, 'address' => $otherAddress] = orderSetup();
        chooseDelivery($other, $otherAddress);

        placeOrder($other, key: 'shared-key')->assertSessionHasErrors('order');

        expect(Order::query()->count())->toBe(1);
    });

    it('refuses a term that is unavailable, even if the browser forces it', function () {
        Queue::fake();
        ['user' => $user, 'address' => $address, 'stock' => $stock] = orderSetup(unitPriceCents: 10_000);
        chooseDelivery($user, $address);

        placeOrder($user, 'BOL2856')->assertSessionHasErrors('payment_term_code');
        placeOrder($user, 'NOPE', 'key-2')->assertSessionHasErrors('payment_term_code');

        expect(Order::query()->count())->toBe(0)->and($stock->fresh()->reserved)->toBe(0);
    });

    it('blocks a deferred term that exceeds the credit limit and shows the available amount (D21)', function () {
        Queue::fake();
        ['user' => $user, 'address' => $address] = orderSetup(unitPriceCents: 60_000, company: ['credit_limit_cents' => 100_000, 'credit_used_cents' => 50_000]);
        chooseDelivery($user, $address);

        placeOrder($user, 'BOL28')->assertSessionHasErrors('payment_term_code');

        expect($user->customer->fresh()->credit_used_cents)->toBe(50_000);
        $this->actingAs($user)->get(route('checkout.payment'))->assertInertia(fn (AssertableInertia $page) => $page
            ->where('paymentTerms.1.available', false)
            ->where('paymentTerms.1.availableCreditCents', 50_000));
    });

    it('reserves company credit for deferred terms and keeps it separate for PIX', function () {
        Queue::fake();
        ['user' => $user, 'address' => $address] = orderSetup(unitPriceCents: 50_000);
        chooseDelivery($user, $address);

        placeOrder($user, 'BOL28');
        $order = Order::query()->firstOrFail();

        expect($order->is_deferred)->toBeTrue()
            ->and($order->credit_reserved_cents)->toBe($order->total_cents)
            ->and($user->customer->fresh()->credit_used_cents)->toBe($order->total_cents);
    });

    it('refuses when stock ran out between the cart and the confirmation', function () {
        Queue::fake();
        ['user' => $user, 'address' => $address, 'stock' => $stock] = orderSetup(quantity: 5, stockUnits: 10);
        chooseDelivery($user, $address);
        $stock->update(['quantity' => 3]);

        placeOrder($user)->assertRedirect()->assertSessionHasErrors('order');

        expect(Order::query()->count())->toBe(0)->and($stock->fresh()->reserved)->toBe(0);
    });

    it('does not oversell: two companies competing for the last units, only one wins', function () {
        Queue::fake();
        ['user' => $first, 'address' => $firstAddress, 'product' => $product, 'stock' => $stock] = orderSetup(quantity: 6, stockUnits: 10);
        chooseDelivery($first, $firstAddress);
        $table = PriceTable::factory()->create();
        PriceTableItem::factory()->for($table)->for($product)->create(['price_cents' => 100_000]);
        $secondCustomer = Customer::factory()->create(['price_table_id' => $table->id, 'credit_limit_cents' => 1_000_000]);
        $second = User::factory()->ownerOf($secondCustomer)->create();
        app(CartService::class)->add($second, $product, 6);
        $secondAddress = Address::factory()->for($secondCustomer)->inState('PR')->create();

        session(['checkout.address_id' => $firstAddress->id, 'checkout.freight_code' => 'economic']);
        placeOrder($first, key: 'first');
        session(['checkout.address_id' => $secondAddress->id, 'checkout.freight_code' => 'economic']);
        placeOrder($second, key: 'second')->assertSessionHasErrors('order');

        expect(Order::query()->count())->toBe(1)->and($stock->fresh()->reserved)->toBe(6);
    });

    it('requires login, an approved and unblocked company and an address of the own company', function () {
        $this->post(route('checkout.place'), ['payment_term_code' => 'PIX', 'idempotency_key' => 'k'])->assertRedirect(route('login'));

        ['user' => $blocked, 'address' => $address] = orderSetup(company: ['is_blocked' => true]);
        $this->actingAs($blocked)->post(route('checkout.place'), ['payment_term_code' => 'PIX', 'idempotency_key' => 'k'])->assertForbidden();

        ['user' => $user] = orderSetup();
        $foreign = Address::factory()->create();
        chooseDelivery($user, Address::query()->where('customer_id', $user->customer_id)->firstOrFail());
        session(['checkout.address_id' => $foreign->id]);
        $this->actingAs($user)->post(route('checkout.place'), ['payment_term_code' => 'PIX', 'idempotency_key' => 'k2'])->assertRedirect(route('checkout.delivery'));

        expect(Order::query()->count())->toBe(0);
    });

    it('starts a new purchase with a fresh key after an order is placed', function () {
        Queue::fake();
        ['user' => $user, 'address' => $address] = orderSetup();
        chooseDelivery($user, $address);
        $key = $this->actingAs($user)->get(route('checkout.payment'))->viewData('page')['props']['idempotencyKey'];

        placeOrder($user, key: $key);

        expect(session('checkout.idempotency_key'))->toBeNull();
    });
});
