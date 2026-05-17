<?php

namespace App\Modules\Auth\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\User;

class LoginHistory extends Model
{
    use HasUuids;

    protected $table = 'login_history';
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'business_id',
        'ip_address',
        'user_agent',
        'device_name',
        'device_type',
        'outcome',
        'failure_reason',
        'logged_in_at',
    ];

    protected function casts(): array
    {
        return [
            'logged_in_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}