<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use App\Modules\Auth\Models\Branch;
use App\Modules\Auth\Policies\BranchPolicy;

// Lead Events — correct namespace
use App\Modules\Leads\Events\LeadCreated;

// Listeners
use App\Modules\Notifications\Listeners\NotifyOwnerOfNewLead;
use App\Modules\Notifications\Listeners\LogLeadActivity;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(Branch::class, BranchPolicy::class);

        // LeadCreated → notify owner via email
        Event::listen(LeadCreated::class, NotifyOwnerOfNewLead::class);

        // LeadCreated → log activity
        Event::listen(LeadCreated::class, LogLeadActivity::class);
    }
}