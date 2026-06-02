<?php

namespace App\Modules\Automations\Jobs;

use App\Modules\Automations\Services\AutomationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendStaleLeadNudges implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    // Horizon config: run on 'reminders' queue
    // Set in constructor via $this->onQueue() — avoids PHP 8.3 $queue property conflict
    public function __construct()
    {
        $this->onQueue('reminders');
    }

    /**
     * Runs daily at 9 AM (registered in routes/console.php).
     * Iterates all active businesses and sends stale lead nudge emails.
     */
    public function handle(AutomationService $service): void
    {
        Log::info('[SendStaleLeadNudges] Starting stale lead nudge run');

        $service->runStaleLeadNudges();

        Log::info('[SendStaleLeadNudges] Stale lead nudge run complete');
    }
}