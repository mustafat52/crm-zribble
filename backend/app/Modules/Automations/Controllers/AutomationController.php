<?php

namespace App\Modules\Automations\Controllers;

use App\Models\AutomationLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AutomationController extends Controller
{
    /**
     * GET /api/v1/automations/settings
     * Returns business automation config + recent run logs (last 30 rows).
     *
     * T95 FIX: followup_customer_email now read from businesses.settings JSON,
     * not hardcoded true. Default remains true for backward compatibility.
     */
    public function settings(): JsonResponse
    {
        $user     = Auth::user();
        $business = DB::table('businesses')
            ->where('id', $user->business_id)
            ->first(['settings']);

        $settings  = json_decode($business->settings ?? '{}', true) ?? [];
        $staleDays = (int) ($settings['stale_lead_days'] ?? 3);

        $recentLogs = AutomationLog::where('business_id', $user->business_id)
            ->orderByDesc('created_at')
            ->limit(30)
            ->get(['automation_type', 'recipient_email', 'status', 'metadata', 'created_at']);

        $summary = DB::table('automation_logs')
            ->where('business_id', $user->business_id)
            ->where('created_at', '>=', now()->subDays(7))
            ->selectRaw('automation_type, status, COUNT(*) as total')
            ->groupBy('automation_type', 'status')
            ->get();

        return response()->json([
            'stale_lead_days'         => $staleDays,
            'followup_customer_email' => $settings['followup_customer_email'] ?? true, // T95 fix
            'recent_logs'             => $recentLogs,
            'summary'                 => $summary,
        ]);
    }

    /**
     * PUT /api/v1/automations/settings
     * Updates stale_lead_days (and optionally followup_customer_email) in businesses.settings JSON.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $request->validate([
            'stale_lead_days'         => 'required|integer|min:0|max:30',
            'followup_customer_email' => 'sometimes|boolean',
        ]);

        $user = Auth::user();

        $existing = DB::table('businesses')
            ->where('id', $user->business_id)
            ->value('settings');

        $settings                    = json_decode($existing ?? '{}', true) ?? [];
        $settings['stale_lead_days'] = (int) $request->stale_lead_days;

        if ($request->has('followup_customer_email')) {
            $settings['followup_customer_email'] = (bool) $request->followup_customer_email;
        }

        DB::table('businesses')
            ->where('id', $user->business_id)
            ->update(['settings' => json_encode($settings)]);

        return response()->json([
            'message'                 => 'Automation settings saved.',
            'stale_lead_days'         => $settings['stale_lead_days'],
            'followup_customer_email' => $settings['followup_customer_email'] ?? true,
        ]);
    }
}
