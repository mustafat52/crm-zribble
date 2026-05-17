<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — CRM Platform
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api/v1 automatically via bootstrap/app.php.
| Auth routes are public. Everything else requires a valid Sanctum token.
|
*/

// Health check — used by Docker and CI to confirm the API is up
Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'crm-api']));

// Auth routes — public (no token required)
Route::prefix('v1/auth')->group(function () {
    Route::post('/login',           [\App\Modules\Auth\Controllers\AuthController::class, 'login']);
    Route::post('/refresh',         [\App\Modules\Auth\Controllers\AuthController::class, 'refresh']);
    Route::post('/forgot-password', [\App\Modules\Auth\Controllers\AuthController::class, 'forgotPassword']);
    Route::post('/reset-password',  [\App\Modules\Auth\Controllers\AuthController::class, 'resetPassword']);
});

// Protected routes — valid Sanctum token required
Route::prefix('v1')->middleware('auth:sanctum')->group(function () {

    // Auth — logout actions
    Route::post('/auth/logout',     [\App\Modules\Auth\Controllers\AuthController::class, 'logout']);
    Route::post('/auth/logout-all', [\App\Modules\Auth\Controllers\AuthController::class, 'logoutAll']);
    Route::get('/auth/devices',     [\App\Modules\Auth\Controllers\AuthController::class, 'devices']);
    Route::delete('/auth/devices/{tokenId}', [\App\Modules\Auth\Controllers\AuthController::class, 'revokeDevice']);

    // Current user
    Route::get('/me', [\App\Modules\Auth\Controllers\AuthController::class, 'me']);

    // --- Leads (Week 2) ---
    // Route::apiResource('leads', \App\Modules\Leads\Controllers\LeadController::class);

    // --- Reports (Week 4) ---
    // Route::get('/reports/dashboard', [\App\Modules\Reports\Controllers\ReportController::class, 'dashboard']);

});

// Public ingest — API key auth (no Sanctum token, separate middleware)
Route::prefix('v1/ingest')->group(function () {
    // Route::post('/lead', [\App\Modules\Leads\Controllers\IngestController::class, 'store']);
});

// WhatsApp webhook — HMAC verified (Week 3)
Route::prefix('v1/webhooks')->group(function () {
    // Route::post('/whatsapp', [\App\Modules\WhatsApp\Controllers\WebhookController::class, 'handle']);
});