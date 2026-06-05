<?php

namespace App\Modules\WhatsApp\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Business;
use App\Models\Scopes\BusinessScope;

class WhatsAppConversation extends Model
{
    use HasUuids;

    protected $table = 'whatsapp_conversations';

    protected $fillable = [
        'business_id',
        'lead_id',
        'direction',
        'message_id',
        'template_name',
        'body',
        'status',
        'recipient',
        'sent_at',
        'delivered_at',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'sent_at'      => 'datetime',
            'delivered_at' => 'datetime',
            'read_at'      => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new BusinessScope());
    }

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }
}