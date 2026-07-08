<?php

namespace App\Modules\Automations\Services;

use App\Models\AutomationLog;
use App\Mail\StaleLeadNudgeMail;
use App\Mail\FollowUpCustomerMail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class AutomationService
{
    /**
     * Run the stale lead nudge automation for ALL active businesses.
     *
     * Called by SendStaleLeadNudges job (daily cron at 9 AM).
     */
    public function runStaleLeadNudges(): void
    {
        $appUrl = rtrim(config('app.url'), '/');

        $businesses = DB::table('businesses')
            ->where('is_active', true)
            ->get(['id', 'name', 'settings']);

        foreach ($businesses as $business) {
            try {
                $settings  = json_decode($business->settings ?? '{}', true) ?? [];
                $staleDays = (int) ($settings['stale_lead_days'] ?? 3);

                if ($staleDays <= 0) {
                    continue;
                }

                $this->nudgeStaleLeadsForBusiness(
                    businessId:   $business->id,
                    businessName: $business->name,
                    staleDays:    $staleDays,
                    appUrl:       $appUrl,
                );
            } catch (\Throwable $e) {
                Log::error('[AutomationService] stale nudge failed for business', [
                    'business_id' => $business->id,
                    'error'       => $e->getMessage(),
                ]);
            }
        }
    }

    /**
     * Process stale leads for a single business.
     */
    private function nudgeStaleLeadsForBusiness(
        string $businessId,
        string $businessName,
        int    $staleDays,
        string $appUrl,
    ): void {
        $excludedStatusIds = DB::table('lead_statuses')
            ->where('business_id', $businessId)
            ->where(function ($q) {
                $q->where('is_terminal', true)
                  ->orWhere('is_converted', true)
                  ->orWhere('is_lost', true);
            })
            ->pluck('id')
            ->toArray();

        $cutoff = now()->subDays($staleDays)->toDateTimeString();

        // T89 FIX: Add ORDER BY so the most-neglected leads (oldest last_contacted_at)
        // are prioritised. Without ORDER BY the database returns rows in an unspecified
        // but consistent order — the same 100 leads are processed every day while leads
        // beyond position 100 are never nudged regardless of how stale they become.
        $staleLeads = DB::table('leads')
            ->leftJoin('users', 'users.id', '=', 'leads.assigned_to')
            ->where('leads.business_id', $businessId)
            ->where(function ($q) use ($cutoff) {
                $q->where('leads.last_contacted_at', '<', $cutoff)
                  ->orWhere(function ($q2) use ($cutoff) {
                      $q2->whereNull('leads.last_contacted_at')
                         ->where('leads.created_at', '<', $cutoff);
                  });
            })
            ->when(!empty($excludedStatusIds), function ($q) use ($excludedStatusIds) {
                $q->whereNotIn('leads.lead_status_id', $excludedStatusIds);
            })
            ->select([
                'leads.id',
                'leads.name',
                'leads.mobile',
                'leads.source',
                'leads.assigned_to',
                'leads.last_contacted_at',
                'leads.created_at',
                'users.email as assigned_email',
                'users.name as assigned_name',
            ])
            ->orderByRaw('COALESCE(leads.last_contacted_at, leads.created_at) ASC')
            ->limit(100)
            ->get();

        if ($staleLeads->isEmpty()) {
            return;
        }

        $recentlyNudged = DB::table('automation_logs')
            ->where('business_id', $businessId)
            ->where('automation_type', 'stale_lead_nudge')
            ->where('status', 'sent')
            ->where('created_at', '>=', now()->subHours(24)->toDateTimeString())
            ->pluck('lead_id')
            ->flip()
            ->toArray();

        $ownerEmail = $this->getOwnerEmail($businessId);

        foreach ($staleLeads as $lead) {
            if (isset($recentlyNudged[$lead->id])) {
                continue;
            }

            $recipientEmail = $lead->assigned_email ?? $ownerEmail;

            if (!$recipientEmail) {
                Log::warning('[AutomationService] No recipient email for stale lead', [
                    'lead_id' => $lead->id,
                ]);
                continue;
            }

            $lastActivity = $lead->last_contacted_at ?? $lead->created_at;
            $daysSince    = (int) now()->diffInDays($lastActivity);

            $this->sendStaleNudgeEmail(
                recipientEmail: $recipientEmail,
                lead:           $lead,
                daysSince:      $daysSince,
                businessId:     $businessId,
                businessName:   $businessName,
                appUrl:         $appUrl,
            );
        }
    }

    /**
     * Send a single stale lead nudge email and log the result.
     */
    private function sendStaleNudgeEmail(
        string $recipientEmail,
        object $lead,
        int    $daysSince,
        string $businessId,
        string $businessName,
        string $appUrl,
    ): void {
        try {
            Mail::to($recipientEmail)->send(new StaleLeadNudgeMail(
                leadName:          $lead->name,
                leadMobile:        $lead->mobile,
                leadSource:        $lead->source ?? '',
                leadId:            $lead->id,
                daysSinceActivity: $daysSince,
                businessName:      $businessName,
                appUrl:            $appUrl,
            ));

            AutomationLog::create([
                'business_id'      => $businessId,
                'lead_id'          => $lead->id,
                'user_id'          => $lead->assigned_to,
                'automation_type'  => 'stale_lead_nudge',
                'channel'          => 'email',
                'recipient_email'  => $recipientEmail,
                'status'           => 'sent',
                'metadata'         => ['days_since_activity' => $daysSince],
            ]);
        } catch (\Throwable $e) {
            Log::error('[AutomationService] Failed to send stale nudge email', [
                'lead_id'   => $lead->id,
                'recipient' => $recipientEmail,
                'error'     => $e->getMessage(),
            ]);

            AutomationLog::create([
                'business_id'      => $businessId,
                'lead_id'          => $lead->id,
                'user_id'          => $lead->assigned_to,
                'automation_type'  => 'stale_lead_nudge',
                'channel'          => 'email',
                'recipient_email'  => $recipientEmail,
                'status'           => 'failed',
                'error_message'    => $e->getMessage(),
                'metadata'         => ['days_since_activity' => $daysSince],
            ]);
        }
    }

    /**
     * Send the follow-up notification email to a CUSTOMER.
     *
     * Called from SendFollowUpReminders job.
     */
    public function sendFollowUpCustomerEmail(
        string  $followupId,
        string  $businessId,
        string  $businessName,
        string  $customerName,
        string  $customerEmail,
        ?string $note,
        string  $appUrl,
    ): void {
        // T68 FIX: Replace PostgreSQL-only `metadata->>'followup_id'` JSON operator
        // with JSON_UNQUOTE(JSON_EXTRACT(...)) which works on MySQL 5.7.9+.
        // The original operator caused a syntax error on MySQL, breaking the idempotency
        // check entirely — every follow-up would send duplicate customer emails.
        $alreadySent = DB::table('automation_logs')
            ->where('business_id', $businessId)
            ->where('automation_type', 'followup_customer_email')
            ->where('status', 'sent')
            ->whereRaw("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.followup_id')) = ?", [$followupId])
            ->exists();

        if ($alreadySent) {
            return;
        }

        try {
            Mail::to($customerEmail)->send(new FollowUpCustomerMail(
                customerName: $customerName,
                businessName: $businessName,
                note:         $note,
                appUrl:       $appUrl,
            ));

            AutomationLog::create([
                'business_id'     => $businessId,
                'automation_type' => 'followup_customer_email',
                'channel'         => 'email',
                'recipient_email' => $customerEmail,
                'status'          => 'sent',
                'metadata'        => ['followup_id' => $followupId],
            ]);
        } catch (\Throwable $e) {
            Log::error('[AutomationService] Failed to send follow-up customer email', [
                'followup_id' => $followupId,
                'customer'    => $customerEmail,
                'error'       => $e->getMessage(),
            ]);

            AutomationLog::create([
                'business_id'     => $businessId,
                'automation_type' => 'followup_customer_email',
                'channel'         => 'email',
                'recipient_email' => $customerEmail,
                'status'          => 'failed',
                'error_message'   => $e->getMessage(),
                'metadata'        => ['followup_id' => $followupId],
            ]);
        }
    }

    /**
     * Get the owner email for a business.
     * Uses the same UUID-safe pattern established throughout the codebase.
     */
    private function getOwnerEmail(string $businessId): ?string
    {
        $ownerRoleId = DB::table('roles')
            ->where('name', 'owner')
            ->where('guard_name', 'sanctum')
            ->value('id');

        if (!$ownerRoleId) {
            return null;
        }

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
}
