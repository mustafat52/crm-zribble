<?php

use Illuminate\Support\Facades\Schedule;
use App\Modules\Notifications\Jobs\SendFollowUpReminders;
use App\Modules\Automations\Jobs\SendStaleLeadNudges;

Schedule::job(new SendFollowUpReminders, 'reminders')->everyFifteenMinutes();
Schedule::job(new SendStaleLeadNudges())->dailyAt('09:00')
                                        ->timezone('Asia/Kolkata');
                                           
use App\Modules\Reports\Jobs\SendDailyDigest;

\Illuminate\Support\Facades\Schedule::job(new SendDailyDigest, 'reports')
    ->dailyAt('08:00')
    ->timezone('Asia/Kolkata');