<?php

namespace App\Modules\Auth\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use App\Models\User;
use Spatie\Permission\Models\Role;

class TeamController extends Controller
{
    /**
     * GET /api/v1/team
     * Returns all users in this business.
     */
    public function index(): JsonResponse
    {
        $users = User::where('business_id', Auth::user()->business_id)
            ->with('branch:id,name')
            ->get();

        return response()->json([
            'data' => $users->map(fn ($u) => $this->format($u)),
        ]);
    }

    /**
     * POST /api/v1/team/invite
     * Creates a new user under this business with a generated temp password.
     * Returns the temp password ONCE in the response — owner shares it manually.
     */
    public function invite(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole('owner')) {
            return response()->json(['message' => 'Only the business owner can invite team members.'], 403);
        }

        $data = $request->validate([
            'name'      => 'required|string|max:255',
            'email'     => 'required|email|unique:users,email',
            'role'      => 'required|in:manager,executive,read-only',
            // T64 FIX: Make branch_id optional.
            // The original 'required|uuid' blocked the very first invite on any
            // new business that hasn't created branches yet — a chicken-and-egg problem.
            'branch_id' => 'nullable|uuid',
        ]);

        // Only validate branch ownership when a branch_id is actually provided
        if (!empty($data['branch_id'])) {
            $branchExists = \App\Models\Branch::where('id', $data['branch_id'])
                ->where('business_id', $user->business_id)
                ->exists();

            if (! $branchExists) {
                return response()->json(['message' => 'Branch not found.'], 404);
            }
        }

        // Generate a simple temp password: 3 words + 4 digits
        $tempPassword = ucfirst(Str::random(5)) . ucfirst(Str::random(4)) . rand(1000, 9999);

        $newUser = User::create([
            'name'        => $data['name'],
            'email'       => $data['email'],
            'password'    => bcrypt($tempPassword),
            'business_id' => $user->business_id,
            'branch_id'   => $data['branch_id'] ?? null,
            'is_active'   => true,
        ]);

        // Assign Spatie role with sanctum guard
        $role = Role::where('name', $data['role'])
            ->where('guard_name', 'sanctum')
            ->firstOrFail();

        $newUser->assignRole($role);

        return response()->json([
            'user'          => $this->format($newUser->load('branch:id,name')),
            'temp_password' => $tempPassword,
            'message'       => 'User created. Share the temp password with them — it will not be shown again.',
        ], 201);
    }

    /**
     * PUT /api/v1/team/{id}
     * Updates a team member's role, branch, or active status.
     * Owner cannot deactivate themselves.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $authUser = Auth::user();

        if (! $authUser->hasRole('owner')) {
            return response()->json(['message' => 'Only the business owner can update team members.'], 403);
        }

        $member = User::where('id', $id)
            ->where('business_id', $authUser->business_id)
            ->first();

        if (! $member) {
            return response()->json(['message' => 'Team member not found.'], 404);
        }

        $data = $request->validate([
            'role'      => 'sometimes|in:manager,executive,read-only',
            'branch_id' => 'sometimes|uuid',
            'is_active' => 'sometimes|boolean',
        ]);

        // Owner cannot deactivate themselves
        if (isset($data['is_active']) && $data['is_active'] === false && $member->id === $authUser->id) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 422);
        }

        // Validate branch belongs to this business if provided
        if (isset($data['branch_id'])) {
            $branchExists = \App\Models\Branch::where('id', $data['branch_id'])
                ->where('business_id', $authUser->business_id)
                ->exists();

            if (! $branchExists) {
                return response()->json(['message' => 'Branch not found.'], 404);
            }

            $member->branch_id = $data['branch_id'];
        }

        if (isset($data['is_active'])) {
            $member->is_active = $data['is_active'];
        }

        $member->save();

        // Update Spatie role if provided
        if (isset($data['role'])) {
            $role = Role::where('name', $data['role'])
                ->where('guard_name', 'sanctum')
                ->firstOrFail();

            $member->syncRoles([$role]);
        }

        return response()->json($this->format($member->load('branch:id,name')));
    }

    /**
     * DELETE /api/v1/team/{id}
     * Deactivates a user (sets is_active = false).
     * Never hard-deletes — data must be preserved for audit trail.
     */
    public function destroy(string $id): JsonResponse
    {
        $authUser = Auth::user();

        if (! $authUser->hasRole('owner')) {
            return response()->json(['message' => 'Only the business owner can remove team members.'], 403);
        }

        if ($id === (string) $authUser->id) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 422);
        }

        $member = User::where('id', $id)
            ->where('business_id', $authUser->business_id)
            ->first();

        if (! $member) {
            return response()->json(['message' => 'Team member not found.'], 404);
        }

        $member->update(['is_active' => false]);

        return response()->json(['message' => 'Team member deactivated.']);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function format(User $user): array
    {
        return [
            'id'        => $user->id,
            'name'      => $user->name,
            'email'     => $user->email,
            'roles'     => $user->getRoleNames()->values()->toArray(),
            'branch_id' => $user->branch_id,
            'branch'    => $user->branch ? ['id' => $user->branch->id, 'name' => $user->branch->name] : null,
            'is_active' => (bool) $user->is_active,
            'initials'  => collect(explode(' ', $user->name))->map(fn ($w) => strtoupper($w[0] ?? ''))->take(2)->implode(''),
        ];
    }
}
