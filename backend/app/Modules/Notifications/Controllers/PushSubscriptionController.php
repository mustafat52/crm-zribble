<?php

namespace App\Modules\Notifications\Controllers;

use App\Models\PushSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class PushSubscriptionController extends Controller
{
    /**
     * POST /api/v1/push/subscribe
     *
     * Saves a browser push subscription for the authenticated user.
     * Called by the frontend after the user grants notification permission
     * and the browser returns a PushSubscription object.
     *
     * If the same endpoint already exists (same browser, re-subscribing),
     * we update the keys — they can rotate after browser updates.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string|url',
            'p256dh'   => 'required|string',
            'auth'     => 'required|string',
        ]);

        $user = $request->user();

        // updateOrCreate on endpoint: same browser re-subscribing gets updated keys
        PushSubscription::updateOrCreate(
            ['endpoint' => $request->endpoint],
            [
                'user_id'    => $user->id,
                'p256dh'     => $request->p256dh,
                'auth'       => $request->auth,
                'user_agent' => $request->userAgent(),
            ]
        );

        return response()->json(['message' => 'Subscribed to push notifications.'], 201);
    }

    /**
     * DELETE /api/v1/push/subscribe
     *
     * Removes a push subscription. Called when the user turns off
     * notifications or signs out. Matches on endpoint because that
     * is the unique identifier for a specific browser/device combination.
     */
    public function unsubscribe(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        $user = $request->user();

        // Only delete if this subscription belongs to the requesting user
        PushSubscription::where('endpoint', $request->endpoint)
            ->where('user_id', $user->id)
            ->delete();

        return response()->json(['message' => 'Unsubscribed from push notifications.']);
    }

    /**
     * GET /api/v1/push/vapid-public-key
     *
     * Returns the VAPID public key so the frontend can subscribe.
     * This endpoint is public (still behind auth:sanctum but no sensitive data).
     */
    public function vapidPublicKey(): JsonResponse
    {
        return response()->json([
            'public_key' => env('VAPID_PUBLIC_KEY', ''),
        ]);
    }
}