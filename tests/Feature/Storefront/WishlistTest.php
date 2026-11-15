<?php

use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use App\Models\WishlistItem;
use Inertia\Testing\AssertableInertia;

it('adds a product to the wishlist of the logged user', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();

    $this->actingAs($user)->post(route('wishlist.store', $product))->assertRedirect();

    expect(WishlistItem::query()->where('user_id', $user->id)->where('product_id', $product->id)->exists())->toBeTrue();
});

it('is idempotent when adding twice', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();

    $this->actingAs($user)->post(route('wishlist.store', $product));
    $this->actingAs($user)->post(route('wishlist.store', $product))->assertRedirect();

    expect(WishlistItem::query()->count())->toBe(1);
});

it('removes a product and tolerates removing something that is not there', function () {
    $user = User::factory()->create();
    $product = Product::factory()->create();
    WishlistItem::factory()->for($user)->for($product)->create();

    $this->actingAs($user)->delete(route('wishlist.destroy', $product))->assertRedirect();
    $this->actingAs($user)->delete(route('wishlist.destroy', $product))->assertRedirect();

    expect(WishlistItem::query()->count())->toBe(0);
});

it('keeps wishlists private even between users of the same company', function () {
    $company = Customer::factory()->create();
    $owner = User::factory()->ownerOf($company)->create();
    $member = User::factory()->memberOf($company)->create();
    $product = Product::factory()->create(['slug' => 'desejado']);

    $this->actingAs($owner)->post(route('wishlist.store', $product));
    $this->actingAs($member)->delete(route('wishlist.destroy', $product));

    expect(WishlistItem::query()->where('user_id', $owner->id)->exists())->toBeTrue();

    $this->actingAs($owner)->get('/produtos/desejado')->assertInertia(fn (AssertableInertia $page) => $page->where('product.wishlisted', true));
    $this->actingAs($member)->get('/produtos/desejado')->assertInertia(fn (AssertableInertia $page) => $page->where('product.wishlisted', false));
});

it('requires login and refuses inactive products', function () {
    $product = Product::factory()->create();

    $this->post(route('wishlist.store', $product))->assertRedirect(route('login'));
    $this->actingAs(User::factory()->create())
        ->post(route('wishlist.store', Product::factory()->inactive()->create()))
        ->assertNotFound();
});
