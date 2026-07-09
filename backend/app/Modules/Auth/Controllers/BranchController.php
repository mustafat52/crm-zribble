<?php

namespace App\Modules\Auth\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Modules\Auth\Models\Branch;
use App\Models\User;

class BranchController extends Controller
{
    use AuthorizesRequests;

    // -------------------------------------------------------------------------
    // GET /api/v1/branches
    // Returns all branches with per-branch lead stats + overall business KPIs.
    // -------------------------------------------------------------------------
    public function index(Request $request): JsonResponse
    {
        $user       = Auth::user();
        $businessId = $user->business_id;

        $branches = Branch::where('business_id', $businessId)
            ->with('manager:id,name,email')
            ->orderBy('created_at', 'asc')
            ->get();

        // -- Per-branch lead stats (2 queries, no N+1) ------------------------
        $branchIds = $branches->pluck('id')->toArray();

        $convertedStatusIds = DB::table('lead_statuses')
            ->where('business_id', $businessId)
            ->where('is_converted', true)
            ->pluck('id')
            ->toArray();

        // Total leads per branch
        $totalPerBranch = DB::table('leads')
            ->where('business_id', $businessId)
            ->whereNull('deleted_at')
            ->whereIn('branch_id', $branchIds)
            ->selectRaw('branch_id, count(*) as total')
            ->groupBy('branch_id')
            ->get()
            ->keyBy('branch_id');

        // Converted leads per branch
        $convertedPerBranch = empty($convertedStatusIds)
            ? collect()
            : DB::table('leads')
                ->where('business_id', $businessId)
                ->whereNull('deleted_at')
                ->whereIn('branch_id', $branchIds)
                ->whereIn('lead_status_id', $convertedStatusIds)
                ->selectRaw('branch_id, count(*) as converted')
                ->groupBy('branch_id')
                ->get()
                ->keyBy('branch_id');

        // -- Overall business KPIs (3 queries) --------------------------------
        $totalLeadsAll = DB::table('leads')
            ->where('business_id', $businessId)
            ->whereNull('deleted_at')
            ->count();

        $convertedAll = empty($convertedStatusIds) ? 0 : DB::table('leads')
            ->where('business_id', $businessId)
            ->whereNull('deleted_at')
            ->whereIn('lead_status_id', $convertedStatusIds)
            ->count();

        $pendingFollowups = DB::table('lead_followups')
            ->where('business_id', $businessId)
            ->where('status', 'pending')
            ->where('follow_up_at', '<', now())
            ->count();

        // Avg response time: minutes from lead created_at to last_contacted_at
        // Uses TIMESTAMPDIFF for MySQL compatibility
        $avgResponseMinutes = DB::table('leads')
            ->where('business_id', $businessId)
            ->whereNull('deleted_at')
            ->whereNotNull('last_contacted_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(MINUTE, created_at, last_contacted_at)) as avg_minutes')
            ->value('avg_minutes');

        $overall = [
            'total_leads'          => $totalLeadsAll,
            'conversion_rate'      => $totalLeadsAll > 0
                ? round(($convertedAll / $totalLeadsAll) * 100, 1)
                : 0,
            'pending_followups'    => $pendingFollowups,
            'avg_response_minutes' => $avgResponseMinutes ? (int) round($avgResponseMinutes) : null,
        ];

        // -- Build response ---------------------------------------------------
        $formatted = $branches->map(function (Branch $branch) use ($totalPerBranch, $convertedPerBranch) {
            $total     = $totalPerBranch->get($branch->id)?->total ?? 0;
            $converted = $convertedPerBranch->get($branch->id)?->converted ?? 0;

            return $this->format($branch, [
                'total_leads'      => (int) $total,
                'converted_leads'  => (int) $converted,
            ]);
        });

        return response()->json([
            'data'    => $formatted,
            'total'   => $branches->count(),
            'overall' => $overall,
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/branches/{id}
    // Returns a single branch with its staff list (read-only).
    // -------------------------------------------------------------------------
    public function show(string $id): JsonResponse
    {
        $branch = $this->findForUser($id);
        $branch->load('manager:id,name,email');

        $staff = User::where('business_id', Auth::user()->business_id)
            ->where('branch_id', $branch->id)
            ->where('is_active', true)
            ->get()
            ->map(fn ($u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'role'  => $u->getRoleNames()->first() ?? '—',
            ]);

        return response()->json([
            'branch' => $this->format($branch),
            'staff'  => $staff,
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/branches
    // -------------------------------------------------------------------------
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Branch::class);

        $validated = $request->validate([
            'name'            => 'required|string|max:100',
            'city'            => 'nullable|string|max:100',
            'whatsapp_number' => 'nullable|string|max:20',
            'manager_id'      => 'nullable|uuid|exists:users,id',
        ]);

        $branch = Branch::create([
            ...$validated,
            'business_id' => Auth::user()->business_id,
            'is_active'   => true,
        ]);

        $branch->load('manager:id,name,email');

        return response()->json([
            'message' => 'Branch created.',
            'data'    => $this->format($branch),
        ], 201);
    }

    // -------------------------------------------------------------------------
    // PUT /api/v1/branches/{id}
    // -------------------------------------------------------------------------
    public function update(Request $request, string $id): JsonResponse
    {
        $branch = $this->findForUser($id);
        $this->authorize('update', $branch);

        $validated = $request->validate([
            'name'            => 'sometimes|required|string|max:100',
            'city'            => 'nullable|string|max:100',
            'whatsapp_number' => 'nullable|string|max:20',
            'manager_id'      => 'nullable|uuid|exists:users,id',
        ]);

        $branch->update($validated);
        $branch->load('manager:id,name,email');

        return response()->json([
            'message' => 'Branch updated.',
            'data'    => $this->format($branch),
        ]);
    }

    // -------------------------------------------------------------------------
    // PUT /api/v1/branches/{id}/toggle
    // -------------------------------------------------------------------------
    public function toggleActive(string $id): JsonResponse
    {
        $branch = $this->findForUser($id);
        $this->authorize('toggleActive', $branch);

        $branch->update(['is_active' => ! $branch->is_active]);
        $branch->load('manager:id,name,email');

        return response()->json([
            'message' => $branch->is_active ? 'Branch activated.' : 'Branch deactivated.',
            'data'    => $this->format($branch),
        ]);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/v1/branches/{id}
    // -------------------------------------------------------------------------
    public function destroy(string $id): JsonResponse
    {
        $branch = $this->findForUser($id);
        $this->authorize('delete', $branch);

        $activeBranches = Branch::where('business_id', $branch->business_id)
            ->where('is_active', true)
            ->count();

        if ($activeBranches <= 1 && $branch->is_active) {
            return response()->json([
                'message' => 'Cannot delete the only active branch.',
            ], 422);
        }

        // If owner's active branch is being deleted, reset to another branch
        $user = Auth::user();
        if ($user->active_branch_id === $branch->id) {
            $fallback = Branch::where('business_id', $branch->business_id)
                ->where('id', '!=', $branch->id)
                ->where('is_active', true)
                ->oldest()
                ->value('id');

            $user->update(['active_branch_id' => $fallback]);
        }

        $branch->delete();

        return response()->json(['message' => 'Branch deleted.']);
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/branches/{id}/switch
    // Sets the owner's active branch. Persists across sessions.
    // -------------------------------------------------------------------------
    public function switchBranch(string $id): JsonResponse
    {
        $user   = Auth::user();
        $branch = $this->findForUser($id);

        if (! $branch->is_active) {
            return response()->json([
                'message' => 'Cannot switch to an inactive branch.',
            ], 422);
        }

        $user->update(['active_branch_id' => $branch->id]);

        return response()->json([
            'message'          => 'Switched to ' . $branch->name . '.',
            'active_branch_id' => $branch->id,
        ]);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function findForUser(string $id): Branch
    {
        return Branch::where('id', $id)
            ->where('business_id', Auth::user()->business_id)
            ->firstOrFail();
    }

    private function format(Branch $branch, array $stats = []): array
    {
        $total     = $stats['total_leads']     ?? 0;
        $converted = $stats['converted_leads'] ?? 0;

        return [
            'id'               => $branch->id,
            'name'             => $branch->name,
            'city'             => $branch->city,
            'whatsapp_number'  => $branch->whatsapp_number,
            'is_active'        => $branch->is_active,
            'manager_id'       => $branch->manager_id,
            'manager'          => $branch->manager ? [
                'id'    => $branch->manager->id,
                'name'  => $branch->manager->name,
                'email' => $branch->manager->email,
            ] : null,
            'created_at'       => $branch->created_at?->toISOString(),
            'total_leads'      => $total,
            'converted_leads'  => $converted,
            'conversion_ratio' => $total > 0 ? round($converted / $total, 3) : 0,
        ];
    }
}
