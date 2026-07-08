<?php

namespace App\Modules\Leads\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
// T57 FIX: Use module-level models instead of legacy flat models.
// The legacy App\Models\LeadStatus did not guarantee BusinessScope on aggregates.
use App\Modules\Leads\Models\LeadStatus;
use App\Modules\Leads\Models\Lead;

class LeadStatusController extends Controller
{
    /**
     * GET /api/v1/lead-statuses
     * Returns all statuses for this business ordered by sort_order.
     */
    public function index(): JsonResponse
    {
        $statuses = LeadStatus::orderBy('sort_order')->get();

        return response()->json($statuses->map(fn ($s) => $this->format($s)));
    }

    /**
     * POST /api/v1/lead-statuses
     * Creates a new status for this business.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => 'required|string|max:100',
            'color'        => 'required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'is_converted' => 'sometimes|boolean',
            'is_lost'      => 'sometimes|boolean',
            'is_terminal'  => 'sometimes|boolean',
        ]);

        // T57 FIX: Scope max(sort_order) to the current business.
        // Eloquent aggregate methods bypass global scopes, so without an explicit
        // where() clause this returns the global max across all businesses.
        $maxOrder = LeadStatus::where('business_id', Auth::user()->business_id)
            ->max('sort_order') ?? 0;

        $status = LeadStatus::create([
            'business_id'  => Auth::user()->business_id,
            'name'         => $data['name'],
            'color'        => $data['color'],
            'sort_order'   => $maxOrder + 1,
            'is_converted' => $data['is_converted'] ?? false,
            'is_lost'      => $data['is_lost']      ?? false,
            'is_terminal'  => $data['is_terminal']  ?? false,
        ]);

        return response()->json($this->format($status), 201);
    }

    /**
     * PUT /api/v1/lead-statuses/{id}
     * Updates name, color, sort_order, and flag fields.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $status = LeadStatus::find($id);

        if (! $status) {
            return response()->json(['message' => 'Status not found.'], 404);
        }

        // T57 FIX: Verify ownership before allowing update.
        if ($status->business_id !== Auth::user()->business_id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $data = $request->validate([
            'name'         => 'sometimes|required|string|max:100',
            'color'        => 'sometimes|required|string|regex:/^#[0-9A-Fa-f]{6}$/',
            'sort_order'   => 'sometimes|integer|min:0',
            'is_converted' => 'sometimes|boolean',
            'is_lost'      => 'sometimes|boolean',
            'is_terminal'  => 'sometimes|boolean',
        ]);

        $status->fill($data)->save();

        return response()->json($this->format($status));
    }

    /**
     * DELETE /api/v1/lead-statuses/{id}
     * Deletes a status.
     * Returns 422 if any leads are currently assigned to this status.
     */
    public function destroy(string $id): JsonResponse
    {
        $status = LeadStatus::find($id);

        if (! $status) {
            return response()->json(['message' => 'Status not found.'], 404);
        }

        // T57 FIX: Verify ownership before allowing delete.
        if ($status->business_id !== Auth::user()->business_id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        // Block deletion if leads are using this status —
        // withoutGlobalScopes so we count across all branches for safety
        $inUse = Lead::withoutGlobalScopes()
            ->where('business_id', Auth::user()->business_id)
            ->where('lead_status_id', $id)
            ->exists();

        if ($inUse) {
            return response()->json([
                'message' => 'Cannot delete this status — it is assigned to one or more leads. Reassign those leads first.',
            ], 422);
        }

        $status->delete();

        return response()->json(['message' => 'Status deleted.']);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function format(LeadStatus $status): array
    {
        return [
            'id'           => $status->id,
            'business_id'  => $status->business_id,
            'name'         => $status->name,
            'color'        => $status->color,
            'sort_order'   => $status->sort_order,
            'is_converted' => (bool) $status->is_converted,
            'is_lost'      => (bool) $status->is_lost,
            'is_terminal'  => (bool) $status->is_terminal,
        ];
    }
}
