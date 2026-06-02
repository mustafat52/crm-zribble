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
     *
     * Logic:
     *  - For each business, read settings.stale_lead_days (default 3).
     *  - Find leads where last_contacted_at < now - stale_lead_days
     *    AND status is not terminal/converted/lost.
     *  - Skip leads that were already nudged in the last 24 hours
     *    (checked via automation_logs) to prevent spam on re-runs.
     *  - Email the assigned salesperson (or owner as fallback).
     */
    public function runStaleLeadNudges(): void
    {
        $appUrl = rtrim(config('app.url'), '/');

        // Fetch all active businesses with their settings and owner emails
        $businesses = DB::table('businesses')
            ->where('is_active', true)
            ->get(['id', 'name', 'settings']);

        foreach ($businesses as $business) {
            try {
                $settings    = json_decode($business->settings ?? '{}', true) ?? [];
                $staleDays   = (int) ($settings['stale_lead_days'] ?? 3);

                // stale_lead_days = 0 means automation is disabled for this business
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
        // Get terminal/converted/lost status IDs for this business
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

        // Find stale leads: last_contacted_at older than cutoff (or never contacted
        // and created_at older than cutoff), not in a terminal status
        $staleLeads = DB::table('leads')
            ->leftJoin('users', 'users.id', '=', 'leads.assigned_to')
            ->where('leads.business_id', $businessId)
            ->where(function ($q) use ($cutoff) {
                // Either contacted before the cutoff, or never contacted and old enough
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
            ->limit(100) // safety cap per run per business
            ->get();

        if ($staleLeads->isEmpty()) {
            return;
        }

        // Collect lead IDs already nudged in the past 24 hours to avoid re-spam
        $recentlyNudged = DB::table('automation_logs')
            ->where('business_id', $businessId)
            ->where('automation_type', 'stale_lead_nudge')
            ->where('status', 'sent')
            ->where('created_at', '>=', now()->subHours(24)->toDateTimeString())
            ->pluck('lead_id')
            ->flip() // convert to keyed map for fast O(1) lookup
            ->toArray();

        // Get the business owner email as fallback
        $ownerEmail = $this->getOwnerEmail($businessId);

        foreach ($staleLeads as $lead) {
            // Skip if already nudged recently
            if (isset($recentlyNudged[$lead->id])) {
                continue;
            }

            // Determine recipient: assigned salesperson → owner fallback
            $recipientEmail = $lead->assigned_email ?? $ownerEmail;

            if (!$recipientEmail) {
                Log::warning('[AutomationService] No recipient email for stale lead', [
                    'lead_id' => $lead->id,
                ]);
                continue;
            }

            // Compute days since last activity
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
                'lead_id'    => $lead->id,
                'recipient'  => $recipientEmail,
                'error'      => $e->getMessage(),
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
     * Called from SendFollowUpReminders job after the salesperson reminder fires.
     * Only sends if:
     *  - The lead has an email address
     *  - The business has not already sent this customer a follow-up email
     *    for this specific follow-up row (checked by followup_id in metadata)
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
        // Idempotency: skip if already sent for this followup row
        $alreadySent = DB::table('automation_logs')
            ->where('business_id', $businessId)
            ->where('automation_type', 'followup_customer_email')
            ->where('status', 'sent')
            ->whereRaw("metadata->>'followup_id' = ?", [$followupId])
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
     * Uses the same UUID-safe pattern established in NotifyOwnerOfNewLead.
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