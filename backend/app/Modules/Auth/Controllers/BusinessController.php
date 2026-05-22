<?php

namespace App\Modules\Auth\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use App\Models\Business;

class BusinessController extends Controller
{
    /**
     * GET /api/v1/business
     * Returns the authenticated user's business record.
     */
    public function show(): JsonResponse
    {
        $user     = Auth::user();
        $business = Business::find($user->business_id);

        if (! $business) {
            return response()->json(['message' => 'Business not found.'], 404);
        }

        return response()->json($this->format($business));
    }

    /**
     * PUT /api/v1/business
     * Updates name, timezone, whatsapp_number, and settings.duplicate_handling.
     * Only the owner role may call this endpoint.
     */
    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (! $user->hasRole('owner')) {
            return response()->json(['message' => 'Only the business owner can update settings.'], 403);
        }

        $data = $request->validate([
            'name'               => 'sometimes|required|string|max:255',
            'timezone'           => 'sometimes|required|string|max:100',
            'whatsapp_number'    => 'sometimes|nullable|string|max:20',
            'duplicate_handling' => 'sometimes|in:merge,new',
        ]);

        $business = Business::find($user->business_id);

        if (! $business) {
            return response()->json(['message' => 'Business not found.'], 404);
        }

        // Update top-level columns
        if (isset($data['name']))            $business->name             = $data['name'];
        if (isset($data['timezone']))        $business->timezone         = $data['timezone'];
        if (array_key_exists('whatsapp_number', $data)) {
            $business->whatsapp_number = $data['whatsapp_number'];
        }

        // Merge duplicate_handling into settings JSON — keep all other settings untouched
        if (isset($data['duplicate_handling'])) {
            $settings = $business->settings ?? [];
            $settings['duplicate_handling'] = $data['duplicate_handling'];
            $business->settings = $settings;
        }

        $business->save();

        return response()->json($this->format($business));
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function format(Business $business): array
    {
        return [
            'id'                  => $business->id,
            'name'                => $business->name,
            'slug'                => $business->slug,
            'whatsapp_number'     => $business->whatsapp_number,
            'whatsapp_provider'   => $business->whatsapp_provider,
            'timezone'            => $business->timezone,
            'plan'                => $business->plan,
            'features'            => $business->features ?? [],
            'settings'            => $business->settings ?? [],
            'duplicate_handling'  => ($business->settings ?? [])['duplicate_handling'] ?? 'merge',
            'is_active'           => $business->is_active,
        ];
    }
}