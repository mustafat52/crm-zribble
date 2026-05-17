<?php

namespace App\Listeners\Notifications;

use App\Events\Leads\FollowUpDue;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendFollowUpReminder
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
    public function handle(FollowUpDue $event): void
    {
        //
    }
}
