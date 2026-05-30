<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAgencyAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasRole('agency_admin')) {
            return response()->json(['message' => 'Forbidden. Agency admin access required.'], 403);
        }

        return $next($request);
    }
}