<?php

namespace App\Modules\Leads\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class LeadFollowup extends Model
{
    use HasUuids;

    protected $table = 'lead_followups';

    protected $fillable = [
        'business_id',
        'lead_id',
        'assigned_to',
        'follow_up_at',
        'note',
        'status',
        'reminded_at',
    ];

    protected $casts = [
        'follow_up_at' => 'datetime',
        'reminded_at'  => 'datetime',
    ];

    public function lead(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(\App\Modules\Leads\Models\Lead::class);
    }
}