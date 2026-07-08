<?php

namespace App\Modules\WhatsApp\Services;

use App\Models\Business;
use App\Modules\WhatsApp\Providers\WhatsAppProvider;
use App\Modules\WhatsApp\Providers\MockWhatsAppProvider;
use App\Modules\WhatsApp\Providers\MetaCloudProvider;
use App\Modules\WhatsApp\Models\WhatsAppTemplate;
use App\Modules\WhatsApp\Models\WhatsAppConversation;
use App\Models\NotificationLog;
use Illuminate\Support\Facades\Log;
use App\Modules\Leads\Models\Lead;
use App\Modules\WhatsApp\Providers\WhatsJetProvider;

class WhatsAppService
{
    /**
     * Send a WhatsApp template message to a phone number.
     */
    public function sendTemplate(
        Business $business,
        string $to,
        string $templateName,
        array $variables = [],
        ?string $leadId = null
    ): array {
        $template = WhatsAppTemplate::withoutGlobalScopes()
            ->where('business_id', $business->id)
            ->where('name', $templateName)
            ->where('is_active', true)
            ->first();

        if (!$template) {
            Log::warning('[WhatsAppService] Template not found or inactive', [
                'business_id'   => $business->id,
                'template_name' => $templateName,
            ]);
            return ['message_id' => null, 'status' => 'failed', 'error' => 'Template not found or inactive.'];
        }

        if (!$template->template_id) {
            Log::warning('[WhatsAppService] Template ID not set — Meta has not approved it yet', [
                'template_name' => $templateName,
            ]);
            return ['message_id' => null, 'status' => 'skipped', 'error' => 'Template not approved by Meta yet.'];
        }

        $provider = $this->resolveProvider($business);

        $result = $provider->sendTemplate(
            $to,
            $template->template_id,
            $template->language,
            $variables
        );

        $this->logConversation($business, $to, $template, $result, null, $leadId);
        $this->logNotification($business, $to, $templateName, $result);

        return $result;
    }

    /**
     * Send a free-form text message.
     */
    public function sendText(
        Business $business,
        string $to,
        string $message,
        ?string $leadId = null
    ): array {
        $provider = $this->resolveProvider($business);
        $result   = $provider->sendText($to, $message);

        $this->logConversation($business, $to, null, $result, $message, $leadId);
        $this->logNotification($business, $to, 'text_message', $result);

        return $result;
    }

    /**
     * T70 FIX: Notify all managers using the same 7-variable structure as the owner notification.
     *
     * Previously, notifyAllManagers() passed only 3 variables to new_lead_alert
     * (lead_name, lead_mobile, source) while the owner notification passed 7 variables
     * (owner_name, business_name, customer_name, customer_number, request_type, source, lead_id).
     * Meta/WhatsJet rejects whichever call has the wrong variable count — one of the two
     * paths was silently failing on every lead creation.
     *
     * Fix: align manager notification to use the same 7-variable format.
     * Use manager's name as {{1}} (greeting name) so the template personalises correctly.
     */
    public function notifyAllManagers(Business $business, Lead $lead): void
    {
        try {
            $managerRoleId = \DB::table('roles')
                ->where('name', 'manager')
                ->where('guard_name', 'sanctum')
                ->value('id');

            if (!$managerRoleId) return;

            $managers = \App\Models\User::whereRaw(
                "id IN (SELECT model_id FROM model_has_roles WHERE role_id = ?)",
                [$managerRoleId]
            )
            ->where('business_id', $business->id)
            ->where('is_active', true)
            ->whereNotNull('phone')
            ->get();

            if ($managers->isEmpty()) return;

            foreach ($managers as $manager) {
                try {
                    $this->sendTemplate(
                        $business,
                        $manager->phone,
                        'new_lead_alert',
                        [
                            $manager->name,                  // {{1}} greeting — manager's name
                            $business->name,                 // {{2}} business name
                            $lead->name,                     // {{3}} customer name
                            $lead->mobile,                   // {{4}} customer number
                            $lead->interested_in ?? 'N/A',   // {{5}} request type
                            $lead->source ?? 'manual',       // {{6}} source
                            $lead->id,                       // {{7}} lead ID for URL
                        ],
                        $lead->id
                    );
                } catch (\Throwable $e) {
                    Log::error('[WhatsAppService] Failed to notify manager', [
                        'manager_id' => $manager->id,
                        'lead_id'    => $lead->id,
                        'error'      => $e->getMessage(),
                    ]);
                }
            }

        } catch (\Throwable $e) {
            Log::error('[WhatsAppService] notifyAllManagers failed', [
                'business_id' => $business->id,
                'lead_id'     => $lead->id,
                'error'       => $e->getMessage(),
            ]);
        }
    }

    public function resolveProvider(Business $business): WhatsAppProvider
    {
        return match($business->whatsapp_provider) {
            'meta'     => new MetaCloudProvider(),
            'whatsjet' => new WhatsJetProvider(),
            default    => new MockWhatsAppProvider(),
        };
    }

    private function logConversation(
        Business $business,
        string $to,
        ?WhatsAppTemplate $template,
        array $result,
        ?string $textBody = null,
        ?string $leadId = null
    ): void {
        try {
            WhatsAppConversation::create([
                'business_id'   => $business->id,
                'lead_id'       => $leadId,
                'direction'     => 'outbound',
                'message_id'    => $result['message_id'],
                'template_name' => $template?->name,
                'body'          => $textBody ?? $template?->body_text,
                'status'        => $result['status'],
                'recipient'     => $to,
                'sent_at'       => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[WhatsAppService] Failed to write conversation log', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function logNotification(
        Business $business,
        string $to,
        string $templateName,
        array $result
    ): void {
        try {
            NotificationLog::create([
                'business_id'   => $business->id,
                'lead_id'       => null,
                'channel'       => 'whatsapp',
                'recipient'     => $to,
                'template'      => $templateName,
                'payload'       => ['template' => $templateName],
                'status'        => $result['status'],
                'error_message' => $result['error'],
                'attempts'      => 1,
                'sent_at'       => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[WhatsAppService] Failed to write notification log', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
