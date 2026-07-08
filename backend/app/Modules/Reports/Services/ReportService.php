<?php

namespace App\Modules\Reports\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportService
{
    // ─────────────────────────────────────────────
    // DASHBOARD STATS (Redis cached, 5 min TTL)
    // ─────────────────────────────────────────────

    public function dashboardStats(array $filters = []): array
    {
        $user       = Auth::user();
        $businessId = $user->business_id;
        $branchId   = $filters['branch_id'] ?? null;

        $cacheKey = "dashboard_stats:{$businessId}" . ($branchId ? ":{$branchId}" : '');

        return Cache::remember($cacheKey, 300, function () use ($businessId, $branchId, $user) {
            return $this->computeDashboardStats($businessId, $branchId, $user);
        });
    }

    private function computeDashboardStats(string $businessId, ?string $branchId, $user): array
    {
        $now   = Carbon::now();
        $base  = DB::table('leads')->where('leads.business_id', $businessId)->whereNull('leads.deleted_at');

        if ($user->branch_id) {
            $branchId = $user->branch_id;
        }
        if ($branchId) {
            $base = $base->where('leads.branch_id', $branchId);
        }

        $total        = (clone $base)->count();
        $thisMonth    = (clone $base)->whereMonth('leads.created_at', $now->month)->whereYear('leads.created_at', $now->year)->count();
        $today        = (clone $base)->whereDate('leads.created_at', $now->toDateString())->count();

        $convertedIds = DB::table('lead_statuses')
            ->where('business_id', $businessId)
            ->where('is_converted', true)
            ->pluck('id');
        $converted    = (clone $base)->whereIn('leads.lead_status_id', $convertedIds)->count();
        $conversionRate = $total > 0 ? round(($converted / $total) * 100, 1) : 0;

        $terminalIds  = DB::table('lead_statuses')
            ->where('business_id', $businessId)
            ->where(function ($q) {
                $q->where('is_terminal', true)
                  ->orWhere('is_converted', true)
                  ->orWhere('is_lost', true);
            })
            ->pluck('id');
        $activeLeads  = (clone $base)->whereNotIn('leads.lead_status_id', $terminalIds)->count();

        $overdueFollowups = DB::table('lead_followups')
            ->where('business_id', $businessId)
            ->where('status', 'pending')
            ->where('follow_up_at', '<', $now)
            ->when($branchId, fn ($q) => $q->whereIn('lead_id',
                DB::table('leads')->where('branch_id', $branchId)->pluck('id')
            ))
            ->count();

        $followupsDueToday = DB::table('lead_followups')
            ->where('business_id', $businessId)
            ->where('status', 'pending')
            ->whereDate('follow_up_at', $now->toDateString())
            ->where('follow_up_at', '>=', $now)
            ->when($branchId, fn ($q) => $q->whereIn('lead_id',
                DB::table('leads')->where('branch_id', $branchId)->pluck('id')
            ))
            ->count();

        $unassigned = (clone $base)->whereNull('leads.assigned_to')->count();

        $contacted    = (clone $base)->whereNotNull('leads.last_contacted_at')->count();
        $contactRate  = $total > 0 ? round(($contacted / $total) * 100, 1) : 0;

        $bySource = (clone $base)
            ->select('leads.source', DB::raw('count(*) as total'))
            ->groupBy('leads.source')
            ->orderByDesc('total')
            ->limit(8)
            ->get()
            ->map(fn ($r) => ['source' => $r->source ?: 'Unknown', 'total' => $r->total]);

        $byStatus = (clone $base)
            ->join('lead_statuses', 'leads.lead_status_id', '=', 'lead_statuses.id')
            ->select('lead_statuses.name', 'lead_statuses.color', DB::raw('count(*) as total'))
            ->groupBy('lead_statuses.name', 'lead_statuses.color')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'color' => $r->color, 'total' => $r->total]);

        $last7 = [];
        for ($i = 6; $i >= 0; $i--) {
            $day   = $now->copy()->subDays($i);
            $count = (clone $base)->whereDate('leads.created_at', $day->toDateString())->count();
            $last7[] = ['day' => $day->format('D'), 'date' => $day->toDateString(), 'total' => $count];
        }

        $branchBreakdown = [];
        if (!$user->branch_id) {
            $branchBreakdown = DB::table('leads')
                ->leftJoin('branches', 'leads.branch_id', '=', 'branches.id')
                ->where('leads.business_id', $businessId)
                ->whereNull('leads.deleted_at')
                ->select(
                    'branches.name as branch_name',
                    DB::raw('count(*) as leads'),
                    DB::raw("count(case when leads.lead_status_id in (select id from lead_statuses where is_converted = true and business_id = '{$businessId}') then 1 end) as converted")
                )
                ->groupBy('branches.name')
                ->get()
                ->map(function ($r) {
                    $rate = $r->leads > 0 ? round(($r->converted / $r->leads) * 100, 1) : 0;
                    return [
                        'branch'          => $r->branch_name ?? 'No Branch',
                        'leads'           => $r->leads,
                        'converted'       => $r->converted,
                        'conversion_rate' => $rate,
                    ];
                });
        }

        return [
            'total'               => $total,
            'thisMonth'           => $thisMonth,
            'today'               => $today,
            'converted'           => $converted,
            'conversionRate'      => $conversionRate,
            'activeLeads'         => $activeLeads,
            'overdue'             => $overdueFollowups,
            'followupsDueToday'   => $followupsDueToday,
            'unassigned'          => $unassigned,
            'contactRate'         => $contactRate,
            'bySource'            => $bySource,
            'byStatus'            => $byStatus,
            'last7'               => $last7,
            'branchBreakdown'     => $branchBreakdown,
        ];
    }

    public static function invalidateCache(string $businessId): void
    {
        Cache::forget("dashboard_stats:{$businessId}");
        $branches = DB::table('branches')->where('business_id', $businessId)->pluck('id');
        foreach ($branches as $bid) {
            Cache::forget("dashboard_stats:{$businessId}:{$bid}");
        }
    }

    // ─────────────────────────────────────────────
    // ACTION QUEUE (Dashboard main widget)
    // ─────────────────────────────────────────────

    public function actionQueue(array $filters = []): array
    {
        $user       = Auth::user();
        $businessId = $user->business_id;
        $branchId   = $user->branch_id ?? ($filters['branch_id'] ?? null);
        $now        = Carbon::now();

        $overdue = DB::table('lead_followups')
            ->join('leads', 'lead_followups.lead_id', '=', 'leads.id')
            ->leftJoin('users', 'leads.assigned_to', '=', 'users.id')
            ->leftJoin('lead_statuses', 'leads.lead_status_id', '=', 'lead_statuses.id')
            ->where('lead_followups.business_id', $businessId)
            ->where('lead_followups.status', 'pending')
            ->where('lead_followups.follow_up_at', '<', $now)
            ->whereNull('leads.deleted_at')
            ->when($branchId, fn ($q) => $q->where('leads.branch_id', $branchId))
            ->select(
                'lead_followups.id as followup_id',
                'leads.id as lead_id',
                'leads.name as lead_name',
                'leads.mobile',
                'leads.source',
                'lead_statuses.name as status',
                'lead_statuses.color as status_color',
                'users.name as assigned_staff',
                'lead_followups.follow_up_at as due_time',
                'lead_followups.note'
            )
            ->orderBy('lead_followups.follow_up_at')
            ->limit(25)
            ->get()
            ->map(fn ($r) => $this->formatQueueRow($r, 'overdue'));

        $dueToday = DB::table('lead_followups')
            ->join('leads', 'lead_followups.lead_id', '=', 'leads.id')
            ->leftJoin('users', 'leads.assigned_to', '=', 'users.id')
            ->leftJoin('lead_statuses', 'leads.lead_status_id', '=', 'lead_statuses.id')
            ->where('lead_followups.business_id', $businessId)
            ->where('lead_followups.status', 'pending')
            ->whereDate('lead_followups.follow_up_at', $now->toDateString())
            ->where('lead_followups.follow_up_at', '>=', $now)
            ->whereNull('leads.deleted_at')
            ->when($branchId, fn ($q) => $q->where('leads.branch_id', $branchId))
            ->select(
                'lead_followups.id as followup_id',
                'leads.id as lead_id',
                'leads.name as lead_name',
                'leads.mobile',
                'leads.source',
                'lead_statuses.name as status',
                'lead_statuses.color as status_color',
                'users.name as assigned_staff',
                'lead_followups.follow_up_at as due_time',
                'lead_followups.note'
            )
            ->orderBy('lead_followups.follow_up_at')
            ->limit(25)
            ->get()
            ->map(fn ($r) => $this->formatQueueRow($r, 'due_today'));

        $unassigned = DB::table('leads')
            ->leftJoin('lead_statuses', 'leads.lead_status_id', '=', 'lead_statuses.id')
            ->where('leads.business_id', $businessId)
            ->whereNull('leads.assigned_to')
            ->whereNull('leads.deleted_at')
            ->when($branchId, fn ($q) => $q->where('leads.branch_id', $branchId))
            ->select(
                DB::raw('null as followup_id'),
                'leads.id as lead_id',
                'leads.name as lead_name',
                'leads.mobile',
                'leads.source',
                'lead_statuses.name as status',
                'lead_statuses.color as status_color',
                DB::raw('null as assigned_staff'),
                'leads.created_at as due_time',
                DB::raw('null as note')
            )
            ->orderBy('leads.created_at')
            ->limit(25)
            ->get()
            ->map(fn ($r) => $this->formatQueueRow($r, 'unassigned'));

        return [
            'overdue'    => $overdue,
            'due_today'  => $dueToday,
            'unassigned' => $unassigned,
            'counts'     => [
                'overdue'    => count($overdue),
                'due_today'  => count($dueToday),
                'unassigned' => count($unassigned),
                'total'      => count($overdue) + count($dueToday) + count($unassigned),
            ],
        ];
    }

    private function formatQueueRow($r, string $category): array
    {
        return [
            'followup_id'    => $r->followup_id,
            'lead_id'        => $r->lead_id,
            'lead_name'      => $r->lead_name,
            'mobile'         => $r->mobile,
            'source'         => $r->source ?: 'Unknown',
            'status'         => $r->status,
            'status_color'   => $r->status_color,
            'assigned_staff' => $r->assigned_staff,
            'due_time'       => $r->due_time,
            'note'           => $r->note,
            'category'       => $category,
        ];
    }

    // ─────────────────────────────────────────────
    // RECENT ACTIVITY FEED
    // ─────────────────────────────────────────────

    public function recentActivity(array $filters = []): array
    {
        $user       = Auth::user();
        $businessId = $user->business_id;
        $branchId   = $user->branch_id ?? ($filters['branch_id'] ?? null);

        $activities = DB::table('lead_activities')
            ->join('leads', 'lead_activities.lead_id', '=', 'leads.id')
            ->leftJoin('users', 'lead_activities.user_id', '=', 'users.id')
            ->where('lead_activities.business_id', $businessId)
            ->whereNull('leads.deleted_at')
            ->when($branchId, fn ($q) => $q->where('leads.branch_id', $branchId))
            ->select(
                'lead_activities.id',
                'lead_activities.type',
                'lead_activities.description',
                'lead_activities.created_at',
                'leads.id as lead_id',
                'leads.name as lead_name',
                'users.name as user_name'
            )
            ->orderByDesc('lead_activities.created_at')
            ->limit(20)
            ->get()
            ->map(fn ($r) => [
                'id'          => $r->id,
                'type'        => $r->type,
                'description' => $r->description,
                'created_at'  => $r->created_at,
                'lead_id'     => $r->lead_id,
                'lead_name'   => $r->lead_name,
                'user_name'   => $r->user_name,
            ]);

        return ['activities' => $activities];
    }

    // ─────────────────────────────────────────────
    // REPORTS — LEADS ANALYSIS (Tab 2)
    // ─────────────────────────────────────────────

    public function leadsReport(array $filters = []): array
    {
        $user       = Auth::user();
        $businessId = $user->business_id;
        $branchId   = $user->branch_id ?? ($filters['branch_id'] ?? null);
        $now        = Carbon::now();

        $query = DB::table('leads')
            ->leftJoin('lead_statuses', 'leads.lead_status_id', '=', 'lead_statuses.id')
            ->leftJoin('users', 'leads.assigned_to', '=', 'users.id')
            ->leftJoin('branches', 'leads.branch_id', '=', 'branches.id')
            ->where('leads.business_id', $businessId)
            ->whereNull('leads.deleted_at')
            ->when($branchId, fn ($q) => $q->where('leads.branch_id', $branchId))
            ->when($filters['source'] ?? null, fn ($q, $v) => $q->where('leads.source', $v))
            ->when($filters['status_id'] ?? null, fn ($q, $v) => $q->where('leads.lead_status_id', $v))
            ->when($filters['assigned_to'] ?? null, fn ($q, $v) => $q->where('leads.assigned_to', $v))
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->whereDate('leads.created_at', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->whereDate('leads.created_at', '<=', $v))
            ->select(
                'leads.id',
                'leads.name',
                'leads.mobile',
                'leads.source',
                'leads.created_at',
                'leads.last_contacted_at',
                'lead_statuses.name as status',
                'lead_statuses.color as status_color',
                'lead_statuses.is_converted',
                'users.name as assigned_to',
                'branches.name as branch'
            )
            ->orderByDesc('leads.created_at');

        // T88 FIX: Run summary counts as a separate aggregate query BEFORE applying
        // the LIMIT. Previously, summary was computed on the in-memory collection after
        // limiting to 500 rows — giving wrong totals for businesses with > 500 leads.
        $summaryQuery = clone $query;
        $summaryRow = $summaryQuery
            ->select(
                DB::raw('count(*) as total'),
                DB::raw('count(case when lead_statuses.is_converted then 1 end) as converted')
            )
            ->first();

        $totalCount     = (int) ($summaryRow->total ?? 0);
        $convertedCount = (int) ($summaryRow->converted ?? 0);
        $rate           = $totalCount > 0 ? round(($convertedCount / $totalCount) * 100, 1) : 0;

        $leads = $query->limit(500)->get()->map(function ($r) use ($now) {
            $daysSince = null;
            $contactLabel = 'never';
            if ($r->last_contacted_at) {
                $daysSince = Carbon::parse($r->last_contacted_at)->diffInDays($now, false);
                if ($daysSince <= 0) $contactLabel = 'today';
                elseif ($daysSince <= 3) $contactLabel = '2-3 days';
                else $contactLabel = '4+ days';
            }

            return [
                'id'                  => $r->id,
                'name'                => $r->name,
                'mobile'              => $r->mobile,
                'source'              => $r->source ?: 'Unknown',
                'status'              => $r->status,
                'status_color'        => $r->status_color,
                'is_converted'        => (bool) $r->is_converted,
                'assigned_to'         => $r->assigned_to,
                'branch'              => $r->branch,
                'created_at'          => $r->created_at,
                'last_contacted_at'   => $r->last_contacted_at,
                'days_since_contact'  => $daysSince,
                'contact_label'       => $contactLabel,
            ];
        });

        return [
            'leads'   => $leads->values(),
            'summary' => [
                'total'           => $totalCount,
                'converted'       => $convertedCount,
                'conversion_rate' => $rate,
                'truncated'       => $totalCount > 500,
            ],
        ];
    }

    // ─────────────────────────────────────────────
    // REPORTS — TEAM PERFORMANCE (Tab 3)
    // ─────────────────────────────────────────────

    public function teamReport(array $filters = []): array
    {
        $user       = Auth::user();
        $businessId = $user->business_id;
        $branchId   = $user->branch_id ?? ($filters['branch_id'] ?? null);
        $dateFrom   = $filters['date_from'] ?? null;
        $dateTo     = $filters['date_to'] ?? null;

        $users = DB::table('users')
            ->where('business_id', $businessId)
            ->where('is_active', true)
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->select('id', 'name', 'email')
            ->get();

        $convertedStatusIds = DB::table('lead_statuses')
            ->where('business_id', $businessId)
            ->where('is_converted', true)
            ->pluck('id');

        $members = $users->map(function ($u) use ($businessId, $branchId, $dateFrom, $dateTo, $convertedStatusIds) {
            $leadBase = DB::table('leads')
                ->where('business_id', $businessId)
                ->where('assigned_to', $u->id)
                ->whereNull('deleted_at')
                ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
                ->when($dateFrom, fn ($q) => $q->whereDate('created_at', '>=', $dateFrom))
                ->when($dateTo, fn ($q) => $q->whereDate('created_at', '<=', $dateTo));

            $assigned  = (clone $leadBase)->count();
            $converted = (clone $leadBase)->whereIn('lead_status_id', $convertedStatusIds)->count();
            $contacted = (clone $leadBase)->whereNotNull('last_contacted_at')->count();
            $convRate  = $assigned > 0 ? round(($converted / $assigned) * 100, 1) : 0;

            $missedFollowups = DB::table('lead_followups')
                ->join('leads', 'lead_followups.lead_id', '=', 'leads.id')
                ->where('lead_followups.business_id', $businessId)
                ->where('leads.assigned_to', $u->id)
                ->where('lead_followups.status', 'pending')
                ->where('lead_followups.follow_up_at', '<', Carbon::now())
                ->when($dateFrom, fn ($q) => $q->whereDate('lead_followups.follow_up_at', '>=', $dateFrom))
                ->when($dateTo, fn ($q) => $q->whereDate('lead_followups.follow_up_at', '<=', $dateTo))
                ->count();

            $totalFollowups = DB::table('lead_followups')
                ->join('leads', 'lead_followups.lead_id', '=', 'leads.id')
                ->where('lead_followups.business_id', $businessId)
                ->where('leads.assigned_to', $u->id)
                ->when($dateFrom, fn ($q) => $q->whereDate('lead_followups.follow_up_at', '>=', $dateFrom))
                ->when($dateTo, fn ($q) => $q->whereDate('lead_followups.follow_up_at', '<=', $dateTo))
                ->count();

            $doneFollowups = DB::table('lead_followups')
                ->join('leads', 'lead_followups.lead_id', '=', 'leads.id')
                ->where('lead_followups.business_id', $businessId)
                ->where('leads.assigned_to', $u->id)
                ->where('lead_followups.status', 'done')
                ->when($dateFrom, fn ($q) => $q->whereDate('lead_followups.follow_up_at', '>=', $dateFrom))
                ->when($dateTo, fn ($q) => $q->whereDate('lead_followups.follow_up_at', '<=', $dateTo))
                ->count();

            $followupCompliance = $totalFollowups > 0
                ? round(($doneFollowups / $totalFollowups) * 100, 1)
                : null;

            // T65 FIX: Replace PostgreSQL-only EXTRACT(EPOCH FROM ...) and ::timestamp casting
            // with TIMESTAMPDIFF which is supported on both MySQL and PostgreSQL (via Laravel).
            // The original produced SQL errors on MySQL, returning null for all users.
            $avgResponseTime = DB::table('lead_activities')
                ->join('leads', 'lead_activities.lead_id', '=', 'leads.id')
                ->where('lead_activities.business_id', $businessId)
                ->where('lead_activities.user_id', $u->id)
                ->where('leads.assigned_to', $u->id)
                ->whereRaw('lead_activities.created_at = (SELECT MIN(la2.created_at) FROM lead_activities la2 WHERE la2.lead_id = lead_activities.lead_id AND la2.user_id = ?)', [$u->id])
                ->when($dateFrom, fn ($q) => $q->whereDate('leads.created_at', '>=', $dateFrom))
                ->when($dateTo, fn ($q) => $q->whereDate('leads.created_at', '<=', $dateTo))
                ->selectRaw('AVG(TIMESTAMPDIFF(SECOND, leads.created_at, lead_activities.created_at) / 60) as avg_minutes')
                ->value('avg_minutes');

            return [
                'id'                   => $u->id,
                'name'                 => $u->name,
                'email'                => $u->email,
                'assigned'             => $assigned,
                'contacted'            => $contacted,
                'converted'            => $converted,
                'conversion_rate'      => $convRate,
                'missed_followups'     => $missedFollowups,
                'followup_compliance'  => $followupCompliance,
                'done_followups'       => $doneFollowups,
                'total_followups'      => $totalFollowups,
                'avg_response_minutes' => $avgResponseTime ? round($avgResponseTime) : null,
            ];
        });

        return ['members' => $members->values()];
    }

    // ─────────────────────────────────────────────
    // REPORTS — SOURCES PERFORMANCE (Tab 4)
    // ─────────────────────────────────────────────

    public function sourcesReport(array $filters = []): array
    {
        $user       = Auth::user();
        $businessId = $user->business_id;
        $branchId   = $user->branch_id ?? ($filters['branch_id'] ?? null);
        $dateFrom   = $filters['date_from'] ?? null;
        $dateTo     = $filters['date_to'] ?? null;

        $convertedStatusIds = DB::table('lead_statuses')
            ->where('business_id', $businessId)
            ->where('is_converted', true)
            ->pluck('id')
            ->toArray();

        $convertedIdList = implode("','", $convertedStatusIds);

        // T65 FIX: Replace PostgreSQL-only EXTRACT(EPOCH FROM (converted_at::timestamp - created_at::timestamp))
        // with TIMESTAMPDIFF(SECOND, created_at, converted_at) which works on MySQL.
        $sources = DB::table('leads')
            ->where('business_id', $businessId)
            ->whereNull('deleted_at')
            ->when($branchId, fn ($q) => $q->where('branch_id', $branchId))
            ->when($dateFrom, fn ($q) => $q->whereDate('created_at', '>=', $dateFrom))
            ->when($dateTo, fn ($q) => $q->whereDate('created_at', '<=', $dateTo))
            ->select(
                DB::raw("COALESCE(source, 'Unknown') as source"),
                DB::raw('count(*) as total'),
                DB::raw("count(case when lead_status_id in ('" . $convertedIdList . "') then 1 end) as converted"),
                DB::raw("AVG(CASE WHEN lead_status_id in ('" . $convertedIdList . "') AND converted_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, created_at, converted_at) / 86400.0 ELSE NULL END) as avg_days_to_convert")
            )
            ->groupBy(DB::raw("COALESCE(source, 'Unknown')"))
            ->orderByDesc('total')
            ->get()
            ->map(function ($r) {
                $rate = $r->total > 0 ? round(($r->converted / $r->total) * 100, 1) : 0;
                return [
                    'source'              => $r->source,
                    'total'               => $r->total,
                    'converted'           => $r->converted,
                    'conversion_rate'     => $rate,
                    'avg_days_to_convert' => $r->avg_days_to_convert ? round($r->avg_days_to_convert, 1) : null,
                ];
            });

        $grandTotal = $sources->sum('total');
        $sourcesWithShare = $sources->map(function ($s) use ($grandTotal) {
            $s['share'] = $grandTotal > 0 ? round(($s['total'] / $grandTotal) * 100, 1) : 0;
            return $s;
        });

        return [
            'sources'     => $sourcesWithShare->values(),
            'grand_total' => $grandTotal,
        ];
    }
}
