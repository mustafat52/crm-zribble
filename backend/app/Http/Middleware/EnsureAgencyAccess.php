<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureAgencyAccess
{
    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $allowed = $user->hasRole('agency_admin', 'sanctum')
            || $user->hasRole('agency_staff', 'sanctum');

        if (!$allowed) {
            return response()->json([
                'message' => 'Access denied. Agency account required.',
            ], 403);
        }

        return $next($request);
    }
}
