<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * T69: Dedicated mailable for follow-up reminder emails sent to salesperson/owner.
 *
 * Previously, LeadCreatedMail was being reused for follow-up reminders, which
 * caused salespeople to receive "New Lead Received" subject lines as their
 * follow-up reminders — confusing and unprofessional.
 *
 * This class mirrors the structure of LeadCreatedMail and FollowUpCustomerMail
 * (already present in the codebase) but is purpose-built for the INTERNAL
 * salesperson-facing follow-up reminder.
 */
class FollowUpReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string  $leadName,
        public readonly string  $leadMobile,
        public readonly string  $businessName,
        public readonly string  $dueAt,
        public readonly ?string $note = null,
        public readonly ?string $leadId = null,
        public readonly ?string $appUrl = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "⏰ Follow-up Due: {$this->leadName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.followup-reminder',
        );
    }
}
