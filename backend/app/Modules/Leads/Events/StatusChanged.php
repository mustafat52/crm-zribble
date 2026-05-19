<?php

namespace App\Modules\Leads\Events;

use App\Modules\Leads\Models\Lead;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StatusChanged
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Lead $lead,
        public readonly string $oldStatusId,
        public readonly string $newStatusId
    ) {}
}