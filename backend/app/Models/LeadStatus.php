<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Scopes\BusinessScope;

class LeadStatus extends Model
{
    use HasUuids;

    protected $fillable = [
        'business_id', 'name', 'color',
        'sort_order', 'is_converted', 'is_lost', 'is_terminal',
    ];

    protected function casts(): array
    {
        return [
            'is_converted' => 'boolean',
            'is_lost'      => 'boolean',
            'is_terminal'  => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new BusinessScope);
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}