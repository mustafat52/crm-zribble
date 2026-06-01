<?php

namespace App\Modules\Notifications\Jobs;

use App\Models\InAppNotification;
use App\Modules\Leads\Models\LeadFollowup;
use App\Modules\Notifications\Services\WebPushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendFollowUpReminders implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct()
    {
        $this->onQueue('reminders');
    }

    public function handle(): void
    {
        // Find all pending follow-ups due within the next 30 minutes
        // that haven't been reminded yet. This job runs every 15 min
        // via the scheduler in routes/console.php.
        $dueFollowups = LeadFollowup::with(['lead'])
            ->where('status', 'pending')
            ->where('follow_up_at', '<=', now()->addMinutes(30))
            ->whereNull('reminded_at')
            ->get();

        foreach ($dueFollowups as $followup) {
            try {
                $lead = $followup->lead;

                if (!$lead) {
                    Log::warning("SendFollowUpReminders: lead not found for followup {$followup->id}");
                    continue;
                }

                // ── Find recipient: assigned user or fall back to owner ────────
                // Uses DB::table to bypass Eloquent global scopes (Business/Branch).
                // Matches pattern used in NotifyOwnerOfNewLead and SendDailyDigest.
                $recipient = null;

                if ($followup->assigned_to) {
                    $recipient = DB::table('users')
                        ->where('id', $followup->assigned_to)
                        ->where('is_active', true)
                        ->select(['id', 'name', 'email'])
                        ->first();
                }

                if (!$recipient) {
                    // No assigned user — notify the business owner
                    $recipient = DB::table('users')
                        ->whereRaw(
                            "id::text IN (
                                SELECT model_id FROM model_has_roles
                                WHERE role_id IN (
                                    SELECT id FROM roles WHERE name = 'owner' AND guard_name = 'sanctum'
                                )
                            )"
                        )
                        ->where('business_id', $lead->business_id)
                        ->where('is_active', true)
                        ->select(['id', 'name', 'email'])
                        ->first();
                }

                if (!$recipient) {
                    Log::warning("SendFollowUpReminders: no recipient for followup {$followup->id}, lead {$lead->id}");
                    $followup->update(['reminded_at' => now()]); // mark to avoid retry spam
                    continue;
                }

                $title   = "Follow-Up Due: {$lead->name}";
                $body    = $followup->note
                    ? "📝 {$followup->note}"
                    : "Scheduled for " . \Carbon\Carbon::parse($followup->follow_up_at)->format('h:i A');
                $leadUrl = "/leads/{$lead->id}";

                // ── 1. In-app notification ──────────────────────────────────
                InAppNotification::create([
                    'user_id'     => $recipient->id,
                    'business_id' => $lead->business_id,
                    'type'        => 'follow_up_due',
                    'title'       => $title,
                    'message'     => $body,
                    'url'         => $leadUrl,
                ]);

                // ── 2. Email notification ───────────────────────────────────
                // Uses a simple inline Mailable (no dedicated class needed).
                // The business already gets a rich daily digest — this is
                // just a plain alert to the individual salesperson.
                try {
                    Mail::raw(
                        "Hi {$recipient->name},\n\nYou have a follow-up due:\n\n"
                        . "Lead: {$lead->name}\n"
                        . "Phone: {$lead->mobile}\n"
                        . ($followup->note ? "Note: {$followup->note}\n" : '')
                        . "\nOpen lead: " . config('app.frontend_url', 'http://localhost:3000') . $leadUrl,
                        function ($message) use ($recipient, $title) {
                            $message->to($recipient->email)
                                    ->subject("⏰ {$title}");
                        }
                    );
                } catch (\Throwable $mailError) {
                    // Email failure must not stop the push notification
                    Log::warning("SendFollowUpReminders: email failed for {$recipient->email}: {$mailError->getMessage()}");
                }

                // ── 3. Push notification (T40) ──────────────────────────────
                // sendToUser() is fully exception-safe — never throws.
                WebPushService::sendToUser(
                    userId: $recipient->id,
                    title:  $title,
                    body:   $body,
                    url:    $leadUrl,
                );

                // ── Mark reminded — prevents duplicate sends ─────────────────
                $followup->update(['reminded_at' => now()]);

                Log::info("SendFollowUpReminders: reminded {$recipient->email} for lead {$lead->id}");

            } catch (\Throwable $e) {
                Log::error("SendFollowUpReminders: failed for followup {$followup->id}: {$e->getMessage()}", [
                    'followup_id' => $followup->id,
                ]);
            }
        }
    }
}