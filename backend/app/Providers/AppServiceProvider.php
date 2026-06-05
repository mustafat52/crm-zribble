<?php
namespace App\Providers;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Event;
use App\Modules\Auth\Models\Branch;
use App\Modules\Auth\Policies\BranchPolicy;
use App\Modules\Leads\Events\LeadCreated;
use App\Modules\Notifications\Listeners\NotifyOwnerOfNewLead;
use App\Modules\Notifications\Listeners\LogLeadActivity;
use App\Modules\WhatsApp\Providers\WhatsAppProvider;
use App\Modules\WhatsApp\Providers\MockWhatsAppProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Bind WhatsAppProvider interface to MockProvider by default.
        // WhatsAppService::resolveProvider() overrides this per-business
        // based on businesses.whatsapp_provider column ('mock' or 'meta').
        // This binding is the fallback for any direct app(WhatsAppProvider::class) calls.
        $this->app->bind(
            WhatsAppProvider::class,
            MockWhatsAppProvider::class
        );
    }

    public function boot(): void
    {
        Gate::policy(Branch::class, BranchPolicy::class);

        // LeadCreated → notify owner via email + in-app
        Event::listen(LeadCreated::class, NotifyOwnerOfNewLead::class);

        // LeadCreated → log activity
        Event::listen(LeadCreated::class, LogLeadActivity::class);
    }
}