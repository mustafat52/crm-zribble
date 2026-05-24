<?php

namespace App\Modules\Notifications\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Notifications\Models\InAppNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InAppNotificationController extends Controller
{
    // GET /api/v1/notifications
    // Returns last 20 notifications for the logged-in user + unread count
    public function index(Request $request)
    {
        $user = Auth::user();

        $notifications = InAppNotification::where('user_id', $user->id)
            ->where('business_id', $user->business_id)
            ->orderByDesc('created_at')
            ->limit(20)
            ->get();

        $unreadCount = InAppNotification::where('user_id', $user->id)
            ->where('business_id', $user->business_id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $unreadCount,
        ]);
    }

    // POST /api/v1/notifications/{id}/read
    // Marks a single notification as read
    public function markRead(Request $request, string $id)
    {
        $user = Auth::user();

        $notification = InAppNotification::where('id', $id)
            ->where('user_id', $user->id)
            ->where('business_id', $user->business_id)
            ->firstOrFail();

        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json(['message' => 'Marked as read']);
    }

    // POST /api/v1/notifications/read-all
    // Marks all unread notifications as read
    public function markAllRead(Request $request)
    {
        $user = Auth::user();

        InAppNotification::where('user_id', $user->id)
            ->where('business_id', $user->business_id)
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json(['message' => 'All marked as read']);
    }
}