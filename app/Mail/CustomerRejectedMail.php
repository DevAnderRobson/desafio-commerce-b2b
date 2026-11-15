<?php

namespace App\Mail;

use App\Enums\RejectionTemplate;
use App\Models\Customer;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CustomerRejectedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public Customer $customer,
        public RejectionTemplate $template = RejectionTemplate::Default,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Retorno sobre o seu cadastro');
    }

    public function content(): Content
    {
        return new Content(markdown: 'mail.customer-rejected');
    }
}
