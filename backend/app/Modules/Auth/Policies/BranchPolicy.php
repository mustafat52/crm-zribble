<?php

namespace App\Modules\Auth\Policies;

use App\Models\User;
use App\Modules\Auth\Models\Branch;
use Illuminate\Auth\Access\HandlesAuthorization;

class BranchPolicy
{
    use HandlesAuthorization;

    /** Any authenticated user may list branches for their business. */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /** Any authenticated user may view a single branch. */
    public function view(User $user, Branch $branch): bool
    {
        return $user->business_id === $branch->business_id;
    }

    /** Only owners may create branches. */
    public function create(User $user): bool
    {
        return $user->hasRole('owner');
    }

    /** Only owners may update branches. */
    public function update(User $user, Branch $branch): bool
    {
        return $user->hasRole('owner') && $user->business_id === $branch->business_id;
    }

    /** Only owners may delete branches. */
    public function delete(User $user, Branch $branch): bool
    {
        return $user->hasRole('owner') && $user->business_id === $branch->business_id;
    }

    /** Only owners may toggle active status. */
    public function toggleActive(User $user, Branch $branch): bool
    {
        return $user->hasRole('owner') && $user->business_id === $branch->business_id;
    }
}