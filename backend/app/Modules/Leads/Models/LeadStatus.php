<?php

namespace App\Modules\Leads\Models;

use App\Models\Scopes\BusinessScope;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeadStatus extends Model
{
    use HasUuids;

    protected $table = 'lead_statuses';

    protected $fillable = [
        'business_id',
        'name',
        'color',
        'sort_order',
        'is_converted',
        'is_lost',
        'is_terminal',
    ];

    protected $casts = [
        'is_converted' => 'boolean',
        'is_lost'      => 'boolean',
        'is_terminal'  => 'boolean',
        'sort_order'   => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BusinessScope());
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class, 'lead_status_id');
    }
}