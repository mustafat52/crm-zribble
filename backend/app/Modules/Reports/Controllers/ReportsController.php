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
        // T87 FIX: Validate branch_id to ensure it's a valid UUID format.
        // Previously, all filter params were passed raw to the service with no validation.
        // An invalid branch_id could reach a subquery raw SQL causing DB errors.
        $filters = $request->validate([
            'branch_id' => 'nullable|uuid',
        ]);

        return response()->json($this->reportService->dashboardStats($filters));
    }

    /** GET /reports/action-queue */
    public function actionQueue(Request $request)
    {
        $filters = $request->validate([
            'branch_id' => 'nullable|uuid',
        ]);

        return response()->json($this->reportService->actionQueue($filters));
    }

    /** GET /reports/activity */
    public function recentActivity(Request $request)
    {
        $filters = $request->validate([
            'branch_id' => 'nullable|uuid',
        ]);

        return response()->json($this->reportService->recentActivity($filters));
    }

    /** GET /reports/leads */
    public function leads(Request $request)
    {
        // T87 FIX: Validate all filter parameters before passing to service.
        // The original passed unvalidated query strings directly — an invalid date
        // like "notadate" would reach whereDate() and throw a DB exception.
        // branch_id is used in subqueries, so UUID format validation is critical.
        $filters = $request->validate([
            'branch_id'   => 'nullable|uuid',
            'source'      => 'nullable|string|max:100',
            'status_id'   => 'nullable|uuid',
            'assigned_to' => 'nullable|uuid',
            'date_from'   => 'nullable|date',
            'date_to'     => 'nullable|date',
        ]);

        return response()->json($this->reportService->leadsReport($filters));
    }

    /** GET /reports/team */
    public function team(Request $request)
    {
        $filters = $request->validate([
            'branch_id' => 'nullable|uuid',
            'date_from' => 'nullable|date',
            'date_to'   => 'nullable|date',
        ]);

        return response()->json($this->reportService->teamReport($filters));
    }

    /** GET /reports/sources */
    public function sources(Request $request)
    {
        $filters = $request->validate([
            'branch_id' => 'nullable|uuid',
            'date_from' => 'nullable|date',
            'date_to'   => 'nullable|date',
        ]);

        return response()->json($this->reportService->sourcesReport($filters));
    }
}
