<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('account.dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the account dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('account.dashboard'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page->component('account/dashboard'));
});

test('the legacy dashboard url redirects permanently to the account area', function () {
    $this->get('/dashboard')->assertRedirect('/conta')->assertStatus(301);
});

test('the account dashboard lives under the conta prefix', function () {
    expect(route('account.dashboard', absolute: false))->toBe('/conta');
});
