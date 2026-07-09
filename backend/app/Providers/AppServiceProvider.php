<?php

namespace App\Providers;

use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use App\Models\Business;
use App\Models\Branch;
use App\Observers\BusinessObserver;
use App\Policies\BranchPolicy;
use App\Modules\Leads\Events\LeadCreated;
use App\Modules\Leads\Events\StatusChanged;
use App\Modules\Leads\Events\LeadAssigned;
use App\Modules\Notifications\Listeners\NotifyOwnerOfNewLead;
use App\Modules\Notifications\Listeners\LogLeadActivity;
use App\Modules\Notifications\Listeners\LogStatusChanged;
use App\Modules\Notifications\Listeners\LogLeadAssigned;
use App\Modules\WhatsApp\Providers\WhatsAppProvider;
use App\Modules\WhatsApp\Providers\MockWhatsAppProvider;

/**
 * AppServiceProvider — updated for Group-H (T94 + Group-I T101).
 *
 * Changes vs original:
 *  - T94: StatusChanged + LeadAssigned events now registered with log listeners
 *  - T101 (Group-I): Business::observe(BusinessObserver::class) added in boot()
 *    → Add T101 line manually when doing Group-I, as it depends on BusinessObserver existing
 */
class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind WhatsAppProvider interface to MockProvider by default.
        // WhatsAppService::resolveProvider() overrides this per-business
        // based on businesses.whatsapp_provider column.
        $this->app->bind(
            WhatsAppProvider::class,
            MockWhatsAppProvider::class
        );
    }

    public function boot(): void
    {
        Gate::policy(Branch::class, BranchPolicy::class);

        Business::observe(BusinessObserver::class);

        // LeadCreated
        Event::listen(LeadCreated::class, NotifyOwnerOfNewLead::class);
        Event::listen(LeadCreated::class, LogLeadActivity::class);

        // T94 — Status and assignment lifecycle events
        Event::listen(StatusChanged::class, LogStatusChanged::class);
        Event::listen(LeadAssigned::class,  LogLeadAssigned::class);
    }
}
