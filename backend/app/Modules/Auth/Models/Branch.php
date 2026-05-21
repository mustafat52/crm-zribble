<?php

namespace App\Modules\Auth\Models;

use App\Models\User;
use App\Modules\Leads\Models\Lead;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Branch extends Model
{
    use HasUuids;

    protected $table = 'branches';

    protected $fillable = [
        'business_id',
        'name',
        'city',
        'whatsapp_number',
        'manager_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function business()
    {
        return $this->belongsTo(\App\Models\Business::class);
    }

    public function manager()
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function users()
    {
        return $this->hasMany(User::class, 'branch_id');
    }

    public function leads()
    {
        return $this->hasMany(Lead::class, 'branch_id');
    }
}