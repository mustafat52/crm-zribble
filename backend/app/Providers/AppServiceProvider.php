<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use App\Modules\Auth\Models\Branch;
use App\Modules\Auth\Policies\BranchPolicy;


// Lead Events
use App\Events\Leads\LeadCreated;
use App\Events\Leads\LeadAssigned;
use App\Events\Leads\LeadStatusChanged;
use App\Events\Leads\FollowUpDue;

// Listeners
use App\Listeners\Notifications\SendCustomerAcknowledgement;
use App\Listeners\Notifications\NotifyOwnerOfNewLead;
use App\Listeners\Notifications\NotifyAssigneeOfLead;
use App\Listeners\Notifications\SendFollowUpReminder;
use App\Listeners\Leads\LogLeadActivity;
use App\Listeners\Reports\UpdateDashboardStats;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(Branch::class, BranchPolicy::class);
        Event::listen(LeadCreated::class, SendCustomerAcknowledgement::class);
        Event::listen(LeadCreated::class, NotifyOwnerOfNewLead::class);
        Event::listen(LeadCreated::class, UpdateDashboardStats::class);
        Event::listen(LeadAssigned::class, NotifyAssigneeOfLead::class);
        Event::listen(LeadStatusChanged::class, LogLeadActivity::class);
        Event::listen(FollowUpDue::class, SendFollowUpReminder::class);
    }
}