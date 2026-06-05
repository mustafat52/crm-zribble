<?php

namespace App\Modules\WhatsApp\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Business;
use App\Models\Scopes\BusinessScope;

class WhatsAppTemplate extends Model
{
    use HasUuids;

    protected $table = 'whatsapp_templates';

    protected $fillable = [
        'business_id',
        'name',
        'template_id',
        'language',
        'category',
        'variables',
        'body_text',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'variables' => 'array',
            'is_active' => 'boolean',
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