<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class AutomationLog extends Model
{
    use HasUuids;

    // Only created_at — no updated_at on log tables
    public $timestamps = false;

    protected $fillable = [
        'business_id',
        'lead_id',
        'user_id',
        'automation_type',
        'channel',
        'recipient_email',
        'status',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'metadata'   => 'array',
        'created_at' => 'datetime',
    ];
}