<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Business extends Model
{
    use HasUuids;

    protected $fillable = [
        'name', 'slug', 'whatsapp_number', 'whatsapp_provider',
        'whatsapp_config', 'timezone', 'plan', 'features',
        'settings', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'features'  => 'array',
            'settings'  => 'array',
            'whatsapp_config' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function leadStatuses(): HasMany
    {
        return $this->hasMany(LeadStatus::class);
    }
}