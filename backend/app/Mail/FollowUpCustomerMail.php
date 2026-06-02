<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class FollowUpCustomerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string  $customerName,
        public readonly string  $businessName,
        public readonly ?string $note,
        public readonly string  $appUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "We will be in touch — {$this->businessName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.followup-customer',
        );
    }
}