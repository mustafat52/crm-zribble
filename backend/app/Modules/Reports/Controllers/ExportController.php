<?php

namespace App\Modules\Reports\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Reports\Jobs\ExportLeadsJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExportController extends Controller
{
    // POST /api/v1/reports/exports
    // Dispatches the background job and returns an export ID
    public function start(Request $request): \Illuminate\Http\JsonResponse
    {
        $exportId = Str::uuid()->toString();
        $user     = $request->user();

        // Mark as queued immediately
        Cache::put("export:{$exportId}", [
            'status' => 'queued',
            'url'    => null,
            'error'  => null,
        ], now()->addHours(2));

        ExportLeadsJob::dispatch(
            exportId:   $exportId,
            businessId: $user->business_id,
            branchId:   $request->query('branch_id'),
            statusId:   $request->query('status_id'),
            source:     $request->query('source'),
            dateFrom:   $request->query('date_from'),
            dateTo:     $request->query('date_to'),
        )->onQueue('reports');

        return response()->json([
            'export_id'  => $exportId,
            'status'     => 'queued',
            'poll_url'   => "/api/v1/reports/exports/{$exportId}/status",
        ], 202);
    }

    // GET /api/v1/reports/exports/{exportId}/status
    // Frontend polls this every 2 seconds
    public function status(string $exportId): \Illuminate\Http\JsonResponse
    {
        $data = Cache::get("export:{$exportId}");

        if (!$data) {
            return response()->json(['error' => 'Export not found or expired'], 404);
        }

        return response()->json($data);
    }

    // GET /api/v1/reports/exports/{exportId}/download
    // Returns the actual file
    public function download(string $exportId): BinaryFileResponse|\Illuminate\Http\JsonResponse
    {
        $data = Cache::get("export:{$exportId}");

        if (!$data || $data['status'] !== 'ready') {
            return response()->json(['error' => 'Export not ready'], 404);
        }

        $path = storage_path("app/exports/leads-{$exportId}.xlsx");

        if (!file_exists($path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        return response()->download(
            $path,
            'leads-export-' . now()->format('d-M-Y') . '.xlsx',
            ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        );
    }
}