<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Spatie\Permission\Models\Role;

class AgencyAdminSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Ensure agency_admin role exists
        $role = Role::firstOrCreate(['name' => 'agency_admin', 'guard_name' => 'sanctum']);

        // Create agency admin user — business_id is NULL (intentional)
        $user = User::firstOrCreate(
            ['email' => 'admin@zribble.com'],
            [
                'name'        => 'Mustafa (Agency Admin)',
                'password'    => bcrypt('agencyadmin123'),
                'business_id' => null,
                'branch_id'   => null,
                'is_active'   => true,
            ]
        );

        // Assign role via Spatie (syncRoles avoids duplicate assignments)
        $user->syncRoles([$role]);

        $this->command->info('Agency admin created: admin@zribble.com / agencyadmin123');
    }
}