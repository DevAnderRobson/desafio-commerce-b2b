<?php

namespace App\Mail;

use App\Models\NewsletterSubscription;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewsletterConfirmationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public NewsletterSubscription $subscription,
        public string $confirmUrl,
        public string $unsubscribeUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Confirme a sua inscrição no informativo');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.newsletter-confirmation');
    }
}
