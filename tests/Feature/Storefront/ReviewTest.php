<?php

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Models\User;
use App\Reviews\PurchaseVerifier;

function reviewPayload(array $overrides = []): array
{
    return ['rating' => 5, 'title' => 'Muito bom', 'body' => 'Produto chegou bem embalado e conforme descrito.', ...$overrides];
}

function orderWith(Product $product, User $buyer, ?OrderStatus $status = null): Order
{
    $order = Order::factory()->for($buyer)->for($buyer->customer)->create();
    $status ??= OrderStatus::Delivered;
    $order->update(['status' => $status, 'delivered_at' => $status === OrderStatus::Delivered ? now() : null]);
    OrderItem::factory()->for($order)->for($product)->create();

    return $order;
}

function storedReview(User $user, Product $product): Review
{
    return Review::query()->where('user_id', $user->id)->where('product_id', $product->id)->firstOrFail();
}

describe('badge', function () {
    it('is granted to the user who received a delivered order', function () {
        $company = Customer::factory()->create();
        $buyer = User::factory()->memberOf($company)->create();
        $product = Product::factory()->create();
        orderWith($product, $buyer);

        $this->actingAs($buyer)->post(route('reviews.store', $product), reviewPayload())->assertRedirect();

        expect(storedReview($buyer, $product)->verified_purchase)->toBeTrue();
    });

    it('is granted to the company owner for an order another member bought', function () {
        $company = Customer::factory()->create();
        $owner = User::factory()->ownerOf($company)->create();
        $member = User::factory()->memberOf($company)->create();
        $product = Product::factory()->create();
        orderWith($product, $member);

        $this->actingAs($owner)->post(route('reviews.store', $product), reviewPayload());

        expect(storedReview($owner, $product)->verified_purchase)->toBeTrue();
    });

    it('is not granted to a member who did not buy it', function () {
        $company = Customer::factory()->create();
        $owner = User::factory()->ownerOf($company)->create();
        $member = User::factory()->memberOf($company)->create();
        $other = User::factory()->memberOf($company)->create();
        $product = Product::factory()->create();
        orderWith($product, $member);

        $this->actingAs($other)->post(route('reviews.store', $product), reviewPayload());

        expect(storedReview($other, $product)->verified_purchase)->toBeFalse()
            ->and(app(PurchaseVerifier::class)->hasDeliveredPurchase($owner, $product))->toBeTrue();
    });

    it('is not granted for companies that are different from the reviewer', function () {
        $buyer = User::factory()->ownerOf(Customer::factory()->create())->create();
        $stranger = User::factory()->ownerOf(Customer::factory()->create())->create();
        $product = Product::factory()->create();
        orderWith($product, $buyer);

        expect(app(PurchaseVerifier::class)->hasDeliveredPurchase($stranger, $product))->toBeFalse();
    });

    it('requires delivery: paid, shipped, cancelled and orders for other products do not count', function (OrderStatus $status) {
        $buyer = User::factory()->ownerOf(Customer::factory()->create())->create();
        $product = Product::factory()->create();
        orderWith($product, $buyer, $status);
        orderWith(Product::factory()->create(), $buyer);

        $this->actingAs($buyer)->post(route('reviews.store', $product), reviewPayload());

        expect(storedReview($buyer, $product)->verified_purchase)->toBeFalse();
    })->with([OrderStatus::PendingPayment, OrderStatus::Paid, OrderStatus::Picking, OrderStatus::Shipped, OrderStatus::Cancelled]);

    it('cannot be forged through the payload', function () {
        $user = User::factory()->ownerOf(Customer::factory()->create())->create();
        $product = Product::factory()->create();

        $this->actingAs($user)->post(route('reviews.store', $product), reviewPayload(['verified_purchase' => true, 'badge' => 'purchased']));

        expect(storedReview($user, $product)->verified_purchase)->toBeFalse();
    });
});

describe('submission', function () {
    it('edits the existing review instead of duplicating it and recomputes the badge', function () {
        $user = User::factory()->ownerOf(Customer::factory()->create())->create();
        $product = Product::factory()->create();

        $this->actingAs($user)->post(route('reviews.store', $product), reviewPayload(['rating' => 2]));
        orderWith($product, $user);
        $this->actingAs($user)->put(route('reviews.store', $product), reviewPayload(['rating' => 4]))->assertRedirect();

        expect(Review::query()->count())->toBe(1)
            ->and(storedReview($user, $product)->rating)->toBe(4)
            ->and(storedReview($user, $product)->verified_purchase)->toBeTrue();
    });

    it('requires login and an approved company', function () {
        $product = Product::factory()->create();

        $this->post(route('reviews.store', $product), reviewPayload())->assertRedirect(route('login'));

        $pending = User::factory()->ownerOf(Customer::factory()->pending()->create())->create();
        $this->actingAs($pending)->post(route('reviews.store', $product), reviewPayload())->assertForbidden();

        expect(Review::query()->count())->toBe(0);
    });

    it('validates rating and text size', function (array $payload, string $field) {
        $user = User::factory()->ownerOf(Customer::factory()->create())->create();
        $product = Product::factory()->create();

        $this->actingAs($user)->post(route('reviews.store', $product), reviewPayload($payload))->assertSessionHasErrors($field);
    })->with([
        'rating zero' => [['rating' => 0], 'rating'],
        'rating six' => [['rating' => 6], 'rating'],
        'missing body' => [['body' => ''], 'body'],
        'short body' => [['body' => 'curto'], 'body'],
        'long body' => [['body' => str_repeat('a', 2001)], 'body'],
        'long title' => [['title' => str_repeat('a', 121)], 'title'],
    ]);

    it('stores html as plain text without altering it', function () {
        $user = User::factory()->ownerOf(Customer::factory()->create())->create();
        $product = Product::factory()->create(['slug' => 'escape']);

        $this->actingAs($user)->post(route('reviews.store', $product), reviewPayload(['body' => '<script>alert(1)</script> texto longo']));

        expect(storedReview($user, $product)->body)->toBe('<script>alert(1)</script> texto longo');
    });

    it('rate limits submissions', function () {
        $user = User::factory()->ownerOf(Customer::factory()->create())->create();
        $product = Product::factory()->create();

        foreach (range(1, 10) as $ignored) {
            $this->actingAs($user)->post(route('reviews.store', $product), reviewPayload())->assertRedirect();
        }

        $this->actingAs($user)->post(route('reviews.store', $product), reviewPayload())->assertTooManyRequests();
    });
});
