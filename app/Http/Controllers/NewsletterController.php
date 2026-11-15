<?php

namespace App\Http\Controllers;

use App\Enums\NewsletterStatus;
use App\Mail\NewsletterConfirmationMail;
use App\Models\NewsletterSubscription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;

/**
 * Newsletter sign-up with double opt-in. The response to a sign-up is always the same, so
 * the form never reveals whether an e-mail is already subscribed.
 */
class NewsletterController extends Controller
{
    private const CONFIRMATION_LINK_HOURS = 48;

    private const RESEND_AFTER_MINUTES = 10;

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'string', 'email', 'max:255'],
            'consent' => ['accepted'],
            'website' => ['nullable', 'max:0'],
        ], [
            'consent.accepted' => 'Para se inscrever, é preciso aceitar o recebimento do informativo.',
        ]);

        // A filled honeypot ("website") fails validation above; bots get the generic error only.
        $this->subscribe(mb_strtolower(trim($data['email'])));

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Se o e-mail for válido, enviamos um link de confirmação para ele.',
        ]);

        return back();
    }

    public function confirm(NewsletterSubscription $subscription): RedirectResponse
    {
        if ($subscription->status !== NewsletterStatus::Confirmed) {
            $subscription->update([
                'status' => NewsletterStatus::Confirmed,
                'confirmed_at' => now(),
                'unsubscribed_at' => null,
            ]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Inscrição confirmada. Obrigado!']);

        return to_route('home');
    }

    public function unsubscribe(NewsletterSubscription $subscription): RedirectResponse
    {
        $subscription->update(['status' => NewsletterStatus::Unsubscribed, 'unsubscribed_at' => now()]);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Inscrição cancelada.']);

        return to_route('home');
    }

    private function subscribe(string $email): void
    {
        $subscription = NewsletterSubscription::firstOrNew(['email' => $email]);

        if ($subscription->status === NewsletterStatus::Confirmed) {
            return;
        }

        $recentlySent = $subscription->confirmation_sent_at?->gt(now()->subMinutes(self::RESEND_AFTER_MINUTES)) ?? false;

        if ($subscription->exists && $subscription->status === NewsletterStatus::Pending && $recentlySent) {
            return;
        }

        $subscription->fill([
            'status' => NewsletterStatus::Pending,
            'consented_at' => now(),
            'confirmation_sent_at' => now(),
            'unsubscribed_at' => null,
        ])->save();

        Mail::to($email)->queue(new NewsletterConfirmationMail(
            $subscription,
            URL::temporarySignedRoute('newsletter.confirm', now()->addHours(self::CONFIRMATION_LINK_HOURS), ['subscription' => $subscription->id]),
            URL::signedRoute('newsletter.unsubscribe', ['subscription' => $subscription->id]),
        ));
    }
}
