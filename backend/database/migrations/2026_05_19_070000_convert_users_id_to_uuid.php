<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Drop all foreign keys referencing users.id
        DB::statement('ALTER TABLE lead_activities DROP CONSTRAINT IF EXISTS lead_activities_user_id_fkey');
        DB::statement('ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey');
        DB::statement('ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_assigned_to_fkey');
        DB::statement('ALTER TABLE branches DROP CONSTRAINT IF EXISTS branches_manager_id_fkey');
        DB::statement('ALTER TABLE token_families DROP CONSTRAINT IF EXISTS token_families_user_id_foreign');
        DB::statement('ALTER TABLE login_history DROP CONSTRAINT IF EXISTS login_history_user_id_foreign');

        // Drop primary key
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE');
        DB::statement('ALTER TABLE users ALTER COLUMN id DROP DEFAULT');

        // Convert users.id to uuid
        DB::statement('ALTER TABLE users ALTER COLUMN id TYPE uuid USING gen_random_uuid()');
        DB::statement('ALTER TABLE users ADD PRIMARY KEY (id)');

        // Convert referencing columns to uuid
        DB::statement('ALTER TABLE lead_activities ALTER COLUMN user_id TYPE uuid USING NULL');
        DB::statement('ALTER TABLE audit_logs ALTER COLUMN user_id TYPE uuid USING NULL');
        DB::statement('ALTER TABLE leads ALTER COLUMN assigned_to TYPE uuid USING NULL');
        DB::statement('ALTER TABLE branches ALTER COLUMN manager_id TYPE uuid USING NULL');

        // token_families — clear stale data, drop NOT NULL, convert
        DB::statement('DELETE FROM token_families');
        DB::statement('ALTER TABLE token_families ALTER COLUMN user_id DROP NOT NULL');
        DB::statement('ALTER TABLE token_families ALTER COLUMN user_id TYPE uuid USING NULL');

        // login_history — clear stale data, drop NOT NULL, convert
        DB::statement('DELETE FROM login_history');
        DB::statement('ALTER TABLE login_history ALTER COLUMN user_id DROP NOT NULL');
        DB::statement('ALTER TABLE login_history ALTER COLUMN user_id TYPE uuid USING NULL');

        // Re-add foreign keys
        DB::statement('ALTER TABLE token_families ADD CONSTRAINT token_families_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');
        DB::statement('ALTER TABLE login_history ADD CONSTRAINT login_history_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE');

        // Convert personal_access_tokens tokenable_id
        DB::statement('ALTER TABLE personal_access_tokens ALTER COLUMN tokenable_id TYPE varchar(255) USING tokenable_id::text');

        // Convert Spatie permission pivot tables
        DB::statement('ALTER TABLE model_has_roles ALTER COLUMN model_id TYPE varchar(255) USING model_id::text');
        DB::statement('ALTER TABLE model_has_permissions ALTER COLUMN model_id TYPE varchar(255) USING model_id::text');
    }

    public function down(): void
    {
        // Not reversible safely
    }
};