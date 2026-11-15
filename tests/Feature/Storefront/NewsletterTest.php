<?php

use App\Enums\NewsletterStatus;
use App\Mail\NewsletterConfirmationMail;
use App\Models\NewsletterSubscription;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;

beforeEach(fn () => Mail::fake());

function subscribe(array $overrides = [])
{
    return test()->post(route('newsletter.store'), [
        'email' => 'compras@empresa.com.br',
        'consent' => '1',
        ...$overrides,
    ]);
}

it('creates a pending subscription and sends the confirmation link', function () {
    subscribe()->assertRedirect()->assertSessionHasNoErrors();

    $subscription = NewsletterSubscription::firstWhere('email', 'compras@empresa.com.br');
    expect($subscription->status)->toBe(NewsletterStatus::Pending)
        ->and($subscription->consented_at)->not->toBeNull();
    Mail::assertQueued(NewsletterConfirmationMail::class, fn ($mail) => $mail->hasTo('compras@empresa.com.br'));
});

it('normalizes the e-mail before storing it', function () {
    subscribe(['email' => '  Compras@Empresa.COM.br ']);

    expect(NewsletterSubscription::count())->toBe(1)
        ->and(NewsletterSubscription::first()->email)->toBe('compras@empresa.com.br');
});

it('requires consent and a valid e-mail', function (array $overrides, string $field) {
    subscribe($overrides)->assertSessionHasErrors($field);

    expect(NewsletterSubscription::count())->toBe(0);
    Mail::assertNothingQueued();
})->with([
    'no consent' => [['consent' => null], 'consent'],
    'invalid e-mail' => [['email' => 'nao-e-email'], 'email'],
    'missing e-mail' => [['email' => ''], 'email'],
    'filled honeypot' => [['website' => 'http://spam.example'], 'website'],
]);

it('answers the same way for already confirmed e-mails without sending anything', function () {
    NewsletterSubscription::factory()->confirmed()->create(['email' => 'compras@empresa.com.br']);

    subscribe()->assertRedirect()->assertSessionHasNoErrors();

    Mail::assertNothingQueued();
    expect(NewsletterSubscription::first()->status)->toBe(NewsletterStatus::Confirmed);
});

it('does not resend the confirmation inside the throttle window but does afterwards', function () {
    subscribe();
    subscribe();
    Mail::assertQueuedCount(1);

    $this->travel(11)->minutes();
    subscribe();
    Mail::assertQueuedCount(2);
});

it('lets someone who unsubscribed sign up again', function () {
    NewsletterSubscription::factory()->unsubscribed()->create(['email' => 'compras@empresa.com.br', 'confirmation_sent_at' => now()->subDay()]);

    subscribe();

    expect(NewsletterSubscription::first()->status)->toBe(NewsletterStatus::Pending);
    Mail::assertQueued(NewsletterConfirmationMail::class);
});

it('throttles sign-ups per IP', function () {
    foreach (range(1, 5) as $i) {
        subscribe(['email' => "pessoa{$i}@empresa.com.br"])->assertRedirect();
    }

    subscribe(['email' => 'pessoa6@empresa.com.br'])->assertTooManyRequests();
});

it('confirms the subscription through the signed link', function () {
    $subscription = NewsletterSubscription::factory()->create();
    $url = URL::temporarySignedRoute('newsletter.confirm', now()->addHour(), ['subscription' => $subscription->id]);

    $this->get($url)->assertRedirect(route('home'));

    expect($subscription->fresh()->status)->toBe(NewsletterStatus::Confirmed)
        ->and($subscription->fresh()->confirmed_at)->not->toBeNull();
});

it('rejects tampered or expired confirmation links', function () {
    $subscription = NewsletterSubscription::factory()->create();

    $this->get(route('newsletter.confirm', $subscription))->assertForbidden();

    $expired = URL::temporarySignedRoute('newsletter.confirm', now()->addHour(), ['subscription' => $subscription->id]);
    $this->travel(2)->hours();
    $this->get($expired)->assertForbidden();

    expect($subscription->fresh()->status)->toBe(NewsletterStatus::Pending);
});

it('unsubscribes through the signed link and rejects unsigned ones', function () {
    $subscription = NewsletterSubscription::factory()->confirmed()->create();

    $this->get(route('newsletter.unsubscribe', $subscription))->assertForbidden();
    expect($subscription->fresh()->status)->toBe(NewsletterStatus::Confirmed);

    $this->get(URL::signedRoute('newsletter.unsubscribe', ['subscription' => $subscription->id]))->assertRedirect(route('home'));
    expect($subscription->fresh()->status)->toBe(NewsletterStatus::Unsubscribed);
});
