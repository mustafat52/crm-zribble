<?php

use Illuminate\Support\Facades\Schedule;
use App\Modules\Notifications\Jobs\SendFollowUpReminders;

Schedule::job(new SendFollowUpReminders, 'reminders')->everyFifteenMinutes();

use App\Modules\Reports\Jobs\SendDailyDigest;

\Illuminate\Support\Facades\Schedule::job(new SendDailyDigest, 'reports')
    ->dailyAt('08:00')
    ->timezone('Asia/Kolkata');