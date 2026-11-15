<?php

use App\Models\Customer;
use App\Models\User;
use Illuminate\Support\Facades\Gate;

it('allows an approved company to see prices and check out', function () {
    $user = User::factory()->ownerOf(Customer::factory()->create())->create();

    expect(Gate::forUser($user)->allows('view-prices'))->toBeTrue()
        ->and(Gate::forUser($user)->allows('checkout'))->toBeTrue();
});

it('lets a blocked company see prices but not check out', function () {
    $user = User::factory()->ownerOf(Customer::factory()->blocked()->create())->create();

    expect(Gate::forUser($user)->allows('view-prices'))->toBeTrue()
        ->and(Gate::forUser($user)->allows('checkout'))->toBeFalse();
});

it('denies prices and checkout to companies that are not approved', function (string $state) {
    $user = User::factory()->ownerOf(Customer::factory()->{$state}()->create())->create();

    expect(Gate::forUser($user)->allows('view-prices'))->toBeFalse()
        ->and(Gate::forUser($user)->allows('checkout'))->toBeFalse();
})->with(['pending', 'rejected']);

it('denies prices and checkout to a user without a company', function () {
    $user = User::factory()->create();

    expect(Gate::forUser($user)->allows('view-prices'))->toBeFalse()
        ->and(Gate::forUser($user)->allows('checkout'))->toBeFalse();
});

it('lets a member inherit the approval of the company', function () {
    $user = User::factory()->memberOf(Customer::factory()->create())->create();

    expect(Gate::forUser($user)->allows('view-prices'))->toBeTrue();
});
