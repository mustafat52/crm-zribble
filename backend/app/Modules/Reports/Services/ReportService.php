<?php

namespace App\Modules\Reports\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ReportService
{
    /**
     * Dashboard stats — cached in Redis for 5 minutes per business.
     * Cache is keyed by business_id so businesses never see each other's data.
     */
    public function dashboardStats(): array
    {
        $businessId = Auth::user()->business_id;
        $cacheKey   = "dashboard_stats:{$businessId}";

        return Cache::remember($cacheKey, 300, function () use ($businessId) {
            return $this->computeDashboardStats($businessId);
        });
    }

    private function computeDashboardStats(string $businessId): array
    {
        $now       = now();
        $todayStart = $now->copy()->startOfDay();
        $weekStart  = $now->copy()->startOfWeek();
        $monthStart = $now->copy()->startOfMonth();

        // ── Total lead counts ────────────────────────────────────────────
        $totalAll   = DB::table('leads')->where('business_id', $businessId)->count();
        $totalToday = DB::table('leads')->where('business_id', $businessId)
            ->where('created_at', '>=', $todayStart)->count();
        $totalWeek  = DB::table('leads')->where('business_id', $businessId)
            ->where('created_at', '>=', $weekStart)->count();
        $totalMonth = DB::table('leads')->where('business_id', $businessId)
            ->where('created_at', '>=', $monthStart)->count();

        // ── Converted leads (has converted_at set) ───────────────────────
        $converted = DB::table('leads')->where('business_id', $businessId)
            ->whereNotNull('converted_at')->count();
        $conversionRate = $totalAll > 0
            ? round(($converted / $totalAll) * 100, 1)
            : 0;

        // ── Leads by source (top 6) ──────────────────────────────────────
        $bySource = DB::table('leads')
            ->where('business_id', $businessId)
            ->select('source', DB::raw('count(*) as total'))
            ->groupBy('source')
            ->orderByDesc('total')
            ->limit(6)
            ->get()
            ->map(fn($r) => ['source' => $r->source, 'total' => (int) $r->total]);

        // ── Leads by status ──────────────────────────────────────────────
        $byStatus = DB::table('leads')
            ->where('leads.business_id', $businessId)
            ->leftJoin('lead_statuses', 'leads.lead_status_id', '=', 'lead_statuses.id')
            ->select(
                'lead_statuses.name as status',
                'lead_statuses.color as color',
                DB::raw('count(*) as total')
            )
            ->groupBy('lead_statuses.name', 'lead_statuses.color')
            ->orderByDesc('total')
            ->get()
            ->map(fn($r) => [
                'status' => $r->status ?? 'Unassigned',
                'color'  => $r->color  ?? '#6b7280',
                'total'  => (int) $r->total,
            ]);

        // ── Overdue follow-ups ───────────────────────────────────────────
        $overdueCount = DB::table('lead_followups')
            ->where('business_id', $businessId)
            ->where('status', 'pending')
            ->where('follow_up_at', '<', $now)
            ->count();

        // ── Leads added last 7 days (for sparkline) ──────────────────────
        $last7Days = collect(range(6, 0))->map(function ($daysAgo) use ($businessId) {
            $date = now()->subDays($daysAgo)->toDateString();
            $count = DB::table('leads')
                ->where('business_id', $businessId)
                ->whereDate('created_at', $date)
                ->count();
            return [
                'date'  => now()->subDays($daysAgo)->format('D'),
                'total' => (int) $count,
            ];
        });

        return [
            'totals' => [
                'all'     => $totalAll,
                'today'   => $totalToday,
                'week'    => $totalWeek,
                'month'   => $totalMonth,
                'converted'       => $converted,
                'conversion_rate' => $conversionRate,
                'overdue_followups' => $overdueCount,
            ],
            'by_source' => $bySource,
            'by_status' => $byStatus,
            'last_7_days' => $last7Days,
        ];
    }

    /**
     * Invalidate dashboard cache for a business.
     * Call this whenever a lead is created/updated.
     */
    public static function invalidateCache(string $businessId): void
    {
        Cache::forget("dashboard_stats:{$businessId}");
    }
}