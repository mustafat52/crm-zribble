<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use App\Models\Scopes\BusinessScope;

class CustomFieldDefinition extends Model
{
    use HasUuids;

    protected $fillable = [
        'business_id',
        'label',
        'type',
        'options',
        'is_required',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'options'     => 'array',
        'is_required' => 'boolean',
        'is_active'   => 'boolean',
        'sort_order'  => 'integer',
    ];

    protected static function booted(): void
    {
        static::addGlobalScope(new BusinessScope);
    }

    public function business(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}