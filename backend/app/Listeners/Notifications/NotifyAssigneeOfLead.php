<?php

namespace App\Listeners\Notifications;

use App\Events\Leads\LeadAssigned;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class NotifyAssigneeOfLead
{
    /**
     * Create the event listener.
     */
    public function __construct()
    {
        //
    }

    /**
     * Handle the event.
     */
    public function handle(LeadAssigned $event): void
    {
        //
    }
}
