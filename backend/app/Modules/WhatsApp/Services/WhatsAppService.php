<?php

namespace App\Modules\WhatsApp\Services;

use App\Models\Business;
use App\Modules\WhatsApp\Providers\WhatsAppProvider;
use App\Modules\WhatsApp\Providers\MockWhatsAppProvider;
use App\Modules\WhatsApp\Providers\MetaCloudProvider;
use App\Modules\WhatsApp\Models\WhatsAppTemplate;
use App\Models\NotificationLog;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    /**
     * Send a WhatsApp template message to a phone number.
     *
     * @param  Business  $business
     * @param  string    $to           Phone number (any format — provider formats it)
     * @param  string    $templateName Name matching whatsapp_templates.name
     * @param  array     $variables    Ordered values for {{1}}, {{2}}, etc.
     * @return array     ['message_id', 'status', 'error']
     */
    public function sendTemplate(
        Business $business,
        string $to,
        string $templateName,
        array $variables = []
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

        // 4. Log to notification_logs
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
        string $message
    ): array {
        $provider = $this->resolveProvider($business);
        $result   = $provider->sendText($to, $message);

        $this->logNotification($business, $to, 'text_message', $result);

        return $result;
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
                'business_id' => $business->id,
                'lead_id'     => null,
                'channel'     => 'whatsapp',
                'recipient'   => $to,
                'template'    => $templateName,
                'payload'     => ['template' => $templateName],
                'status'      => $result['status'],
                'error_message' => $result['error'],
                'attempts'    => 1,
                'sent_at'     => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('[WhatsAppService] Failed to write notification log', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}