<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Leads\Controllers\CustomFieldController;
use App\Modules\Leads\Controllers\IngestController;
use App\Modules\Leads\Controllers\LeadController;

/*
|--------------------------------------------------------------------------
| API Routes — CRM Platform
| All routes prefixed with /api/v1 (set via apiPrefix in bootstrap/app.php)
|--------------------------------------------------------------------------
*/

// -------------------------------------------------------------------------
// PUBLIC ROUTES — no auth required
// -------------------------------------------------------------------------
Route::prefix('auth')->group(function () {
    Route::post('login',           [AuthController::class, 'login']);
    Route::post('refresh',         [AuthController::class, 'refresh']);
    Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('reset-password',  [AuthController::class, 'resetPassword']);
});

// -------------------------------------------------------------------------
// INGEST ROUTES — public, API key auth via X-API-Key header (T20)
// -------------------------------------------------------------------------
Route::middleware(['api_key', 'throttle:100,1'])->group(function () {
    Route::post('ingest/lead', [IngestController::class, 'store']);
});

// -------------------------------------------------------------------------
// PROTECTED ROUTES — Sanctum token required
// -------------------------------------------------------------------------
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('logout',              [AuthController::class, 'logout']);
        Route::post('logout-all',          [AuthController::class, 'logoutAll']);
        Route::get('devices',              [AuthController::class, 'devices']);
        Route::delete('devices/{tokenId}', [AuthController::class, 'revokeDevice']);
    });

    // Current user
    Route::get('me', [AuthController::class, 'me']);

    // Custom Fields (T18)
    Route::prefix('custom-fields')->group(function () {
        Route::get('/',        [CustomFieldController::class, 'index']);
        Route::post('/',       [CustomFieldController::class, 'store']);
        Route::put('/{id}',    [CustomFieldController::class, 'update']);
        Route::delete('/{id}', [CustomFieldController::class, 'destroy']);
    });

    // Leads (T19)
    Route::prefix('leads')->group(function () {
        Route::get('/',               [LeadController::class, 'index']);
        Route::post('/',              [LeadController::class, 'store']);
        Route::get('/{id}',           [LeadController::class, 'show']);
        Route::put('/{id}',           [LeadController::class, 'update']);
        Route::put('/{id}/status',    [LeadController::class, 'changeStatus']);
        Route::put('/{id}/assign',    [LeadController::class, 'assign']);
        Route::post('/{id}/notes',    [LeadController::class, 'addNote']);
        Route::post('/{id}/followup', [LeadController::class, 'setFollowUp']);
    });

});