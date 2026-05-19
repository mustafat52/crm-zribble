<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    protected function redirectTo(Request $request): ?string
    {
        // For API routes, return null so Laravel throws an
        // AuthenticationException instead of redirecting to a login page
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }

        return route('login');
    }
}