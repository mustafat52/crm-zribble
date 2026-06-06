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

class WhatsAppService
{
    /**
     * Send a WhatsApp template message to a phone number.
     *
     * @param  Business     $business
     * @param  string       $to           Phone number (any format — provider formats it)
     * @param  string       $templateName Name matching whatsapp_templates.name
     * @param  array        $variables    Ordered values for {{1}}, {{2}}, etc.
     * @param  string|null  $leadId       Optional lead UUID to link conversation to lead
     * @return array        ['message_id', 'status', 'error']
     */
    public function sendTemplate(
        Business $business,
        string $to,
        string $templateName,
        array $variables = [],
        ?string $leadId = null
    ): array {
        // 1. Look up template
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

        // 2. Resolve provider
        $provider = $this->resolveProvider($business);

        // 3. Send
        $result = $provider->sendTemplate(
            $to,
            $template->template_id,
            $template->language,
            $variables
        );

        // 4. Log conversation
        $this->logConversation($business, $to, $template, $result, null, $leadId);

        // 5. Log to notification_logs
        $this->logNotification($business, $to, $templateName, $result);

        return $result;
    }

    /**
     * Send a free-form text message.
     * Only works within 24h of customer last messaging the business.
     */
    public function sendText(
        Business $business,
        string $to,
        string $message,
        ?string $leadId = null
    ): array {
        $provider = $this->resolveProvider($business);
        $result   = $provider->sendText($to, $message);

        // Log conversation
        $this->logConversation($business, $to, null, $result, $message, $leadId);

        $this->logNotification($business, $to, 'text_message', $result);

        return $result;
    }

    /**
     * Notify all managers in a business about a new lead.
     * Used when a lead is created — fires alongside owner notification.
     */
    public function notifyAllManagers(Business $business, Lead $lead): void
    {
        try {
            // Find all users with manager role in this business
            $managerRoleId = \DB::table('roles')
                ->where('name', 'manager')
                ->where('guard_name', 'sanctum')
                ->value('id');

            if (!$managerRoleId) return;

            $managers = \App\Models\User::whereRaw(
                "id::text IN (SELECT model_id FROM model_has_roles WHERE role_id = ?)",
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
                            $lead->name,
                            $lead->mobile,
                            $lead->source ?? 'manual',
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

    /**
     * Resolve which provider to use based on business.whatsapp_provider column.
     * 'mock' → MockWhatsAppProvider (default for dev/testing)
     * 'meta' → MetaCloudProvider (real sends)
     */
    public function resolveProvider(Business $business): WhatsAppProvider
    {
        return match($business->whatsapp_provider) {
            'meta'  => new MetaCloudProvider(),
            default => new MockWhatsAppProvider(),
        };
    }

    /**
     * Write a row to whatsapp_conversations for every send attempt.
     */
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

    /**
     * Write a row to notification_logs for every send attempt.
     */
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