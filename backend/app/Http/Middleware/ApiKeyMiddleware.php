<?php

namespace App\Http\Middleware;

use App\Models\ApiKey;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiKeyMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $rawKey = $request->header('X-API-Key');

        // No key provided
        if (!$rawKey) {
            return response()->json([
                'message' => 'API key required. Pass it via X-API-Key header.',
            ], 401);
        }

        // Look up by hash
        $apiKey = ApiKey::findByRawKey($rawKey);

        if (!$apiKey) {
            return response()->json([
                'message' => 'Invalid or inactive API key.',
            ], 401);
        }

        // Check expiry
        if ($apiKey->expires_at && $apiKey->expires_at->isPast()) {
            return response()->json([
                'message' => 'API key has expired.',
            ], 401);
        }

        // Attach business_id to the request so IngestController can read it
        $request->merge(['_api_business_id' => $apiKey->business_id]);

        // Update last_used_at (non-blocking — fire and forget)
        $apiKey->updateQuietly(['last_used_at' => now()]);

        return $next($request);
    }
}