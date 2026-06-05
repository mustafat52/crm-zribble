<?php

return [

    'app_id'       => env('WHATSAPP_APP_ID'),
    'app_secret'   => env('WHATSAPP_APP_SECRET'),
    'token'        => env('WHATSAPP_TOKEN'),
    'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
    'business_id'  => env('WHATSAPP_BUSINESS_ID'),
    'webhook_verify_token' => env('WHATSAPP_WEBHOOK_VERIFY_TOKEN', 'crm_wh_verify_2024'),
    'api_version'  => env('WHATSAPP_API_VERSION', 'v19.0'),
    'base_url'     => env('WHATSAPP_BASE_URL', 'https://graph.facebook.com'),

];