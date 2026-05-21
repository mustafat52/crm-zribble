<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BranchSeeder extends Seeder
{
    /**
     * Seeds 3 branches for the first business in the DB.
     * Safe to run multiple times — clears existing branches first.
     *
     * Usage:
     *   docker compose exec app php artisan db:seed --class=BranchSeeder
     */
    public function run(): void
    {
        // Get the first business (seeded by DevSeeder in T23)
        $business = DB::table('businesses')->orderBy('created_at')->first();

        if (! $business) {
            $this->command->warn('No businesses found. Run DevSeeder first: php artisan db:seed --class=DevSeeder');
            return;
        }

        // Get a user from that business to act as manager
        $manager = DB::table('users')
            ->where('business_id', $business->id)
            ->orderBy('created_at')
            ->first();

        // Clear existing branches for this business (idempotent)
        DB::table('branches')->where('business_id', $business->id)->delete();

        $now = now();

        DB::table('branches')->insert([
            [
                'id'               => Str::uuid(),
                'business_id'      => $business->id,
                'name'             => 'Head Office',
                'city'             => 'Mumbai',
                'whatsapp_number'  => '+91 98765 43210',
                'manager_id'       => $manager?->id,
                'is_active'        => true,
                'created_at'       => $now,
                'updated_at'       => $now,
            ],
            [
                'id'               => Str::uuid(),
                'business_id'      => $business->id,
                'name'             => 'Pune Branch',
                'city'             => 'Pune',
                'whatsapp_number'  => '+91 87654 32109',
                'manager_id'       => null,
                'is_active'        => true,
                'created_at'       => $now,
                'updated_at'       => $now,
            ],
            [
                'id'               => Str::uuid(),
                'business_id'      => $business->id,
                'name'             => 'Delhi NCR',
                'city'             => 'Gurgaon',
                'whatsapp_number'  => null,
                'manager_id'       => null,
                'is_active'        => false,
                'created_at'       => $now,
                'updated_at'       => $now,
            ],
        ]);

        $this->command->info("✅ Seeded 3 branches for business: {$business->name}");
        $this->command->info("   Manager assigned to Head Office: " . ($manager?->name ?? 'none'));
    }
}