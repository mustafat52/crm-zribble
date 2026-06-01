<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PushSubscription extends Model
{
    use HasUuids;

    protected $table = 'push_subscriptions';

    protected $fillable = [
        'user_id',
        'endpoint',
        'p256dh',
        'auth',
        'user_agent',
    ];

    // Never expose encryption keys in API responses
    protected $hidden = [
        'p256dh',
        'auth',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}