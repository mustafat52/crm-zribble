<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Leads\Controllers\CustomFieldController;

/*
|--------------------------------------------------------------------------
| API Routes — CRM Platform
| All routes prefixed with /api/v1 (set in bootstrap/app.php)
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

});