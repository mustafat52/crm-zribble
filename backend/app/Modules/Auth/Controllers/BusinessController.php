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
     * Updates name, timezone, whatsapp_number, settings.duplicate_handling,
     * and WhatsApp notification toggles.
     *
     * T71 FIX: Accept and persist WhatsApp toggle settings.
     * Previously, the frontend sent wa_new_lead_alert, wa_customer_acknowledgement,
     * wa_followup_reminder inside a `settings` object, but BusinessController ignored them.
     * The toggles appeared to work in the UI but were never saved.
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
            // T71: Accept WhatsApp notification toggle settings
            'settings'                              => 'sometimes|array',
            'settings.wa_new_lead_alert'            => 'sometimes|boolean',
            'settings.wa_customer_acknowledgement'  => 'sometimes|boolean',
            'settings.wa_followup_reminder'         => 'sometimes|boolean',
        ]);

        $business = Business::find($user->business_id);

        if (! $business) {
            return response()->json(['message' => 'Business not found.'], 404);
        }

        // Update top-level columns
        if (isset($data['name']))            $business->name         = $data['name'];
        if (isset($data['timezone']))        $business->timezone     = $data['timezone'];
        if (array_key_exists('whatsapp_number', $data)) {
            $business->whatsapp_number = $data['whatsapp_number'];
        }

        // Merge all settings keys into the existing settings JSON
        // This preserves any existing keys (like stale_lead_days) while updating only
        // what was sent in this request.
        $settings = $business->settings ?? [];

        if (isset($data['duplicate_handling'])) {
            $settings['duplicate_handling'] = $data['duplicate_handling'];
        }

        // T71: Persist WhatsApp notification toggles into settings JSON
        if (isset($data['settings']['wa_new_lead_alert'])) {
            $settings['wa_new_lead_alert'] = $data['settings']['wa_new_lead_alert'];
        }
        if (isset($data['settings']['wa_customer_acknowledgement'])) {
            $settings['wa_customer_acknowledgement'] = $data['settings']['wa_customer_acknowledgement'];
        }
        if (isset($data['settings']['wa_followup_reminder'])) {
            $settings['wa_followup_reminder'] = $data['settings']['wa_followup_reminder'];
        }

        $business->settings = $settings;
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
