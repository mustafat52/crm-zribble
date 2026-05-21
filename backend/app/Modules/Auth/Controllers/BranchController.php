<?php

namespace App\Modules\Auth\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use App\Modules\Auth\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class BranchController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request)
    {
        $user = Auth::user();

        $branches = Branch::where('business_id', $user->business_id)
            ->with('manager:id,name,email')
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(fn ($b) => $this->format($b));

        return response()->json([
            'data'  => $branches,
            'total' => $branches->count(),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Branch::class);

        $validated = $request->validate([
            'name'            => 'required|string|max:100',
            'city'            => 'nullable|string|max:100',
            'whatsapp_number' => 'nullable|string|max:20',
            'manager_id'      => 'nullable|uuid|exists:users,id',
        ]);

        $user = Auth::user();

        $branch = Branch::create([
            ...$validated,
            'business_id' => $user->business_id,
            'is_active'   => true,
        ]);

        $branch->load('manager:id,name,email');

        return response()->json([
            'message' => 'Branch created.',
            'data'    => $this->format($branch),
        ], 201);
    }

    public function update(Request $request, string $id)
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

    public function toggleActive(string $id)
    {
        $branch = $this->findForUser($id);
        $this->authorize('toggleActive', $branch);

        $branch->update(['is_active' => !$branch->is_active]);
        $branch->load('manager:id,name,email');

        return response()->json([
            'message' => $branch->is_active ? 'Branch activated.' : 'Branch deactivated.',
            'data'    => $this->format($branch),
        ]);
    }

    public function destroy(string $id)
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

        $branch->delete();

        return response()->json(['message' => 'Branch deleted.']);
    }

    private function findForUser(string $id): Branch
    {
        return Branch::where('id', $id)
            ->where('business_id', Auth::user()->business_id)
            ->firstOrFail();
    }

    private function format(Branch $branch): array
    {
        return [
            'id'              => $branch->id,
            'name'            => $branch->name,
            'city'            => $branch->city,
            'whatsapp_number' => $branch->whatsapp_number,
            'is_active'       => $branch->is_active,
            'manager_id'      => $branch->manager_id,
            'manager'         => $branch->manager ? [
                'id'    => $branch->manager->id,
                'name'  => $branch->manager->name,
                'email' => $branch->manager->email,
            ] : null,
            'created_at'      => $branch->created_at?->toISOString(),
        ];
    }
}