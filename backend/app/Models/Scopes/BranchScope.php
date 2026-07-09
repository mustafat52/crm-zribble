<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;

class BranchScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        if (! Auth::check()) {
            return;
        }

        $user  = Auth::user();
        $table = $model->getTable() . '.branch_id';

        if ($user->branch_id) {
            // Staff are always scoped to their assigned branch
            $builder->where($table, $user->branch_id);
        } elseif ($user->active_branch_id) {
            // Owner has switched into a specific branch — scope to it
            $builder->where($table, $user->active_branch_id);
        }
        // Neither set → owner sees all branches (no filter applied)
    }

}