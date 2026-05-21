<?php

use Illuminate\Support\Facades\Route;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Auth\Controllers\TeamController;
use App\Modules\Leads\Controllers\LeadController;
use App\Modules\Leads\Controllers\LeadStatusController;
use App\Modules\Leads\Controllers\CustomFieldController;
use App\Modules\Leads\Controllers\IngestController;
use App\Modules\Auth\Controllers\BranchController;

// ── Health check ──────────────────────────────────────────────────────────────
Route::get('/health', fn () => response()->json(['status' => 'ok', 'service' => 'crm-api']));

// ── Public auth routes (no token required) ────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/login',           [AuthController::class, 'login']);
    Route::post('/refresh',         [AuthController::class, 'refresh']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password',  [AuthController::class, 'resetPassword']);
});

// ── Public ingest (API key auth + rate limit) ─────────────────────────────────
Route::middleware(['api_key', 'throttle:100,1'])->group(function () {
    Route::post('ingest/lead', [IngestController::class, 'store']);
});

// ── Protected routes (Sanctum Bearer token required) ─────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/auth/logout',              [AuthController::class, 'logout']);
    Route::post('/auth/logout-all',          [AuthController::class, 'logoutAll']);
    Route::get('/auth/devices',              [AuthController::class, 'devices']);
    Route::delete('/auth/devices/{tokenId}', [AuthController::class, 'revokeDevice']);
    Route::get('/me',                        [AuthController::class, 'me']);

    // Team members (for assign dropdown)
    Route::get('/team', [TeamController::class, 'index']);

    // Lead statuses (for status change dropdown)
    Route::get('/lead-statuses', [LeadStatusController::class, 'index']);

    // Custom fields
    Route::get('/custom-fields',       [CustomFieldController::class, 'index']);
    Route::post('/custom-fields',      [CustomFieldController::class, 'store']);
    Route::put('/custom-fields/{id}',  [CustomFieldController::class, 'update']);
    Route::delete('/custom-fields/{id}', [CustomFieldController::class, 'destroy']);

    // Leads
    Route::get('/leads',                    [LeadController::class, 'index']);
    Route::post('/leads',                   [LeadController::class, 'store']);
    Route::get('/leads/{id}',               [LeadController::class, 'show']);
    Route::put('/leads/{id}',               [LeadController::class, 'update']);
    Route::put('/leads/{id}/status',        [LeadController::class, 'changeStatus']);
    Route::put('/leads/{id}/assign',        [LeadController::class, 'assign']);
    Route::post('/leads/{id}/notes',        [LeadController::class, 'addNote']);
    Route::post('/leads/{id}/followup',     [LeadController::class, 'setFollowUp']);

    // Branches
    Route::get('/branches',                 [BranchController::class, 'index']);
    Route::post('/branches',                [BranchController::class, 'store']);
    Route::put('/branches/{id}',            [BranchController::class, 'update']);
    Route::put('/branches/{id}/toggle',     [BranchController::class, 'toggleActive']);
    Route::delete('/branches/{id}',         [BranchController::class, 'destroy']);
});