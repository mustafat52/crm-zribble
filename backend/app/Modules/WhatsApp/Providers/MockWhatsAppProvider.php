<?php

namespace App\Modules\WhatsApp\Providers;

use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class MockWhatsAppProvider implements WhatsAppProvider
{
    public function sendTemplate(
        string $to,
        string $templateName,
        string $language,
        array $variables
    ): array {
        $messageId = 'mock_' . Str::uuid();

        Log::channel('stack')->info('[MockWhatsApp] Template message sent', [
            'to'           => $to,
            'template'     => $templateName,
            'language'     => $language,
            'variables'    => $variables,
            'message_id'   => $messageId,
        ]);

        return [
            'message_id' => $messageId,
            'status'     => 'sent',
            'error'      => null,
        ];
    }

    public function sendText(string $to, string $message): array
    {
        $messageId = 'mock_' . Str::uuid();

        Log::channel('stack')->info('[MockWhatsApp] Text message sent', [
            'to'         => $to,
            'message'    => $message,
            'message_id' => $messageId,
        ]);

        return [
            'message_id' => $messageId,
            'status'     => 'sent',
            'error'      => null,
        ];
    }

    public function getMessageStatus(string $messageId): array
    {
        return [
            'status' => 'delivered',
            'error'  => null,
        ];
    }
}