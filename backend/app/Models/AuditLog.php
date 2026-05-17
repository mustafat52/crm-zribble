<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Scopes\BusinessScope;

class AuditLog extends Model
{
    use HasUuids;

    public $timestamps = false;
    const CREATED_AT = 'created_at';

    protected $fillable = [
        'business_id', 'user_id', 'model_type', 'model_id',
        'event', 'old_values', 'new_values', 'ip_address', 'user_agent',
    ];

    protected function casts(): array
    {
        return [
            'old_values' => 'array',
            'new_values' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new BusinessScope);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
