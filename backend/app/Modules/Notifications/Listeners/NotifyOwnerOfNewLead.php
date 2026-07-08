<?php

namespace App\Modules\Notifications\Listeners;

use App\Mail\LeadCreatedMail;
use App\Modules\Leads\Events\LeadCreated;
use App\Modules\Notifications\Models\InAppNotification;
use App\Modules\WhatsApp\Services\WhatsAppService;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class NotifyOwnerOfNewLead
{
    public function handle(LeadCreated $event): void
    {
        $lead     = $event->lead;
        $business = $lead->business;

        if (! $business) {
            return;
        }

        // Find the business owner
        $ownerIds = \DB::table('model_has_roles')
            ->join('roles', 'roles.id', '=', 'model_has_roles.role_id')
            ->where('roles.name', 'owner')
            ->where('model_has_roles.model_type', \App\Models\User::class)
            ->pluck('model_has_roles.model_id');

        $owner = $business->users()
            ->whereIn('id', $ownerIds)
            ->first();

        if (! $owner) {
            return;
        }

        $assignedName = null;
        if ($lead->assigned_to) {
            $assignedUser = $business->users()->where('id', $lead->assigned_to)->first();
            $assignedName = $assignedUser?->name;
        }

        // Read business WA toggle settings (default true so existing businesses
        // don't silently stop sending without having set the toggles)
        $settings                    = $business->settings ?? [];
        $waNewLeadAlert              = $settings['wa_new_lead_alert']           ?? true;
        $waCustomerAcknowledgement   = $settings['wa_customer_acknowledgement'] ?? true;

        // 1. Send email to owner
        Mail::to($owner->email)->send(new LeadCreatedMail(
            leadName:     $lead->name,
            leadMobile:   $lead->mobile,
            leadSource:   $lead->source ?? 'unknown',
            businessName: $business->name,
            assignedTo:   $assignedName,
        ));

        // 2. Write in-app notification for owner
        InAppNotification::create([
            'business_id' => $business->id,
            'user_id'     => $owner->id,
            'lead_id'     => $lead->id,
            'type'        => 'lead_created',
            'title'       => 'New Lead: ' . $lead->name,
            'body'        => 'From ' . ($lead->source ?? 'unknown') . ' · ' . $lead->mobile,
            'url'         => '/leads/' . $lead->id,
            'is_read'     => false,
            'created_at'  => now(),
        ]);

        // 3. Notify assignee if different from owner
        if ($lead->assigned_to && $lead->assigned_to !== $owner->id) {
            InAppNotification::create([
                'business_id' => $business->id,
                'user_id'     => $lead->assigned_to,
                'lead_id'     => $lead->id,
                'type'        => 'lead_assigned',
                'title'       => 'Lead Assigned to You: ' . $lead->name,
                'body'        => 'From ' . ($lead->source ?? 'unknown') . ' · ' . $lead->mobile,
                'url'         => '/leads/' . $lead->id,
                'is_read'     => false,
                'created_at'  => now(),
            ]);
        }

        // 4. T71: Send WhatsApp to owner (guarded by wa_new_lead_alert setting)
        // owner_lead_new template expects 7 variables.
        if ($owner->phone && $waNewLeadAlert) {
            try {
                $waService = new WhatsAppService();
                $waService->sendTemplate(
                    $business,
                    $owner->phone,
                    'new_lead_alert',
                    [
                        $owner->name,                   // {{1}} greeting — owner's name
                        $business->name,                // {{2}} business name
                        $lead->name,                    // {{3}} customer name
                        $lead->mobile,                  // {{4}} customer number
                        $lead->interested_in ?? 'N/A',  // {{5}} request type
                        $lead->source ?? 'manual',      // {{6}} source
                        $lead->id,                      // {{7}} lead ID for URL
                    ],
                    $lead->id
                );
            } catch (\Throwable $e) {
                Log::error('[NotifyOwnerOfNewLead] WhatsApp to owner failed', [
                    'error'   => $e->getMessage(),
                    'lead_id' => $lead->id,
                ]);
            }
        }

        // 5. Send WhatsApp to all managers (also guarded by wa_new_lead_alert setting)
        if ($waNewLeadAlert) {
            try {
                $waService = new WhatsAppService();
                $waService->notifyAllManagers($business, $lead);
            } catch (\Throwable $e) {
                Log::error('[NotifyOwnerOfNewLead] notifyAllManagers failed', [
                    'error'   => $e->getMessage(),
                    'lead_id' => $lead->id,
                ]);
            }
        }

        // 6. T71: Send WhatsApp acknowledgement to customer (guarded by wa_customer_acknowledgement)
        // lead_message_customer_24102025 template expects 3 variables.
        if ($lead->mobile && $waCustomerAcknowledgement) {
            try {
                $waService = new WhatsAppService();
                $waService->sendTemplate(
                    $business,
                    $lead->mobile,
                    'lead_acknowledgement',
                    [
                        $business->name,                               // {{1}} business name
                        $business->settings['address'] ?? 'N/A',      // {{2}} address
                        $business->whatsapp_number ?? $owner->phone,   // {{3}} contact number
                    ],
                    $lead->id
                );
            } catch (\Throwable $e) {
                Log::error('[NotifyOwnerOfNewLead] WhatsApp acknowledgement to customer failed', [
                    'error'   => $e->getMessage(),
                    'lead_id' => $lead->id,
                ]);
            }
        }
    }
}
