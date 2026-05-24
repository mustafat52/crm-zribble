<?php

use Illuminate\Support\Facades\Schedule;
use App\Modules\Notifications\Jobs\SendFollowUpReminders;

Schedule::job(new SendFollowUpReminders, 'reminders')->everyFifteenMinutes();