<?php

namespace App\Modules\Notifications\Listeners;

use App\Modules\Leads\Events\LeadAssigned;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * T94 — Log an 'assigned' activity row when a lead is assigned to a user.
 * Fires on the LeadAssigned event dispatched by LeadService::assign().
 */
class LogLeadAssigned
{
    public function handle(LeadAssigned $event): void
    {
        DB::table('lead_activities')->insert([
            'id'          => Str::uuid()->toString(),
            'lead_id'     => $event->lead->id,
            'business_id' => $event->lead->business_id,
            'user_id'     => null,
            'type'        => 'assigned',
            'description' => $event->assignedToUserId
                ? 'Lead assigned to a team member.'
                : 'Lead unassigned.',
            'metadata'    => json_encode([
                'assigned_to_user_id' => $event->assignedToUserId,
            ]),
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
    }
}
