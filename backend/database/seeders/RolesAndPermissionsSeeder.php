<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $permissions = [
            'leads.view', 'leads.create', 'leads.update', 'leads.delete', 'leads.assign',
            'branches.view', 'branches.manage',
            'reports.view', 'reports.export',
            'whatsapp.send', 'whatsapp.templates',
            'settings.view', 'settings.manage',
            'users.view', 'users.invite', 'users.manage',
            'api_keys.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'sanctum']);
        }

        $owner = Role::firstOrCreate(['name' => 'owner', 'guard_name' => 'sanctum']);
        $owner->syncPermissions(Permission::all());

        $manager = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'sanctum']);
        $manager->syncPermissions([
            'leads.view', 'leads.create', 'leads.update', 'leads.assign',
            'branches.view',
            'reports.view', 'reports.export',
            'whatsapp.send',
            'users.view',
        ]);

        $executive = Role::firstOrCreate(['name' => 'executive', 'guard_name' => 'sanctum']);
        $executive->syncPermissions([
            'leads.view', 'leads.create', 'leads.update',
            'reports.view',
            'whatsapp.send',
        ]);

        $readonly = Role::firstOrCreate(['name' => 'read-only', 'guard_name' => 'sanctum']);
        $readonly->syncPermissions([
            'leads.view',
            'reports.view',
            'branches.view',
        ]);
        // Agency admin — no business permissions needed, access controlled by middleware
        Role::firstOrCreate(['name' => 'agency_admin', 'guard_name' => 'sanctum']);
    }
}