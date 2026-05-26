<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class DailyDigestMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $businessName,
        public readonly string $ownerName,
        public readonly string $date,
        public readonly int    $totalToday,
        public readonly int    $totalWeek,
        public readonly int    $totalMonth,
        public readonly int    $totalAll,
        public readonly int    $overdueFollowups,
        public readonly int    $converted,
        public readonly float  $conversionRate,
        public readonly array  $bySource,
        public readonly array  $byStatus,
        public readonly array  $byBranch,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '📊 Daily Report: ' . $this->businessName . ' — ' . $this->date,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.daily-digest',
        );
    }
}