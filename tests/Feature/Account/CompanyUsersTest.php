<?php

use App\Enums\CompanyRole;
use App\Mail\CompanyUserInvitedMail;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

beforeEach(fn () => Mail::fake());

it('lets the owner of an approved company link a user without store owner review', function () {
    $customer = Customer::factory()->create();
    $owner = User::factory()->ownerOf($customer)->create();

    $this->actingAs($owner)
        ->post(route('account.users.store'), ['name' => 'Maria', 'email' => 'maria@example.com'])
        ->assertRedirect(route('account.users.index'));

    $member = User::firstWhere('email', 'maria@example.com');
    expect($member->customer_id)->toBe($customer->id)
        ->and($member->company_role)->toBe(CompanyRole::Member)
        ->and($member->hasVerifiedEmail())->toBeTrue();
    Mail::assertQueued(CompanyUserInvitedMail::class, fn ($mail) => $mail->hasTo('maria@example.com'));
});

it('shows only the users of the own company to the owner', function () {
    $customer = Customer::factory()->create();
    $owner = User::factory()->ownerOf($customer)->create();
    User::factory()->memberOf($customer)->create(['name' => 'Colega']);
    User::factory()->memberOf(Customer::factory()->create())->create(['name' => 'Outra Empresa']);

    $this->actingAs($owner)
        ->get(route('account.users.index'))
        ->assertInertia(fn ($page) => $page
            ->component('account/users/index')
            ->has('users', 2)
            ->where('users.0.name', fn ($name) => $name !== 'Outra Empresa'));
});

it('forbids the panel to members, pending companies and users without a company', function (string $who) {
    $user = match ($who) {
        'member' => User::factory()->memberOf(Customer::factory()->create())->create(),
        'pending owner' => User::factory()->ownerOf(Customer::factory()->pending()->create())->create(),
        'no company' => User::factory()->create(),
    };

    $this->actingAs($user)->get(route('account.users.index'))->assertForbidden();
    $this->actingAs($user)
        ->post(route('account.users.store'), ['name' => 'X', 'email' => 'x@example.com'])
        ->assertForbidden();

    expect(User::where('email', 'x@example.com')->exists())->toBeFalse();
})->with(['member', 'pending owner', 'no company']);

it('does not reveal which company already owns an e-mail', function () {
    $owner = User::factory()->ownerOf(Customer::factory()->create())->create();
    $existing = User::factory()->memberOf(Customer::factory()->create())->create();

    $this->actingAs($owner)
        ->post(route('account.users.store'), ['name' => 'Maria', 'email' => $existing->email])
        ->assertSessionHasErrors(['email' => 'Não foi possível vincular este e-mail.']);

    expect($existing->fresh()->customer_id)->not->toBe($owner->customer_id);
    Mail::assertNothingQueued();
});

it('requires authentication', function () {
    $this->get(route('account.users.index'))->assertRedirect(route('login'));
});

it('shares the company context without prices or credit figures', function () {
    $user = User::factory()->ownerOf(Customer::factory()->pending()->create(['trade_name' => 'Bom Preço']))->create();

    $this->actingAs($user)
        ->get(route('account.dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('company.name', 'Bom Preço')
            ->where('company.approval_status', 'pending')
            ->where('company.is_owner', true)
            ->missing('company.credit_limit_cents'));
});
