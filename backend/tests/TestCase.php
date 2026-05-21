<?php

namespace Tests;

use App\Models\Business;
use App\Modules\Auth\Models\Branch;
use App\Models\User;
use App\Models\ApiKey;
use App\Modules\Leads\Models\Lead;
use App\Modules\Leads\Models\LeadStatus;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    // ── Seed roles before every test ─────────────────────────────────────────
    // Without this, assignRole('owner') throws RoleDoesNotExist.
    // We seed only roles (not full DevSeeder) to keep tests fast.
    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
    }

    // ── Role seeding ──────────────────────────────────────────────────────────
    protected function seedRoles(): void
    {
        $guard = 'sanctum';
        foreach (['owner', 'manager', 'executive', 'read-only'] as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => $guard]);
        }
    }

    // ── Business factory ──────────────────────────────────────────────────────
    protected function createBusiness(string $name = 'Test Business'): Business
    {
        return Business::create([
            'id'                 => Str::uuid(),
            'name'               => $name,
            'slug'               => Str::slug($name) . '-' . Str::random(4),
            'whatsapp_number'    => '+91' . rand(7000000000, 9999999999),
            'whatsapp_provider'  => 'mock',
            'timezone'           => 'Asia/Kolkata',
            'plan'               => 'pro',
            'features'           => json_encode(['ai' => false, 'automations' => false]),
            'settings'           => json_encode(['duplicate_handling' => 'merge']),
            'is_active'          => true,
        ]);
    }

    // ── Branch factory ────────────────────────────────────────────────────────
    protected function createBranch(Business $business, string $name = 'Main Branch'): Branch
    {
        return Branch::create([
            'id'          => Str::uuid(),
            'business_id' => $business->id,
            'name'        => $name,
            'city'        => 'Mumbai',
            'is_active'   => true,
        ]);
    }

    // ── User factory ──────────────────────────────────────────────────────────
    // role: 'owner' | 'manager' | 'executive' | 'read-only'
    // owner → branch_id = null (sees all branches)
    // others → branch_id required
    protected function createUser(
        Business $business,
        string $role = 'executive',
        ?Branch $branch = null
    ): User {
        $user = User::create([
            'name'        => ucfirst($role) . ' User ' . Str::random(4),
            'email'       => $role . '.' . Str::random(6) . '@test.com',
            'password'    => bcrypt('password'),
            'business_id' => $business->id,
            'branch_id'   => ($role === 'owner') ? null : ($branch?->id),
            'is_active'   => true,
        ]);

        $user->assignRole($role);

        return $user;
    }

    // ── Lead factory ──────────────────────────────────────────────────────────
    // Creates a lead explicitly under a specific business and branch,
    // bypassing GlobalScopes by using ::withoutGlobalScopes()->create().
    // This is intentional — test setup must be able to plant data for ANY
    // business, including the "attacker" business we are testing against.
    protected function createLead(Business $business, Branch $branch, ?LeadStatus $status = null): Lead
    {
        return Lead::withoutGlobalScopes()->create([
            'id'             => Str::uuid(),
            'business_id'    => $business->id,
            'branch_id'      => $branch->id,
            'lead_status_id' => $status?->id,
            'name'           => 'Test Lead ' . Str::random(4),
            'mobile'         => '+91' . rand(7000000000, 9999999999),
            'source'         => 'manual',
        ]);
    }

    // ── LeadStatus factory ────────────────────────────────────────────────────
    protected function createLeadStatus(Business $business, string $name = 'New'): LeadStatus
    {
        return LeadStatus::withoutGlobalScopes()->create([
            'id'           => Str::uuid(),
            'business_id'  => $business->id,
            'name'         => $name,
            'color'        => '#6366f1',
            'sort_order'   => 1,
            'is_converted' => false,
            'is_lost'      => false,
            'is_terminal'  => false,
        ]);
    }

    // ── ApiKey factory ────────────────────────────────────────────────────────
    protected function createApiKey(Business $business): array
    {
        $plainKey = 'test_' . Str::random(32);

        ApiKey::create([
            'id'          => Str::uuid(),
            'business_id' => $business->id,
            'name'        => 'Test Key',
            'key_hash'    => hash('sha256', $plainKey),
            'key_prefix'  => substr($plainKey, 0, 8),
            'is_active'   => true,
        ]);

        return ['plain' => $plainKey];
    }

    // ── Act as user (issues a real Sanctum token) ─────────────────────────────
    protected function actingAsUser(User $user): static
    {
        return $this->actingAs($user, 'sanctum');
    }
}