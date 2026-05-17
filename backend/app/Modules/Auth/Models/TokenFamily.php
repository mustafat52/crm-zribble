<?php

namespace App\Modules\Auth\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class TokenFamily extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'business_id',
        'family_id',
        'refresh_token_hash',
        'device_name',
        'device_type',
        'ip_address',
        'user_agent',
        'expires_at',
        'is_invalidated',
        'invalidated_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at'      => 'datetime',
            'invalidated_at'  => 'datetime',
            'is_invalidated'  => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isValid(): bool
    {
        return ! $this->is_invalidated && ! $this->isExpired();
    }
}