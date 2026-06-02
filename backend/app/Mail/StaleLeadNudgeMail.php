<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaleLeadNudgeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $leadName,
        public readonly string $leadMobile,
        public readonly string $leadSource,
        public readonly string $leadId,
        public readonly int    $daysSinceActivity,
        public readonly string $businessName,
        public readonly string $appUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "⏰ Follow up with {$this->leadName} — {$this->daysSinceActivity} days inactive",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.stale-lead-nudge',
        );
    }
}