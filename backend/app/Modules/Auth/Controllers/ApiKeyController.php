<?php

namespace App\Modules\Auth\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use App\Models\ApiKey;

class ApiKeyController extends Controller
{
    /**
     * GET /api/v1/api-keys
     * Lists all API keys for this business.
     * NEVER returns the raw key — only prefix, name, status, last used.
     */
    public function index(): JsonResponse
    {
        $keys = ApiKey::where('business_id', Auth::user()->business_id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($keys->map(fn ($k) => $this->format($k)));
    }

    /**
     * POST /api/v1/api-keys
     * Generates a new API key.
     * Returns the raw key ONCE in the response — never stored plain, only the hash is saved.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
        ]);

        $generated = ApiKey::generate();

        $key = ApiKey::create([
            'business_id' => Auth::user()->business_id,
            'name'        => $data['name'],
            'key_hash'    => $generated['hash'],
            'key_prefix'  => $generated['prefix'],
            'is_active'   => true,
        ]);

        return response()->json([
            'key'     => $this->format($key),
            'raw_key' => $generated['raw'],
            'warning' => 'Save this key now. It will never be shown again.',
        ], 201);
    }

    /**
     * DELETE /api/v1/api-keys/{id}
     * Deactivates (revokes) an API key.
     * Never hard-deletes — last_used_at history must be preserved.
     */
    public function destroy(string $id): JsonResponse
    {
        $key = ApiKey::where('id', $id)
            ->where('business_id', Auth::user()->business_id)
            ->first();

        if (! $key) {
            return response()->json(['message' => 'API key not found.'], 404);
        }

        $key->update(['is_active' => false]);

        return response()->json(['message' => 'API key revoked.']);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function format(ApiKey $key): array
    {
        return [
            'id'           => $key->id,
            'name'         => $key->name,
            'key_prefix'   => $key->key_prefix,
            'is_active'    => (bool) $key->is_active,
            'last_used_at' => $key->last_used_at?->toISOString(),
            'expires_at'   => $key->expires_at?->toISOString(),
            'created_at'   => $key->created_at->toISOString(),
        ];
    }
}