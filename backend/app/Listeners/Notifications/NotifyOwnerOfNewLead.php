<?php

namespace App\Listeners\Notifications;

use App\Events\Leads\LeadCreated;
use App\Models\InAppNotification;
use App\Modules\Notifications\Services\WebPushService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotifyOwnerOfNewLead implements ShouldQueue
{
    use InteractsWithQueue;

    public function __construct()
    {
        $this->onQueue('notifications');
    }

    public function handle(LeadCreated $event): void
    {
        $lead = $event->lead;

        // ── Find the business owner ───────────────────────────────────────────
        // Matches the exact pattern used in SendDailyDigest.php (T35) so the
        // owner-lookup SQL is consistent across the entire codebase.
        // Uses DB::table (not Eloquent) to bypass BusinessScope + BranchScope.
        $owner = DB::table('users')
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

        if (!$owner) {
            Log::warning("NotifyOwnerOfNewLead: no active owner found for business {$lead->business_id}");
            return;
        }

        $title   = "New Lead: {$lead->name}";
        $body    = "📱 {$lead->mobile}" . ($lead->source ? " · via {$lead->source}" : '');
        $leadUrl = "/leads/{$lead->id}";

        // ── 1. In-app notification (T29 bell) ─────────────────────────────────
        try {
            InAppNotification::create([
                'user_id'     => $owner->id,
                'business_id' => $lead->business_id,
                'type'        => 'new_lead',
                'title'       => $title,
                'message'     => $body,
                'url'         => $leadUrl,
            ]);
        } catch (\Throwable $e) {
            Log::error("NotifyOwnerOfNewLead: in-app create failed: {$e->getMessage()}", [
                'lead_id' => $lead->id,
            ]);
        }

        // ── 2. Push notification (T40) ────────────────────────────────────────
        // sendToUser() is fully exception-safe. If owner has no push
        // subscriptions it returns silently — never throws.
        WebPushService::sendToUser(
            userId: $owner->id,
            title:  $title,
            body:   $body,
            url:    $leadUrl,
        );
    }
}