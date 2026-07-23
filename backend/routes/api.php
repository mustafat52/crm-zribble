<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Auth\Controllers\BranchController;
use App\Modules\Auth\Controllers\BusinessController;
use App\Modules\Auth\Controllers\TeamController;
use App\Modules\Auth\Controllers\ApiKeyController;
use App\Modules\Auth\Controllers\AgencyController;
use App\Modules\Leads\Controllers\LeadController;
use App\Modules\Leads\Controllers\LeadStatusController;
use App\Modules\Leads\Controllers\CustomFieldController;
use App\Modules\Leads\Controllers\IngestController;
use App\Modules\Reports\Controllers\ExportController;
use App\Modules\Notifications\Controllers\PushSubscriptionController;
use App\Modules\WhatsApp\Controllers\WhatsAppTemplateController;
use App\Modules\Automations\Controllers\AutomationController;



// ---------------------------------------------------------------------------
// Health check — public
// ---------------------------------------------------------------------------
Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'crm-api']));

// ---------------------------------------------------------------------------
// Auth — public (no token required)
// ---------------------------------------------------------------------------
Route::prefix('auth')->group(function () {
    Route::post('/login',           [AuthController::class, 'login']);
    Route::post('/refresh',         [AuthController::class, 'refresh']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/verify-otp',      [AuthController::class, 'verifyOtp']);
    Route::post('/reset-password',  [AuthController::class, 'resetPassword']);
});

// ---------------------------------------------------------------------------
// Public ingest — API key auth + rate limit
// ---------------------------------------------------------------------------
Route::middleware(['api_key', 'throttle:100,1'])->group(function () {
    Route::post('ingest/lead', [IngestController::class, 'store']);
});

// ---------------------------------------------------------------------------
// Protected routes — Sanctum Bearer token required
// ---------------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {

    // Auth / session
    Route::post('/auth/logout',              [AuthController::class, 'logout']);
    Route::post('/auth/logout-all',          [AuthController::class, 'logoutAll']);
    Route::get('/auth/devices',              [AuthController::class, 'devices']);
    Route::delete('/auth/devices/{tokenId}', [AuthController::class, 'revokeDevice']);
    Route::get('/me',                        [AuthController::class, 'me']);

    // Business settings
    Route::get('/business',  [BusinessController::class, 'show']);
    Route::put('/business',  [BusinessController::class, 'update']);

    // Automation settings
    Route::get('automations/settings',  [AutomationController::class, 'settings']);
    Route::put('automations/settings',  [AutomationController::class, 'updateSettings']);

    // Lead statuses
    Route::get('/lead-statuses',          [LeadStatusController::class, 'index']);
    Route::post('/lead-statuses',         [LeadStatusController::class, 'store']);
    Route::put('/lead-statuses/{id}',     [LeadStatusController::class, 'update']);
    Route::delete('/lead-statuses/{id}',  [LeadStatusController::class, 'destroy']);

    // Team
    Route::get('/team',            [TeamController::class, 'index']);
    Route::post('/team/invite',    [TeamController::class, 'invite']);
    Route::put('/team/{id}',       [TeamController::class, 'update']);
    Route::delete('/team/{id}',    [TeamController::class, 'destroy']);

    // API Keys
    Route::get('/api-keys',         [ApiKeyController::class, 'index']);
    Route::post('/api-keys',        [ApiKeyController::class, 'store']);
    Route::delete('/api-keys/{id}', [ApiKeyController::class, 'destroy']);

    // Custom fields
    Route::get('/custom-fields',         [CustomFieldController::class, 'index']);
    Route::post('/custom-fields',        [CustomFieldController::class, 'store']);
    Route::put('/custom-fields/{id}',    [CustomFieldController::class, 'update']);
    Route::delete('/custom-fields/{id}', [CustomFieldController::class, 'destroy']);

    // ---------------------------------------------------------------------------
    // Leads — T61: Split into read (all roles) vs mutations (owner|manager|executive)
    // The overdue route MUST be registered before /{id} to prevent Laravel
    // from matching "followups" as a dynamic {id} segment.
    // ---------------------------------------------------------------------------

    // Leads — read (all authenticated roles, including read-only)
    Route::get('/leads/followups/overdue',  [LeadController::class, 'overdueFollowups']);
    Route::get('/leads',                    [LeadController::class, 'index']);
    Route::get('/leads/{id}',               [LeadController::class, 'show']);
    Route::get('/leads/{id}/followups',     [LeadController::class, 'listFollowups']);
    Route::get('leads/{id}/whatsapp',       [WhatsAppTemplateController::class, 'conversations']);

    // Leads — mutations (owner, manager, executive only)
    Route::middleware('role:owner|manager|executive')->group(function () {
        Route::post('/leads',                                   [LeadController::class, 'store']);
        Route::put('/leads/{id}',                               [LeadController::class, 'update']);
        Route::put('/leads/{id}/status',                        [LeadController::class, 'changeStatus']);
        Route::put('/leads/{id}/assign',                        [LeadController::class, 'assign']);
        Route::post('/leads/{id}/notes',                        [LeadController::class, 'addNote']);
        Route::post('/leads/{id}/followup',                     [LeadController::class, 'setFollowUp']);
        Route::post('/leads/{id}/followups/{followupId}/done',  [LeadController::class, 'markFollowupDone']);
    });

    // Branches
    Route::get('/branches',             [BranchController::class, 'index']);
    Route::post('/branches',            [BranchController::class, 'store']);
    Route::put('/branches/{id}',        [BranchController::class, 'update']);
    Route::put('/branches/{id}/toggle', [BranchController::class, 'toggleActive']);
    Route::delete('/branches/{id}',     [BranchController::class, 'destroy']);
    Route::get('/branches/{id}',         [BranchController::class, 'show']);
    Route::post('/branches/{id}/switch', [BranchController::class, 'switchBranch']);

    // In-app notifications
    Route::get('/notifications',            [\App\Modules\Notifications\Controllers\InAppNotificationController::class, 'index']);
    Route::post('/notifications/read-all',  [\App\Modules\Notifications\Controllers\InAppNotificationController::class, 'markAllRead']);
    Route::post('/notifications/{id}/read', [\App\Modules\Notifications\Controllers\InAppNotificationController::class, 'markRead']);

    // Push notifications
    Route::get('/push/vapid-public-key', [PushSubscriptionController::class, 'vapidPublicKey']);
    Route::post('/push/subscribe',       [PushSubscriptionController::class, 'subscribe']);
    Route::delete('/push/subscribe',     [PushSubscriptionController::class, 'unsubscribe']);

    // Reports
    Route::get('reports/dashboard',    [\App\Modules\Reports\Controllers\ReportsController::class, 'dashboard']);
    Route::get('reports/action-queue', [\App\Modules\Reports\Controllers\ReportsController::class, 'actionQueue']);
    Route::get('reports/activity',     [\App\Modules\Reports\Controllers\ReportsController::class, 'recentActivity']);
    Route::get('reports/leads',        [\App\Modules\Reports\Controllers\ReportsController::class, 'leads']);
    Route::get('reports/team',         [\App\Modules\Reports\Controllers\ReportsController::class, 'team']);
    Route::get('reports/sources',      [\App\Modules\Reports\Controllers\ReportsController::class, 'sources']);

    // Exports — T54 FIX: download route moved inside auth:sanctum (was public at bottom of file)
    Route::post('reports/exports',                    [ExportController::class, 'start']);
    Route::get('reports/exports/{exportId}/status',   [ExportController::class, 'status']);
    Route::get('reports/exports/{exportId}/download', [ExportController::class, 'download']);

    // WhatsApp Templates
    Route::get('whatsapp/templates',         [WhatsAppTemplateController::class, 'index']);
    Route::post('whatsapp/templates',        [WhatsAppTemplateController::class, 'store']);
    Route::put('whatsapp/templates/{id}',    [WhatsAppTemplateController::class, 'update']);
    Route::delete('whatsapp/templates/{id}', [WhatsAppTemplateController::class, 'destroy']);

    // Agency panel
    Route::middleware('agency_access')->prefix('agency')->group(function () {
        Route::get('stats',                  [\App\Modules\Auth\Controllers\AgencyController::class, 'stats']);
        Route::get('businesses',             [\App\Modules\Auth\Controllers\AgencyController::class, 'businesses']);
        Route::get('businesses/{id}',        [\App\Modules\Auth\Controllers\AgencyController::class, 'showBusiness']);
        Route::put('businesses/{id}/toggle', [\App\Modules\Auth\Controllers\AgencyController::class, 'toggleBusiness']);
        Route::get('staff',                  [\App\Modules\Auth\Controllers\AgencyController::class, 'staffList']);
        Route::post('staff',                 [\App\Modules\Auth\Controllers\AgencyController::class, 'inviteStaff']);
        Route::post('staff/{staffId}/assign',   [\App\Modules\Auth\Controllers\AgencyController::class, 'assignBusiness']);
        Route::delete('staff/{staffId}/assign', [\App\Modules\Auth\Controllers\AgencyController::class, 'unassignBusiness']);
    });

});

// NOTE: The export download route that previously lived here (outside auth:sanctum) has been
// moved inside the middleware group above. This line is intentionally removed (T54 fix).
