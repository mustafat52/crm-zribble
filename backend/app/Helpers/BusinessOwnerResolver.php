<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;

/**
 * Centralised resolver for the business owner's contact info and user ID.
 * Replaces duplicated private getOwnerEmail/Phone/Id() methods that existed
 * in SendFollowUpReminders and AutomationService.
 *
 * ponytail: all static, no state — pure DB lookups via the same UUID-safe
 * three-step pattern established throughout the codebase.
 */
class BusinessOwnerResolver
{
    /**
     * Get the owner's email for a given business.
     */
    public static function email(string $businessId): ?string
    {
        $ownerRoleId = self::ownerRoleId();
        if (! $ownerRoleId) return null;

        return DB::table('users')
            ->where('business_id', $businessId)
            ->whereIn('id', self::ownerUserIds($ownerRoleId))
            ->where('is_active', true)
            ->value('email');
    }

    /**
     * Get the owner's phone for a given business.
     */
    public static function phone(string $businessId): ?string
    {
        $ownerRoleId = self::ownerRoleId();
        if (! $ownerRoleId) return null;

        return DB::table('users')
            ->where('business_id', $businessId)
            ->whereIn('id', self::ownerUserIds($ownerRoleId))
            ->where('is_active', true)
            ->value('phone');
    }

    /**
     * Get the owner's user UUID for a given business.
     */
    public static function id(string $businessId): ?string
    {
        $ownerRoleId = self::ownerRoleId();
        if (! $ownerRoleId) return null;

        return DB::table('users')
            ->where('business_id', $businessId)
            ->whereIn('id', self::ownerUserIds($ownerRoleId))
            ->where('is_active', true)
            ->value('id');
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static function ownerRoleId(): string|int|null
    {
        return DB::table('roles')
            ->where('name', 'owner')
            ->where('guard_name', 'sanctum')
            ->value('id');
    }

    private static function ownerUserIds(string|int $ownerRoleId): \Illuminate\Support\Collection
    {
        return DB::table('model_has_roles')
            ->where('role_id', $ownerRoleId)
            ->where('model_type', 'App\\Models\\User')
            ->pluck('model_id');
    }
}
