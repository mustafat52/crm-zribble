<?php

namespace App\Modules\WhatsApp\Providers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetaCloudProvider implements WhatsAppProvider
{
    private string $token;
    private string $phoneNumberId;
    private string $baseUrl;
    private string $apiVersion;

    public function __construct()
    {
        $this->token         = config('whatsapp.token');
        $this->phoneNumberId = config('whatsapp.phone_number_id');
        $this->baseUrl       = config('whatsapp.base_url');
        $this->apiVersion    = config('whatsapp.api_version');
    }

    public function sendTemplate(
        string $to,
        string $templateName,
        string $language,
        array $variables
    ): array {
        if (empty($this->phoneNumberId)) {
            Log::error('[MetaWhatsApp] WHATSAPP_PHONE_NUMBER_ID is not set in .env');
            return [
                'message_id' => null,
                'status'     => 'failed',
                'error'      => 'Phone number ID not configured.',
            ];
        }

        // Build components array from variables
        $parameters = array_map(
            fn($value) => ['type' => 'text', 'text' => (string) $value],
            array_values($variables)
        );

        $payload = [
            'messaging_product' => 'whatsapp',
            'to'                => $this->formatPhone($to),
            'type'              => 'template',
            'template'          => [
                'name'     => $templateName,
                'language' => ['code' => $language],
                'components' => empty($parameters) ? [] : [
                    [
                        'type'       => 'body',
                        'parameters' => $parameters,
                    ],
                ],
            ],
        ];

        return $this->post($payload);
    }

    public function sendText(string $to, string $message): array
    {
        if (empty($this->phoneNumberId)) {
            Log::error('[MetaWhatsApp] WHATSAPP_PHONE_NUMBER_ID is not set in .env');
            return [
                'message_id' => null,
                'status'     => 'failed',
                'error'      => 'Phone number ID not configured.',
            ];
        }

        $payload = [
            'messaging_product' => 'whatsapp',
            'to'                => $this->formatPhone($to),
            'type'              => 'text',
            'text'              => ['body' => $message],
        ];

        return $this->post($payload);
    }

    public function getMessageStatus(string $messageId): array
    {
        try {
            $url = "{$this->baseUrl}/{$this->apiVersion}/{$messageId}";

            $response = Http::withToken($this->token)->get($url);

            if ($response->successful()) {
                $data   = $response->json();
                $status = $data['statuses'][0]['status'] ?? 'unknown';
                return ['status' => $status, 'error' => null];
            }

            return [
                'status' => 'unknown',
                'error'  => $response->json('error.message', 'Unknown error'),
            ];
        } catch (\Throwable $e) {
            Log::error('[MetaWhatsApp] getMessageStatus failed', [
                'message_id' => $messageId,
                'error'      => $e->getMessage(),
            ]);
            return ['status' => 'unknown', 'error' => $e->getMessage()];
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function post(array $payload): array
    {
        try {
            $url = "{$this->baseUrl}/{$this->apiVersion}/{$this->phoneNumberId}/messages";

            $response = Http::withToken($this->token)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url, $payload);

            $data = $response->json();

            if ($response->successful()) {
                $messageId = $data['messages'][0]['id'] ?? null;

                Log::info('[MetaWhatsApp] Message sent', [
                    'to'         => $payload['to'],
                    'message_id' => $messageId,
                    'type'       => $payload['type'],
                ]);

                return [
                    'message_id' => $messageId,
                    'status'     => 'sent',
                    'error'      => null,
                ];
            }

            $error = $data['error']['message'] ?? 'Unknown error from Meta API';

            Log::error('[MetaWhatsApp] Message failed', [
                'to'      => $payload['to'],
                'error'   => $error,
                'payload' => $payload,
            ]);

            return [
                'message_id' => null,
                'status'     => 'failed',
                'error'      => $error,
            ];

        } catch (\Throwable $e) {
            Log::error('[MetaWhatsApp] HTTP request failed', [
                'error'   => $e->getMessage(),
                'payload' => $payload,
            ]);

            return [
                'message_id' => null,
                'status'     => 'failed',
                'error'      => $e->getMessage(),
            ];
        }
    }

    /**
     * Format phone number for Meta API.
     * Strips all non-digits, ensures 91 prefix for India if 10 digits given.
     */
    private function formatPhone(string $phone): string
    {
        // Strip everything except digits
        $digits = preg_replace('/\D/', '', $phone);

        // If 10 digits and starts with 6-9 — Indian mobile, add country code
        if (strlen($digits) === 10 && in_array($digits[0], ['6','7','8','9'])) {
            $digits = '91' . $digits;
        }

        return $digits;
    }
}