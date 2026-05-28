<?php

namespace App\Modules\Reports\Jobs;

use App\Modules\Reports\Exports\LeadsExport;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Maatwebsite\Excel\Facades\Excel;

class ExportLeadsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 120;
    public int $tries = 2;

    public function __construct(
        private string $exportId,
        private string $businessId,
        private ?string $branchId = null,
        private ?string $statusId = null,
        private ?string $source = null,
        private ?string $dateFrom = null,
        private ?string $dateTo = null,
    ) {}

    public function handle(): void
    {
        // Mark as processing
        Cache::put("export:{$this->exportId}", [
            'status' => 'processing',
            'url'    => null,
            'error'  => null,
        ], now()->addHours(2));

        try {
            $filename = "exports/leads-{$this->exportId}.xlsx";

            Excel::store(
                new LeadsExport(
                    businessId: $this->businessId,
                    branchId:   $this->branchId,
                    statusId:   $this->statusId,
                    source:     $this->source,
                    dateFrom:   $this->dateFrom,
                    dateTo:     $this->dateTo,
                ),
                $filename,
                'local'
            );


            // Ensure www-data (PHP-FPM) can read the file written by the queue worker
            @chmod(storage_path("app/{$filename}"), 0755);
            
            
            Cache::put("export:{$this->exportId}", [
                'status' => 'ready',
                'url'    => "/api/v1/reports/exports/{$this->exportId}/download",
                'error'  => null,
            ], now()->addHours(2));

        } catch (\Throwable $e) {
            Cache::put("export:{$this->exportId}", [
                'status' => 'failed',
                'url'    => null,
                'error'  => $e->getMessage(),
            ], now()->addHours(2));
        }
    }
}