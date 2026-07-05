<?php

namespace App\Modules\WhatsApp\Providers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsJetProvider implements WhatsAppProvider
{
    private string $token;
    private string $vendorUid;
    private string $baseUrl;
    private string $fromPhoneNumberId;

    public function __construct()
    {
        $this->token             = config('whatsapp.whatsjet_token');
        $this->vendorUid         = config('whatsapp.whatsjet_vendor_uid');
        $this->baseUrl           = config('whatsapp.whatsjet_base_url');
        $this->fromPhoneNumberId = config('whatsapp.phone_number_id');
    }

    /**
     * Send a WhatsApp template message via WhatsJet.
     *
     * WhatsJet maps variables as field_1, field_2... to {{1}}, {{2}}... in the template.
     * The contact object auto-creates the recipient if they don't exist in WhatsJet.
     */
    public function sendTemplate(
        string $to,
        string $templateName,
        string $language,
        array $variables
    ): array {
        $phone = $this->formatPhone($to);

        // Build field_1, field_2... from the ordered variables array
        $fields = [];
        foreach (array_values($variables) as $index => $value) {
            $fields['field_' . ($index + 1)] = (string) $value;
        }

        $payload = array_merge([
            'from_phone_number_id' => $this->fromPhoneNumberId,
            'phone_number'         => $phone,
            'template_name'        => $templateName,
            'template_language'    => $language,
            // Auto-create the contact in WhatsJet if they don't exist yet
            'contact' => [
                'first_name'    => 'Lead',
                'language_code' => 'en',
                'country'       => 'india',
            ],
        ], $fields);

        return $this->post('contact/send-template-message', $payload);
    }

    /**
     * Send a free-form text message via WhatsJet.
     * Only works within a 24h customer service window.
     */
    public function sendText(string $to, string $message): array
    {
        $phone = $this->formatPhone($to);

        $payload = [
            'from_phone_number_id' => $this->fromPhoneNumberId,
            'phone_number'         => $phone,
            'message_body'         => $message,
            'contact' => [
                'first_name'    => 'Lead',
                'language_code' => 'en',
                'country'       => 'india',
            ],
        ];

        return $this->post('contact/send-message', $payload);
    }

    /**
     * Get the delivery status of a previously sent message.
     */
    public function getMessageStatus(string $messageId): array
    {
        try {
            $url = "{$this->baseUrl}/{$this->vendorUid}/contact/message-status";

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->token}",
                'Content-Type'  => 'application/json',
            ])->get($url, ['wamid' => $messageId]);

            $data = $response->json();

            if ($response->successful() && ($data['result'] ?? '') === 'success') {
                $status = $data['data']['status'] ?? 'unknown';
                return ['status' => $status, 'error' => null];
            }

            return [
                'status' => 'unknown',
                'error'  => $data['message'] ?? 'Unknown error from WhatsJet',
            ];

        } catch (\Throwable $e) {
            Log::error('[WhatsJetProvider] getMessageStatus failed', [
                'message_id' => $messageId,
                'error'      => $e->getMessage(),
            ]);
            return ['status' => 'unknown', 'error' => $e->getMessage()];
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Make a POST request to the WhatsJet API.
     * Auth is Bearer token in header — confirmed working via curl test.
     */
    private function post(string $endpoint, array $payload): array
    {
        try {
            $url = "{$this->baseUrl}/{$this->vendorUid}/{$endpoint}";

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->token}",
                'Content-Type'  => 'application/json',
            ])->post($url, $payload);

            $data = $response->json();

            if ($response->successful() && ($data['result'] ?? '') === 'success') {
                $messageId = $data['data']['wamid'] ?? null;

                Log::info('[WhatsJetProvider] Message sent', [
                    'to'         => $payload['phone_number'],
                    'endpoint'   => $endpoint,
                    'message_id' => $messageId,
                    'status'     => $data['data']['status'] ?? 'accepted',
                ]);

                return [
                    'message_id' => $messageId,
                    'status'     => 'sent',
                    'error'      => null,
                ];
            }

            $error = $data['message'] ?? 'Unknown error from WhatsJet';

            Log::error('[WhatsJetProvider] Message failed', [
                'to'       => $payload['phone_number'] ?? 'unknown',
                'endpoint' => $endpoint,
                'error'    => $error,
                'response' => $data,
            ]);

            return [
                'message_id' => null,
                'status'     => 'failed',
                'error'      => $error,
            ];

        } catch (\Throwable $e) {
            Log::error('[WhatsJetProvider] HTTP request failed', [
                'endpoint' => $endpoint,
                'error'    => $e->getMessage(),
            ]);

            return [
                'message_id' => null,
                'status'     => 'failed',
                'error'      => $e->getMessage(),
            ];
        }
    }

    /**
     * Format phone number for WhatsJet API.
     * WhatsJet expects: country code + number, no +, no 0.
     * Example: 919550253852 (confirmed working in curl test)
     * Matches same logic as MetaCloudProvider::formatPhone()
     */
    private function formatPhone(string $phone): string
    {
        // Strip everything except digits
        $digits = preg_replace('/\D/', '', $phone);

        // If 10 digits and starts with 6-9 — Indian mobile, add country code
        if (strlen($digits) === 10 && in_array($digits[0], ['6', '7', '8', '9'])) {
            $digits = '91' . $digits;
        }

        return $digits;
    }
}