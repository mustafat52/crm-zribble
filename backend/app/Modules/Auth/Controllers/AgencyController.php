<?php

namespace App\Modules\Auth\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Controller;
use App\Models\Business;
use App\Models\User;
use App\Models\Lead;
use Illuminate\Http\Request;

class AgencyController extends Controller
{
    /**
     * GET /api/v1/agency/stats
     * Platform-wide totals — no business scope.
     */
    public function stats(): JsonResponse
    {
        $totalBusinesses  = Business::withoutGlobalScopes()->count();
        $activeBusinesses = Business::withoutGlobalScopes()->where('is_active', true)->count();
        $totalLeads       = Lead::withoutGlobalScopes()->count();
        $totalUsers       = User::withoutGlobalScopes()->whereNotNull('business_id')->count();

        return response()->json([
            'total_businesses'  => $totalBusinesses,
            'active_businesses' => $activeBusinesses,
            'total_leads'       => $totalLeads,
            'total_users'       => $totalUsers,
        ]);
    }

    /**
     * GET /api/v1/agency/businesses
     * All businesses with their lead count, user count, branch count.
     */
    public function businesses(): JsonResponse
    {
        $businesses = Business::withoutGlobalScopes()
            ->withCount(['leads', 'users', 'branches'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($b) => $this->formatBusiness($b));

        return response()->json(['data' => $businesses]);
    }

    /**
     * GET /api/v1/agency/businesses/{id}
     * Single business detail.
     */
    public function showBusiness(string $id): JsonResponse
    {
        $business = Business::withoutGlobalScopes()
            ->withCount(['leads', 'users', 'branches'])
            ->findOrFail($id);

        // Recent team members
        $users = User::withoutGlobalScopes()
            ->where('business_id', $id)
            ->select('id', 'name', 'email', 'is_active', 'last_login_at')
            ->with('roles:name')
            ->limit(10)
            ->get();

        return response()->json([
            'business' => $this->formatBusiness($business),
            'users'    => $users,
        ]);
    }

    /**
     * PUT /api/v1/agency/businesses/{id}/toggle
     * Activate or deactivate a business.
     */
    public function toggleBusiness(string $id): JsonResponse
    {
        $business = Business::withoutGlobalScopes()->findOrFail($id);
        $business->is_active = ! $business->is_active;
        $business->save();

        return response()->json([
            'id'        => $business->id,
            'is_active' => $business->is_active,
            'message'   => $business->is_active ? 'Business activated.' : 'Business deactivated.',
        ]);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------
    private function formatBusiness(Business $b): array
    {
        return [
            'id'            => $b->id,
            'name'          => $b->name,
            'slug'          => $b->slug,
            'plan'          => $b->plan,
            'timezone'      => $b->timezone,
            'is_active'     => $b->is_active,
            'leads_count'   => $b->leads_count ?? 0,
            'users_count'   => $b->users_count ?? 0,
            'branches_count'=> $b->branches_count ?? 0,
            'created_at'    => $b->created_at?->toISOString(),
        ];
    }
}