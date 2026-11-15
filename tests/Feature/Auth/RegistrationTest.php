<?php

use App\Enums\ApprovalStatus;
use App\Enums\CompanyRole;
use App\Models\Customer;
use App\Models\User;
use Laravel\Fortify\Features;

beforeEach(function () {
    $this->skipUnlessFortifyHas(Features::registration());
});

function registrationPayload(array $overrides = []): array
{
    return [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
        'cnpj' => '11.222.333/0001-81',
        'legal_name' => 'Mercado Teste Ltda',
        'trade_name' => 'Mercado Teste',
        ...$overrides,
    ];
}

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('registering creates a pending company owned by the new user', function () {
    $response = $this->post(route('register.store'), registrationPayload());

    $this->assertAuthenticated();
    $response->assertRedirect(route('account.dashboard', absolute: false));

    $user = User::firstWhere('email', 'test@example.com');
    expect($user->company_role)->toBe(CompanyRole::Owner)
        ->and($user->customer->approval_status)->toBe(ApprovalStatus::Pending)
        ->and($user->customer->cnpj)->toBe('11.222.333/0001-81')
        ->and($user->customer->price_table_id)->toBeNull()
        ->and($user->customer->duplicate_of_customer_id)->toBeNull();
});

test('the cnpj is stored with the mask regardless of how it was typed', function () {
    $this->post(route('register.store'), registrationPayload(['cnpj' => '11222333000181']));

    expect(Customer::first()->cnpj)->toBe('11.222.333/0001-81');
});

test('an invalid cnpj is rejected', function (string $cnpj) {
    $this->post(route('register.store'), registrationPayload(['cnpj' => $cnpj]))
        ->assertSessionHasErrors('cnpj');

    $this->assertGuest();
})->with([
    'wrong check digits' => ['11.222.333/0001-82'],
    'repeated digits' => ['11.111.111/1111-11'],
    'too short' => ['123'],
]);

test('a duplicated cnpj goes through the same flow without revealing the existing company', function () {
    $original = Customer::factory()->create(['cnpj' => '11.222.333/0001-81']);

    $response = $this->post(route('register.store'), registrationPayload());

    $response->assertRedirect(route('account.dashboard', absolute: false))
        ->assertSessionHasNoErrors();
    $this->assertAuthenticated();

    $duplicate = User::firstWhere('email', 'test@example.com')->customer;
    expect($duplicate->id)->not->toBe($original->id)
        ->and($duplicate->duplicate_of_customer_id)->toBe($original->id)
        ->and($duplicate->approval_status)->toBe(ApprovalStatus::Pending)
        ->and(Customer::count())->toBe(2);
});
