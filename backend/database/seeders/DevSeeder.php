<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use App\Models\User;
use App\Models\Business;
use App\Models\Branch;
use App\Models\LeadStatus;
use App\Modules\Leads\Models\Lead;
use App\Modules\Leads\Models\LeadActivity;
use Spatie\Permission\Models\Role;

class DevSeeder extends Seeder
{
    public function run(): void
    {
        // ── 0. Roles (idempotent — must exist before any syncRoles call) ──────
        foreach (['owner', 'manager', 'executive', 'viewer'] as $roleName) {
            Role::firstOrCreate(['name' => $roleName, 'guard_name' => 'sanctum']);
        }

        // ── 1. Business ───────────────────────────────────────────────
        $eventsBackup = Business::getEventDispatcher();
        Business::unsetEventDispatcher();

        $business = Business::firstOrCreate(
            ['slug' => 'glamour-salon'],
            [
                'name'               => 'Glamour Salon & Spa',
                'whatsapp_number'    => '+919876543210',
                'whatsapp_provider'  => 'mock',
                'timezone'           => 'Asia/Kolkata',
                'plan'               => 'pro',
                'features'           => ['ai' => false, 'automations' => false],
                'settings'           => ['duplicate_handling' => 'merge'],
                'is_active'          => true,
            ]
        );

        // ── 2. Branch ─────────────────────────────────────────────────
        $branch = Branch::firstOrCreate(
            ['business_id' => $business->id, 'name' => 'Andheri West'],
            [
                'city'      => 'Mumbai',
                'is_active' => true,
            ]
        );
        Business::setEventDispatcher($eventsBackup);
        // ── 3. Owner user ─────────────────────────────────────────────
        $owner = User::firstOrCreate(
         ['email' => 'owner@test.com'],
         [
             'name'             => 'Test Owner',
             'phone'            => '+919550253852'
             'password'         => Hash::make('password123'),
             'business_id'      => $business->id,
             'branch_id'        => null,
             'active_branch_id' => $branch->id,   // ← ADD THIS LINE
             'is_active'        => true,
         ]
     );
        $owner->syncRoles(['owner']);

        // ── 4. Executive user ─────────────────────────────────────────
        $exec = User::firstOrCreate(
            ['email' => 'exec@test.com'],
            [
                'name'        => 'Priya Sharma',
                'password'    => Hash::make('password123'),
                'business_id' => $business->id,
                'branch_id'   => $branch->id,
                'is_active'   => true,
            ]
        );
        $exec->syncRoles(['executive']);
        if (! $owner->active_branch_id) {
            $owner->update(['active_branch_id' => $branch->id]);
        }

        // ── 5. Lead Statuses ──────────────────────────────────────────
        $statuses = [
            ['name' => 'New',          'color' => '#6366f1', 'sort_order' => 1, 'is_converted' => false, 'is_lost' => false, 'is_terminal' => false],
            ['name' => 'Contacted',    'color' => '#f59e0b', 'sort_order' => 2, 'is_converted' => false, 'is_lost' => false, 'is_terminal' => false],
            ['name' => 'Follow Up',    'color' => '#3b82f6', 'sort_order' => 3, 'is_converted' => false, 'is_lost' => false, 'is_terminal' => false],
            ['name' => 'Converted',    'color' => '#10b981', 'sort_order' => 4, 'is_converted' => true,  'is_lost' => false, 'is_terminal' => true],
            ['name' => 'Lost',         'color' => '#ef4444', 'sort_order' => 5, 'is_converted' => false, 'is_lost' => true,  'is_terminal' => true],
        ];

        $statusModels = [];
        foreach ($statuses as $s) {
            $statusModels[$s['name']] = LeadStatus::firstOrCreate(
                ['business_id' => $business->id, 'name' => $s['name']],
                array_merge($s, ['business_id' => $business->id])
            );
        }

        // ── 6. Leads + Activities ─────────────────────────────────────
        $leadsData = [
            [
                'name'            => 'Aisha Khan',
                'mobile'          => '+919876500001',
                'email'           => 'aisha.khan@gmail.com',
                'source'          => 'instagram',
                'interested_in'   => 'Bridal Makeup Package',
                'lead_value'      => 15000,
                'city'            => 'Mumbai',
                'status'          => 'Follow Up',
                'assigned_to'     => $exec->id,
                'next_followup_at'=> now()->addDays(2),
                'activities'      => [
                    ['type' => 'created',        'description' => 'Lead created via Instagram enquiry', 'user_id' => $owner->id,  'created_at' => now()->subDays(5)],
                    ['type' => 'note',            'description' => 'Called — interested in bridal package for Dec wedding. Budget ₹15k.', 'user_id' => $exec->id, 'created_at' => now()->subDays(4)],
                    ['type' => 'status_changed',  'description' => 'Status changed from New → Contacted', 'user_id' => $exec->id, 'created_at' => now()->subDays(4)],
                    ['type' => 'whatsapp_sent',   'description' => 'Sent bridal package brochure via WhatsApp', 'user_id' => $exec->id, 'created_at' => now()->subDays(3)],
                    ['type' => 'status_changed',  'description' => 'Status changed from Contacted → Follow Up', 'user_id' => $exec->id, 'created_at' => now()->subDays(2)],
                    ['type' => 'followup_set',    'description' => 'Follow-up scheduled for ' . now()->addDays(2)->format('d M Y, h:i A'), 'user_id' => $exec->id, 'created_at' => now()->subDays(1)],
                ],
            ],
            [
                'name'            => 'Rohan Mehta',
                'mobile'          => '+919876500002',
                'email'           => 'rohan.mehta@outlook.com',
                'source'          => 'website',
                'interested_in'   => 'Hair Spa Treatment',
                'lead_value'      => 3500,
                'city'            => 'Mumbai',
                'status'          => 'New',
                'assigned_to'     => null,
                'next_followup_at'=> null,
                'activities'      => [
                    ['type' => 'created', 'description' => 'Lead created via website enquiry form', 'user_id' => $owner->id, 'created_at' => now()->subHours(3)],
                ],
            ],
            [
                'name'            => 'Sneha Patil',
                'mobile'          => '+919876500003',
                'email'           => null,
                'source'          => 'whatsapp',
                'interested_in'   => 'Monthly Facial Package',
                'lead_value'      => 6000,
                'city'            => 'Andheri',
                'status'          => 'Converted',
                'assigned_to'     => $exec->id,
                'next_followup_at'=> null,
                'converted_at'    => now()->subDays(1),
                'activities'      => [
                    ['type' => 'created',       'description' => 'Lead created via WhatsApp enquiry', 'user_id' => $owner->id, 'created_at' => now()->subDays(10)],
                    ['type' => 'assignment',    'description' => 'Lead assigned to Priya Sharma', 'user_id' => $owner->id, 'created_at' => now()->subDays(9)],
                    ['type' => 'note',          'description' => 'Very interested. Wants to start this month itself.', 'user_id' => $exec->id, 'created_at' => now()->subDays(8)],
                    ['type' => 'status_changed','description' => 'Status changed from New → Contacted', 'user_id' => $exec->id, 'created_at' => now()->subDays(7)],
                    ['type' => 'status_changed','description' => 'Status changed from Contacted → Converted', 'user_id' => $exec->id, 'created_at' => now()->subDays(1)],
                    ['type' => 'note',          'description' => 'Booked 3-month facial package. Payment received ₹6000.', 'user_id' => $exec->id, 'created_at' => now()->subDays(1)],
                ],
            ],
        ];

        foreach ($leadsData as $leadData) {
            $activities  = $leadData['activities'];
            $statusName  = $leadData['status'];
            $statusModel = $statusModels[$statusName];

            unset($leadData['activities'], $leadData['status']);

            $lead = Lead::firstOrCreate(
                ['mobile' => $leadData['mobile'], 'business_id' => $business->id],
                array_merge($leadData, [
                    'business_id'    => $business->id,
                    'branch_id'      => $branch->id,
                    'lead_status_id' => $statusModel->id,
                    'tags'           => [],
                    'custom_fields'  => [],
                    'metadata'       => [],
                ])
            );

            // Only seed activities if none exist for this lead
            if ($lead->wasRecentlyCreated) {
                foreach ($activities as $act) {
                    LeadActivity::create([
                        'lead_id'     => $lead->id,
                        'business_id' => $business->id,
                        'user_id'     => $act['user_id'],
                        'type'        => $act['type'],
                        'description' => $act['description'],
                        'metadata'    => [],
                        'created_at'  => $act['created_at'],
                        'updated_at'  => $act['created_at'],
                    ]);
                }
            }
        }

        $this->command->info('✅ DevSeeder complete — business, 2 users, 5 statuses, 3 leads, activities seeded.');
    }
}