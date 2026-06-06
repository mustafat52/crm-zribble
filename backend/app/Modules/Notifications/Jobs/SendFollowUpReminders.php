<?php

namespace App\Modules\Notifications\Jobs;

use App\Models\AutomationLog;
use App\Models\Business;
use App\Modules\Automations\Services\AutomationService;
use App\Modules\Notifications\Models\InAppNotification;
use App\Modules\WhatsApp\Services\WhatsAppService;
use App\Mail\LeadCreatedMail;
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

    /**
     * Runs every 15 minutes via Laravel Scheduler.
     *
     * For each due follow-up:
     *  1. Sends in-app notification to salesperson
     *  2. Sends reminder email to salesperson
     *  3. Sends WhatsApp reminder to salesperson (TWA5-D)
     *  4. Sends courtesy email to customer if lead has email (T41)
     */
    public function handle(): void
    {
        $appUrl = rtrim(config('app.url'), '/');

        $dueFollowups = DB::table('lead_followups')
            ->join('leads', 'leads.id', '=', 'lead_followups.lead_id')
            ->join('businesses', 'businesses.id', '=', 'lead_followups.business_id')
            ->leftJoin('users', 'users.id', '=', 'lead_followups.assigned_to')
            ->where('lead_followups.status', 'pending')
            ->where('lead_followups.follow_up_at', '<=', now()->addMinutes(30))
            ->whereNull('lead_followups.reminded_at')
            ->select([
                'lead_followups.id as followup_id',
                'lead_followups.follow_up_at',
                'lead_followups.note',
                'lead_followups.assigned_to',
                'lead_followups.business_id',
                'leads.id as lead_id',
                'leads.name as lead_name',
                'leads.mobile as lead_mobile',
                'leads.email as lead_email',
                'businesses.name as business_name',
                'users.email as assigned_email',
                'users.name as assigned_name',
                'users.phone as assigned_phone',
            ])
            ->get();

        foreach ($dueFollowups as $followup) {
            try {
                // ── 1 + 2: Salesperson in-app + email reminder ────────────
                $recipientEmail = $followup->assigned_email
                    ?? $this->getOwnerEmail($followup->business_id);

                if ($recipientEmail) {
                    InAppNotification::create([
                        'business_id' => $followup->business_id,
                        'user_id'     => $followup->assigned_to ?? $this->getOwnerId($followup->business_id),
                        'lead_id'     => $followup->lead_id,
                        'type'        => 'follow_up_due',
                        'title'       => "Follow-up Due: {$followup->lead_name}",
                        'body'        => $followup->note ?? 'Follow-up scheduled for this lead.',
                        'url'         => "/leads/{$followup->lead_id}",
                        'is_read'     => false,
                    ]);

                    Mail::to($recipientEmail)->send(new LeadCreatedMail(
                        leadName:     $followup->lead_name,
                        leadMobile:   $followup->lead_mobile,
                        leadSource:   'follow_up_reminder',
                        businessName: $followup->business_name,
                    ));
                }

                // ── 3: WhatsApp reminder to salesperson (TWA5-D) ─────────
                $recipientPhone = $followup->assigned_phone
                    ?? $this->getOwnerPhone($followup->business_id);

                if ($recipientPhone) {
                    try {
                        $businessModel = Business::find($followup->business_id);
                        if ($businessModel) {
                            $waService = new WhatsAppService();
                            $waService->sendTemplate(
                                $businessModel,
                                $recipientPhone,
                                'followup_reminder',
                                [
                                    $followup->lead_name,
                                    $followup->lead_mobile,
                                    \Carbon\Carbon::parse($followup->follow_up_at)
                                        ->setTimezone($businessModel->timezone ?? 'Asia/Kolkata')
                                        ->format('g:i A, d M'),
                                ],
                                $followup->lead_id
                            );
                        }
                    } catch (\Throwable $e) {
                        Log::error('[SendFollowUpReminders] WhatsApp reminder failed', [
                            'followup_id' => $followup->followup_id,
                            'error'       => $e->getMessage(),
                        ]);
                    }
                }

                // ── 4: Customer courtesy email (T41) ─────────────────────
                if (!empty($followup->lead_email)) {
                    $automationService = app(AutomationService::class);
                    $automationService->sendFollowUpCustomerEmail(
                        followupId:    $followup->followup_id,
                        businessId:    $followup->business_id,
                        businessName:  $followup->business_name,
                        customerName:  $followup->lead_name,
                        customerEmail: $followup->lead_email,
                        note:          $followup->note,
                        appUrl:        $appUrl,
                    );
                }

                DB::table('lead_followups')
                    ->where('id', $followup->followup_id)
                    ->update(['reminded_at' => now()]);

            } catch (\Throwable $e) {
                Log::error('[SendFollowUpReminders] Failed to process follow-up', [
                    'followup_id' => $followup->followup_id,
                    'error'       => $e->getMessage(),
                ]);
            }
        }
    }

    private function getOwnerEmail(string $businessId): ?string
    {
        $ownerRoleId = DB::table('roles')
            ->where('name', 'owner')
            ->where('guard_name', 'sanctum')
            ->value('id');

        if (!$ownerRoleId) return null;

        $ownerIds = DB::table('model_has_roles')
            ->where('role_id', $ownerRoleId)
            ->where('model_type', 'App\\Models\\User')
            ->pluck('model_id');

        return DB::table('users')
            ->where('business_id', $businessId)
            ->whereIn('id', $ownerIds)
            ->where('is_active', true)
            ->value('email');
    }

    private function getOwnerPhone(string $businessId): ?string
    {
        $ownerRoleId = DB::table('roles')
            ->where('name', 'owner')
            ->where('guard_name', 'sanctum')
            ->value('id');

        if (!$ownerRoleId) return null;

        $ownerIds = DB::table('model_has_roles')
            ->where('role_id', $ownerRoleId)
            ->where('model_type', 'App\\Models\\User')
            ->pluck('model_id');

        return DB::table('users')
            ->where('business_id', $businessId)
            ->whereIn('id', $ownerIds)
            ->where('is_active', true)
            ->value('phone');
    }

    private function getOwnerId(string $businessId): ?string
    {
        $ownerRoleId = DB::table('roles')
            ->where('name', 'owner')
            ->where('guard_name', 'sanctum')
            ->value('id');

        if (!$ownerRoleId) return null;

        $ownerIds = DB::table('model_has_roles')
            ->where('role_id', $ownerRoleId)
            ->where('model_type', 'App\\Models\\User')
            ->pluck('model_id');

        return DB::table('users')
            ->where('business_id', $businessId)
            ->whereIn('id', $ownerIds)
            ->where('is_active', true)
            ->value('id');
    }
}