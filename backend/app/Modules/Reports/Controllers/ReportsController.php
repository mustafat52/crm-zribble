<?php

namespace App\Modules\Reports\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reports\Services\ReportService;
use Illuminate\Http\JsonResponse;

class ReportsController extends Controller
{
    public function __construct(
        private readonly ReportService $service
    ) {}

    /**
     * GET /api/v1/reports/dashboard
     * Returns cached dashboard stats for the authenticated business.
     */
    public function dashboard(): JsonResponse
    {
        return response()->json($this->service->dashboardStats());
    }
}