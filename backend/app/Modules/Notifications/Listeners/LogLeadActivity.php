<?php

namespace App\Modules\Notifications\Listeners;

use App\Modules\Leads\Events\LeadCreated;
use App\Modules\Leads\Models\LeadActivity;

class LogLeadActivity
{
    public function handle(LeadCreated $event): void
    {
        $lead = $event->lead;

        LeadActivity::create([
            'lead_id'     => $lead->id,
            'business_id' => $lead->business_id,
            'type'        => 'created',
            'note'        => 'Lead created from source: ' . ($lead->source ?? 'manual'),
            'created_by'  => $lead->assigned_to,
        ]);
    }
}