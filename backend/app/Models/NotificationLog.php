<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Scopes\BusinessScope;

class NotificationLog extends Model
{
    use HasUuids;

    public $timestamps = false;
    const CREATED_AT = 'created_at';

    protected $fillable = [
        'business_id', 'lead_id', 'channel', 'recipient',
        'template', 'payload', 'status', 'error_message',
        'attempts', 'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'payload'    => 'array',
            'attempts'   => 'integer',
            'sent_at'    => 'datetime',
            'created_at' => 'datetime',
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