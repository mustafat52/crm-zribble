<?php

namespace App\Modules\Reports\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use App\Modules\Reports\Services\ReportService;

class ReportsController extends Controller
{
    public function __construct(protected ReportService $reportService) {}

    // GET /api/v1/reports/dashboard
    public function dashboard(): JsonResponse
    {
        return response()->json($this->reportService->dashboardStats());
    }

    // GET /api/v1/reports/leads
    public function leads(Request $request): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to', 'source', 'status_id', 'branch_id', 'assigned_to']);
        return response()->json($this->reportService->leadsReport($filters));
    }

    // GET /api/v1/reports/team
    public function team(Request $request): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to', 'branch_id']);
        return response()->json($this->reportService->teamReport($filters));
    }

    // GET /api/v1/reports/sources
    public function sources(Request $request): JsonResponse
    {
        $filters = $request->only(['date_from', 'date_to', 'branch_id']);
        return response()->json($this->reportService->sourcesReport($filters));
    }
}