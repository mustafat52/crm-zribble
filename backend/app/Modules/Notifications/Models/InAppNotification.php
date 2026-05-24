<?php

namespace App\Modules\Notifications\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class InAppNotification extends Model
{
    use HasUuids;

    protected $table = 'in_app_notifications';

    public $timestamps = false; // we only have created_at, no updated_at

    protected $fillable = [
        'business_id',
        'user_id',
        'lead_id',
        'type',
        'title',
        'body',
        'url',
        'is_read',
        'read_at',
        'created_at',
    ];

    protected $casts = [
        'is_read'    => 'boolean',
        'read_at'    => 'datetime',
        'created_at' => 'datetime',
    ];
}