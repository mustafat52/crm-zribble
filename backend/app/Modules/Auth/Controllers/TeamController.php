<?php

namespace App\Modules\Auth\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class TeamController
{
    /**
     * GET /api/v1/team
     * Returns all active users belonging to the authenticated user's business.
     * Used by the lead detail page assign dropdown.
     */
    public function index(Request $request): JsonResponse
    {
        $user = Auth::user();

        $members = User::where('business_id', $user->business_id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn (User $u) => [
                'id'        => $u->id,
                'name'      => $u->name,
                'email'     => $u->email,
                'role'      => $u->getRoleNames()->first() ?? 'executive',
                'branch_id' => $u->branch_id,
                'initials'  => $this->initials($u->name),
            ]);

        return response()->json(['data' => $members]);
    }

    private function initials(string $name): string
    {
        $words = explode(' ', trim($name));
        if (count($words) === 1) {
            return strtoupper(substr($words[0], 0, 2));
        }
        return strtoupper(substr($words[0], 0, 1) . substr($words[1], 0, 1));
    }
}