<?php

namespace App\Modules\Auth\Controllers;

use App\Models\AgencyBusinessAssignment;
use App\Models\Business;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AgencyController extends Controller
{
    // ─── Helpers ────────────────────────────────────────────────

    private function isAdmin(): bool
    {
        return Auth::user()->hasRole('agency_admin', 'sanctum');
    }

    /**
     * Returns business IDs this user is allowed to see.
     * agency_admin → all business IDs
     * agency_staff → only assigned business IDs
     */
    private function allowedBusinessIds(): ?array
    {
        if ($this->isAdmin()) {
            return null; // null = no restriction
        }

        return AgencyBusinessAssignment::where('user_id', Auth::id())
            ->pluck('business_id')
            ->toArray();
    }

    private function businessQuery()
    {
        $ids = $this->allowedBusinessIds();

        $query = Business::withoutGlobalScopes();

        if ($ids !== null) {
            $query->whereIn('id', $ids);
        }

        return $query;
    }

    // ─── Stats ──────────────────────────────────────────────────

    public function stats(): JsonResponse
    {
        $ids = $this->allowedBusinessIds();

        $businessQuery = Business::withoutGlobalScopes();
        $leadQuery     = DB::table('leads');
        $userQuery     = DB::table('users')->whereNotNull('business_id');

        if ($ids !== null) {
            $businessQuery->whereIn('id', $ids);
            $leadQuery->whereIn('business_id', $ids);
            $userQuery->whereIn('business_id', $ids);
        }

        return response()->json([
            'total_businesses'  => $businessQuery->count(),
            'active_businesses' => (clone $businessQuery)->where('is_active', true)->count(),
            'total_leads'       => $leadQuery->count(),
            'total_users'       => $userQuery->count(),
            'is_admin'          => $this->isAdmin(),
        ]);
    }

    // ─── Business list ──────────────────────────────────────────

    public function businesses(): JsonResponse
    {
        $businesses = $this->businessQuery()
            ->select('id', 'name', 'slug', 'plan', 'is_active', 'timezone', 'created_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($b) {
                $leadCount  = DB::table('leads')->where('business_id', $b->id)->count();
                $userCount  = DB::table('users')->where('business_id', $b->id)->count();
                $branchCount = DB::table('branches')->where('business_id', $b->id)->count();

                return [
                    'id'           => $b->id,
                    'name'         => $b->name,
                    'slug'         => $b->slug,
                    'plan'         => $b->plan,
                    'is_active'    => (bool) $b->is_active,
                    'timezone'     => $b->timezone,
                    'created_at'   => $b->created_at,
                    'lead_count'   => $leadCount,
                    'user_count'   => $userCount,
                    'branch_count' => $branchCount,
                ];
            });

        return response()->json(['data' => $businesses]);
    }

    // ─── Single business detail ─────────────────────────────────

    public function showBusiness(string $id): JsonResponse
    {
        $ids = $this->allowedBusinessIds();

        if ($ids !== null && !in_array($id, $ids)) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $business = Business::withoutGlobalScopes()->findOrFail($id);

        $members = User::withoutGlobalScopes()
            ->where('business_id', $id)
            ->get()
            ->map(fn($u) => [
                'id'            => $u->id,
                'name'          => $u->name,
                'email'         => $u->email,
                'roles'         => $u->getRoleNames(),
                'is_active'     => $u->is_active,
                'last_login_at' => $u->last_login_at,
            ]);

        return response()->json([
            'id'           => $business->id,
            'name'         => $business->name,
            'slug'         => $business->slug,
            'plan'         => $business->plan,
            'is_active'    => (bool) $business->is_active,
            'timezone'     => $business->timezone,
            'lead_count'   => DB::table('leads')->where('business_id', $id)->count(),
            'branch_count' => DB::table('branches')->where('business_id', $id)->count(),
            'members'      => $members,
        ]);
    }

    // ─── Toggle business active state ───────────────────────────

    public function toggleBusiness(string $id): JsonResponse
    {
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Only agency admins can toggle businesses.'], 403);
        }

        $business = Business::withoutGlobalScopes()->findOrFail($id);
        $business->update(['is_active' => !$business->is_active]);

        return response()->json([
            'id'        => $business->id,
            'is_active' => $business->is_active,
            'message'   => $business->is_active ? 'Business activated.' : 'Business deactivated.',
        ]);
    }

    // ─── Staff management (admin only) ──────────────────────────

    public function staffList(): JsonResponse
    {
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $staffRoleId = DB::table('roles')
            ->where('name', 'agency_staff')
            ->where('guard_name', 'sanctum')
            ->value('id');

        if (!$staffRoleId) {
            return response()->json(['data' => []]);
        }

        $staffUserIds = DB::table('model_has_roles')
            ->where('role_id', $staffRoleId)
            ->pluck('model_id');

        $staff = User::withoutGlobalScopes()
            ->whereIn('id', $staffUserIds)
            ->get()
            ->map(function ($u) {
                $assignedIds = AgencyBusinessAssignment::where('user_id', $u->id)
                    ->pluck('business_id');

                $assignedBusinesses = Business::withoutGlobalScopes()
                    ->whereIn('id', $assignedIds)
                    ->select('id', 'name', 'plan')
                    ->get();

                return [
                    'id'                  => $u->id,
                    'name'                => $u->name,
                    'email'               => $u->email,
                    'is_active'           => $u->is_active,
                    'last_login_at'       => $u->last_login_at,
                    'assigned_businesses' => $assignedBusinesses,
                ];
            });

        return response()->json(['data' => $staff]);
    }

    public function inviteStaff(Request $request): JsonResponse
    {
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'name'  => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
        ]);

        $tempPassword = 'Staff@' . rand(10000, 99999);

        $user = User::create([
            'name'        => $request->name,
            'email'       => $request->email,
            'password'    => bcrypt($tempPassword),
            'is_active'   => true,
            'business_id' => null,
            'branch_id'   => null,
        ]);

        $user->assignRole('agency_staff');

        return response()->json([
            'user'          => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
            'temp_password' => $tempPassword,
            'message'       => 'Staff member created. Share the temp password — they can change it after login.',
        ], 201);
    }

    public function assignBusiness(Request $request, string $staffId): JsonResponse
    {
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'business_id' => 'required|uuid|exists:businesses,id',
        ]);

        AgencyBusinessAssignment::firstOrCreate([
            'user_id'     => $staffId,
            'business_id' => $request->business_id,
        ]);

        return response()->json(['message' => 'Business assigned.']);
    }

    public function unassignBusiness(Request $request, string $staffId): JsonResponse
    {
        if (!$this->isAdmin()) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        $request->validate([
            'business_id' => 'required|uuid',
        ]);

        AgencyBusinessAssignment::where('user_id', $staffId)
            ->where('business_id', $request->business_id)
            ->delete();

        return response()->json(['message' => 'Business unassigned.']);
    }
}