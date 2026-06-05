<?php

namespace App\Modules\WhatsApp\Providers;

interface WhatsAppProvider
{
    /**
     * Send a template message.
     *
     * @param  string  $to        Phone number in international format without + (e.g. 919876543210)
     * @param  string  $templateName  Exact template name as approved by Meta
     * @param  string  $language  Language code (e.g. 'en')
     * @param  array   $variables Ordered list of variable values e.g. ['Aisha Khan', '9876543210']
     * @return array   ['message_id' => string, 'status' => string, 'error' => string|null]
     */
    public function sendTemplate(
        string $to,
        string $templateName,
        string $language,
        array $variables
    ): array;

    /**
     * Send a free-form text message.
     * Only works within 24 hours of customer last messaging you.
     *
     * @param  string  $to      Phone number in international format without +
     * @param  string  $message Plain text message body
     * @return array   ['message_id' => string, 'status' => string, 'error' => string|null]
     */
    public function sendText(string $to, string $message): array;

    /**
     * Get the delivery status of a sent message.
     *
     * @param  string  $messageId  Meta's message ID returned from sendTemplate/sendText
     * @return array   ['status' => string, 'error' => string|null]
     */
    public function getMessageStatus(string $messageId): array;
}