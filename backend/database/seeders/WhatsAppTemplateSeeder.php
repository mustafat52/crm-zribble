<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Modules\WhatsApp\Models\WhatsAppTemplate;
use App\Models\Business;

class WhatsAppTemplateSeeder extends Seeder
{
    public function run(): void
    {
        $business = Business::first();

        if (!$business) {
            $this->command->warn('No business found. Run DevSeeder first.');
            return;
        }

        $templates = [
            [
                'name'      => 'lead_acknowledgement',
                'category'  => 'UTILITY',
                'language'  => 'en',
                'body_text' => 'Hi {{1}}, thank you for your enquiry. Our team has received your request and will get back to you shortly.',
                'variables' => [
                    ['index' => 1, 'description' => 'Lead full name', 'example' => 'Aisha Khan'],
                ],
            ],
            [
                'name'      => 'new_lead_alert',
                'category'  => 'UTILITY',
                'language'  => 'en',
                'body_text' => "New lead received!\n\nName: {{1}}\nMobile: {{2}}\nSource: {{3}}\n\nLog in to your CRM to view and assign this lead.",
                'variables' => [
                    ['index' => 1, 'description' => 'Lead full name',  'example' => 'Aisha Khan'],
                    ['index' => 2, 'description' => 'Lead mobile',     'example' => '9876543210'],
                    ['index' => 3, 'description' => 'Lead source',     'example' => 'website'],
                ],
            ],
            [
                'name'      => 'followup_reminder',
                'category'  => 'UTILITY',
                'language'  => 'en',
                'body_text' => 'Reminder: You have a follow-up scheduled with {{1}} ({{2}}) at {{3}}. Please make sure to reach out on time.',
                'variables' => [
                    ['index' => 1, 'description' => 'Lead full name',    'example' => 'Aisha Khan'],
                    ['index' => 2, 'description' => 'Lead mobile',       'example' => '9876543210'],
                    ['index' => 3, 'description' => 'Follow-up time',    'example' => '3:00 PM, 5 Jun'],
                ],
            ],
            [
                'name'      => 'daily_digest',
                'category'  => 'UTILITY',
                'language'  => 'en',
                'body_text' => "Good morning! Here is your daily CRM summary for {{1}}:\n\nNew leads today: {{2}}\nThis week: {{3}}\nOverdue follow-ups: {{4}}\nConversion rate: {{5}}%\n\nHave a productive day!",
                'variables' => [
                    ['index' => 1, 'description' => 'Business name',       'example' => 'Glamour Salon'],
                    ['index' => 2, 'description' => 'Leads today',         'example' => '5'],
                    ['index' => 3, 'description' => 'Leads this week',     'example' => '23'],
                    ['index' => 4, 'description' => 'Overdue follow-ups',  'example' => '2'],
                    ['index' => 5, 'description' => 'Conversion rate',     'example' => '12.5'],
                ],
            ],
        ];

        foreach ($templates as $template) {
            WhatsAppTemplate::updateOrCreate(
                [
                    'business_id' => $business->id,
                    'name'        => $template['name'],
                ],
                [
                    'category'    => $template['category'],
                    'language'    => $template['language'],
                    'body_text'   => $template['body_text'],
                    'variables'   => $template['variables'],
                    'template_id' => null,
                    'is_active'   => true,
                ]
            );
        }

        $this->command->info('WhatsApp templates seeded: ' . count($templates) . ' templates for ' . $business->name);
    }
}