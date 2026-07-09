<?php

namespace App\Modules\Notifications\Listeners;

use App\Modules\Leads\Events\StatusChanged;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * T94 — Log a 'status_changed' activity row when a lead's status changes.
 * Fires on the StatusChanged event dispatched by LeadService::changeStatus().
 */
class LogStatusChanged
{
    public function handle(StatusChanged $event): void
    {
        DB::table('lead_activities')->insert([
            'id'          => Str::uuid()->toString(),
            'lead_id'     => $event->lead->id,
            'business_id' => $event->lead->business_id,
            'user_id'     => null, // status change actor recorded in metadata if needed
            'type'        => 'status_changed',
            'description' => 'Lead status changed.',
            'metadata'    => json_encode([
                'old_status_id' => $event->oldStatusId,
                'new_status_id' => $event->newStatusId,
            ]),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }
}
