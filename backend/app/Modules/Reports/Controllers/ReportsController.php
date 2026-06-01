<?php

namespace App\Modules\Reports\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use App\Modules\Reports\Services\ReportService;

class ReportsController extends Controller
{
    public function __construct(private ReportService $reportService) {}

    /** GET /reports/dashboard */
    public function dashboard(Request $request)
    {
        $filters = $request->only(['branch_id']);
        return response()->json($this->reportService->dashboardStats($filters));
    }

    /** GET /reports/action-queue */
    public function actionQueue(Request $request)
    {
        $filters = $request->only(['branch_id']);
        return response()->json($this->reportService->actionQueue($filters));
    }

    /** GET /reports/activity */
    public function recentActivity(Request $request)
    {
        $filters = $request->only(['branch_id']);
        return response()->json($this->reportService->recentActivity($filters));
    }

    /** GET /reports/leads */
    public function leads(Request $request)
    {
        $filters = $request->only(['branch_id', 'source', 'status_id', 'assigned_to', 'date_from', 'date_to']);
        return response()->json($this->reportService->leadsReport($filters));
    }

    /** GET /reports/team */
    public function team(Request $request)
    {
        $filters = $request->only(['branch_id', 'date_from', 'date_to']);
        return response()->json($this->reportService->teamReport($filters));
    }

    /** GET /reports/sources */
    public function sources(Request $request)
    {
        $filters = $request->only(['branch_id', 'date_from', 'date_to']);
        return response()->json($this->reportService->sourcesReport($filters));
    }
}