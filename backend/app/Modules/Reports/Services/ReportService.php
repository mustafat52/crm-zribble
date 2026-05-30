<?php

namespace App\Modules\Reports\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Models\Lead;

class ReportService
{
    // ── Dashboard stats (Redis cached 5 min) ───────────────────────────────

    public function dashboardStats(): array
    {
        $businessId = Auth::user()->business_id;
        $cacheKey   = "dashboard_stats:{$businessId}";

        return Cache::remember($cacheKey, 300, fn () => $this->computeDashboardStats($businessId));
    }

    public static function invalidateCache(string $businessId): void
    {
        Cache::forget("dashboard_stats:{$businessId}");
    }

    private function computeDashboardStats(string $businessId): array
    {
        $base = Lead::withoutGlobalScopes()
            ->where('leads.business_id', $businessId);

        $total     = (clone $base)->count();
        $today     = (clone $base)->whereDate('leads.created_at', today())->count();
        $thisWeek  = (clone $base)->whereBetween('leads.created_at', [now()->startOfWeek(), now()->endOfWeek()])->count();
        $thisMonth = (clone $base)->whereMonth('leads.created_at', now()->month)
                                  ->whereYear('leads.created_at', now()->year)->count();

        $converted     = (clone $base)->whereNotNull('leads.converted_at')->count();
        $conversionRate = $total > 0 ? round(($converted / $total) * 100, 1) : 0;

        $bySource = (clone $base)
            ->select('leads.source', DB::raw('count(*) as total'))
            ->groupBy('leads.source')
            ->orderByDesc('total')
            ->limit(6)
            ->get()
            ->map(fn ($r) => ['source' => $r->source ?: 'Unknown', 'total' => (int) $r->total])
            ->toArray();

        $byStatus = (clone $base)
            ->join('lead_statuses', 'leads.lead_status_id', '=', 'lead_statuses.id')
            ->select('lead_statuses.name', 'lead_statuses.color', DB::raw('count(*) as total'))
            ->groupBy('lead_statuses.name', 'lead_statuses.color')
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'color' => $r->color, 'total' => (int) $r->total])
            ->toArray();

        $overdue = DB::table('lead_followups')
            ->where('business_id', $businessId)
            ->where('status', 'pending')
            ->where('follow_up_at', '<', now())
            ->count();

        $last7 = collect(range(6, 0))->map(function ($daysAgo) use ($base, $businessId) {
            $date = now()->subDays($daysAgo);
            $count = (clone $base)->whereDate('leads.created_at', $date)->count();
            return ['day' => $date->format('D'), 'date' => $date->toDateString(), 'total' => $count];
        })->toArray();

        return compact('total', 'today', 'thisWeek', 'thisMonth', 'converted', 'conversionRate', 'bySource', 'byStatus', 'overdue', 'last7');
    }

    // ── Leads report ───────────────────────────────────────────────────────

    public function leadsReport(array $filters): array
    {
        $businessId = Auth::user()->business_id;
        $user       = Auth::user();

        $query = Lead::withoutGlobalScopes()
            ->where('leads.business_id', $businessId)
            ->join('lead_statuses', 'leads.lead_status_id', '=', 'lead_statuses.id')
            ->leftJoin('users as assignee', 'leads.assigned_to', '=', 'assignee.id')
            ->leftJoin('branches', 'leads.branch_id', '=', 'branches.id')
            ->select(
                'leads.id', 'leads.name', 'leads.mobile', 'leads.email',
                'leads.source', 'leads.created_at', 'leads.lead_value',
                'leads.converted_at', 'leads.next_followup_at',
                'lead_statuses.name as status_name', 'lead_statuses.color as status_color',
                'assignee.name as assignee_name',
                'branches.name as branch_name'
            );

        // Branch scope for non-owners
        if ($user->branch_id) {
            $query->where('leads.branch_id', $user->branch_id);
        }

        if (!empty($filters['date_from'])) {
            $query->whereDate('leads.created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('leads.created_at', '<=', $filters['date_to']);
        }
        if (!empty($filters['source'])) {
            $query->where('leads.source', $filters['source']);
        }
        if (!empty($filters['status_id'])) {
            $query->where('leads.lead_status_id', $filters['status_id']);
        }
        if (!empty($filters['branch_id'])) {
            $query->where('leads.branch_id', $filters['branch_id']);
        }
        if (!empty($filters['assigned_to'])) {
            $query->where('leads.assigned_to', $filters['assigned_to']);
        }

        $leads = $query->orderByDesc('leads.created_at')->limit(500)->get();

        // Summary counts
        $total     = $leads->count();
        $converted = $leads->whereNotNull('converted_at')->count();
        $rate      = $total > 0 ? round(($converted / $total) * 100, 1) : 0;

        return [
            'leads'          => $leads->toArray(),
            'total'          => $total,
            'converted'      => $converted,
            'conversion_rate' => $rate,
        ];
    }

    // ── Team report ────────────────────────────────────────────────────────

    public function teamReport(array $filters): array
    {
        $businessId = Auth::user()->business_id;
        $user       = Auth::user();

        $query = DB::table('users')
            ->where('users.business_id', $businessId)
            ->where('users.is_active', true)
            ->leftJoin('branches', 'users.branch_id', '=', 'branches.id')
            ->select(
                'users.id', 'users.name', 'users.email',
                'branches.name as branch_name'
            );

        if ($user->branch_id) {
            $query->where('users.branch_id', $user->branch_id);
        }
        if (!empty($filters['branch_id'])) {
            $query->where('users.branch_id', $filters['branch_id']);
        }

        $users = $query->get();

        $members = $users->map(function ($member) use ($businessId, $filters) {
            $leadQuery = Lead::withoutGlobalScopes()
                ->where('leads.business_id', $businessId)
                ->where('leads.assigned_to', $member->id);

            if (!empty($filters['date_from'])) {
                $leadQuery->whereDate('leads.created_at', '>=', $filters['date_from']);
            }
            if (!empty($filters['date_to'])) {
                $leadQuery->whereDate('leads.created_at', '<=', $filters['date_to']);
            }

            $assigned  = (clone $leadQuery)->count();
            $converted = (clone $leadQuery)->whereNotNull('leads.converted_at')->count();
            $rate      = $assigned > 0 ? round(($converted / $assigned) * 100, 1) : 0;

            $followupsDone = DB::table('lead_followups')
                ->where('business_id', $businessId)
                ->where('assigned_to', $member->id)
                ->where('status', 'done')
                ->when(!empty($filters['date_from']), fn ($q) => $q->whereDate('follow_up_at', '>=', $filters['date_from']))
                ->when(!empty($filters['date_to']),   fn ($q) => $q->whereDate('follow_up_at', '<=', $filters['date_to']))
                ->count();

            $followupsTotal = DB::table('lead_followups')
                ->where('business_id', $businessId)
                ->where('assigned_to', $member->id)
                ->when(!empty($filters['date_from']), fn ($q) => $q->whereDate('follow_up_at', '>=', $filters['date_from']))
                ->when(!empty($filters['date_to']),   fn ($q) => $q->whereDate('follow_up_at', '<=', $filters['date_to']))
                ->count();

            $followupPct = $followupsTotal > 0 ? round(($followupsDone / $followupsTotal) * 100, 1) : 0;

            return [
                'id'             => $member->id,
                'name'           => $member->name,
                'email'          => $member->email,
                'branch_name'    => $member->branch_name ?? '—',
                'assigned'       => $assigned,
                'converted'      => $converted,
                'conversion_rate' => $rate,
                'followups_done' => $followupsDone,
                'followup_pct'   => $followupPct,
            ];
        });

        return ['members' => $members->toArray()];
    }

    // ── Sources report ─────────────────────────────────────────────────────

    public function sourcesReport(array $filters): array
    {
        $businessId = Auth::user()->business_id;
        $user       = Auth::user();

        $query = Lead::withoutGlobalScopes()
            ->where('leads.business_id', $businessId)
            ->select(
                'leads.source',
                DB::raw('count(*) as total'),
                DB::raw('count(leads.converted_at) as converted')
            )
            ->groupBy('leads.source')
            ->orderByDesc('total');

        if ($user->branch_id) {
            $query->where('leads.branch_id', $user->branch_id);
        }
        if (!empty($filters['date_from'])) {
            $query->whereDate('leads.created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('leads.created_at', '<=', $filters['date_to']);
        }
        if (!empty($filters['branch_id'])) {
            $query->where('leads.branch_id', $filters['branch_id']);
        }

        $rows = $query->get()->map(function ($r) {
            $rate = $r->total > 0 ? round(($r->converted / $r->total) * 100, 1) : 0;
            return [
                'source'          => $r->source ?: 'Unknown',
                'total'           => (int) $r->total,
                'converted'       => (int) $r->converted,
                'conversion_rate' => $rate,
            ];
        });

        return ['sources' => $rows->toArray()];
    }
}