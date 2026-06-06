<?php

namespace App\Modules\Reports\Jobs;

use App\Mail\DailyDigestMail;
use App\Models\Business;
use App\Modules\WhatsApp\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendDailyDigest implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $businesses = DB::table('businesses')
            ->where('is_active', true)
            ->get();

        foreach ($businesses as $business) {
            try {
                $this->sendDigestForBusiness($business);
            } catch (\Throwable $e) {
                Log::error('DailyDigest failed for business ' . $business->id, [
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    private function sendDigestForBusiness(object $business): void
    {
        // Find the owner of this business
        $owner = DB::table('users')
            ->where('business_id', $business->id)
            ->whereRaw('id::text IN (SELECT model_id FROM model_has_roles WHERE role_id IN (SELECT id FROM roles WHERE name = ?))', ['owner'])
            ->select('id', 'name', 'email', 'phone')
            ->first();

        if (!$owner || !$owner->email) {
            Log::warning('DailyDigest: no owner found for business ' . $business->id);
            return;
        }

        $now        = now()->setTimezone($business->timezone ?? 'Asia/Kolkata');
        $todayStart = $now->copy()->startOfDay();
        $weekStart  = $now->copy()->startOfWeek();
        $monthStart = $now->copy()->startOfMonth();

        // Compute stats
        $totalToday = DB::table('leads')
            ->where('business_id', $business->id)
            ->where('created_at', '>=', $todayStart)
            ->count();

        $totalWeek = DB::table('leads')
            ->where('business_id', $business->id)
            ->where('created_at', '>=', $weekStart)
            ->count();

        $totalMonth = DB::table('leads')
            ->where('business_id', $business->id)
            ->where('created_at', '>=', $monthStart)
            ->count();

        $totalAll = DB::table('leads')
            ->where('business_id', $business->id)
            ->count();

        $converted = DB::table('leads')
            ->where('business_id', $business->id)
            ->whereNotNull('converted_at')
            ->count();

        $conversionRate = $totalAll > 0
            ? round(($converted / $totalAll) * 100, 1)
            : 0;

        $overdueFollowups = DB::table('lead_followups')
            ->where('business_id', $business->id)
            ->where('status', 'pending')
            ->where('follow_up_at', '<', now())
            ->count();

        $byBranch = DB::table('leads')
            ->where('leads.business_id', $business->id)
            ->leftJoin('branches', 'leads.branch_id', '=', 'branches.id')
            ->select('branches.name as branch', DB::raw('count(*) as total'))
            ->groupBy('branches.name')
            ->orderByDesc('total')
            ->get()
            ->map(fn($r) => ['branch' => $r->branch ?? 'No Branch', 'total' => (int) $r->total])
            ->toArray();

        $bySource = DB::table('leads')
            ->where('business_id', $business->id)
            ->select('source', DB::raw('count(*) as total'))
            ->groupBy('source')
            ->orderByDesc('total')
            ->limit(6)
            ->get()
            ->map(fn($r) => ['source' => $r->source, 'total' => (int) $r->total])
            ->toArray();

        $byStatus = DB::table('leads')
            ->where('leads.business_id', $business->id)
            ->leftJoin('lead_statuses', 'leads.lead_status_id', '=', 'lead_statuses.id')
            ->select('lead_statuses.name as status', DB::raw('count(*) as total'))
            ->groupBy('lead_statuses.name')
            ->orderByDesc('total')
            ->get()
            ->map(fn($r) => ['status' => $r->status ?? 'Unassigned', 'total' => (int) $r->total])
            ->toArray();

        // 1. Send email digest
        Mail::to($owner->email)->send(new DailyDigestMail(
            businessName:     $business->name,
            ownerName:        $owner->name,
            date:             $now->format('d M Y'),
            totalToday:       $totalToday,
            totalWeek:        $totalWeek,
            totalMonth:       $totalMonth,
            totalAll:         $totalAll,
            overdueFollowups: $overdueFollowups,
            converted:        $converted,
            conversionRate:   $conversionRate,
            bySource:         $bySource,
            byStatus:         $byStatus,
            byBranch:         $byBranch,
        ));

        Log::info('DailyDigest email sent to ' . $owner->email . ' for business ' . $business->name);

        // 2. Send WhatsApp digest to owner (if phone set + template approved)
        if ($owner->phone) {
            try {
                $businessModel = Business::find($business->id);
                if ($businessModel) {
                    $waService = new WhatsAppService();
                    $waService->sendTemplate(
                        $businessModel,
                        $owner->phone,
                        'daily_digest',
                        [
                            $business->name,
                            (string) $totalToday,
                            (string) $totalWeek,
                            (string) $overdueFollowups,
                            (string) $conversionRate,
                        ]
                    );
                    Log::info('DailyDigest WhatsApp sent to ' . $owner->phone . ' for business ' . $business->name);
                }
            } catch (\Throwable $e) {
                Log::error('DailyDigest WhatsApp failed for business ' . $business->id, [
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
}