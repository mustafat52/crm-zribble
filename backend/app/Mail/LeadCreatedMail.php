<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LeadCreatedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $leadName,
        public readonly string $leadMobile,
        public readonly string $leadSource,
        public readonly string $businessName,
        public readonly ?string $assignedTo = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🔔 New Lead: ' . $this->leadName,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.lead-created',
        );
    }
}