<?php

namespace App\Modules\Leads\Models;

use App\Models\Scopes\BranchScope;
use App\Models\Scopes\BusinessScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\User;
use App\Models\Business;

class Lead extends Model
{
    use HasUuids;

    protected $table = 'leads';

    protected $fillable = [
        'business_id',
        'branch_id',
        'assigned_to',
        'lead_status_id',
        'name',
        'mobile',
        'email',
        'source',
        'campaign',
        'city',
        'interested_in',
        'lead_value',
        'tags',
        'metadata',
        'custom_fields',
        'last_contacted_at',
        'next_followup_at',
        'converted_at',
        'lost_reason',
        'duplicate_of',
    ];

    protected $casts = [
        'tags'              => 'array',
        'metadata'          => 'array',
        'custom_fields'     => 'array',
        'lead_value'        => 'decimal:2',
        'last_contacted_at' => 'datetime',
        'next_followup_at'  => 'datetime',
        'converted_at'      => 'datetime',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BusinessScope());
        static::addGlobalScope(new BranchScope());
    }

    // --- Relationships ---

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function status(): BelongsTo
    {
        return $this->belongsTo(LeadStatus::class, 'lead_status_id');
    }

    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class)->orderByDesc('created_at');
    }
}