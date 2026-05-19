<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiKey extends Model
{
    use HasUuids;

    protected $fillable = [
        'business_id',
        'name',
        'key_hash',
        'key_prefix',
        'last_used_at',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at'   => 'datetime',
        'is_active'    => 'boolean',
    ];

    public function business(): BelongsTo
    {
        return $this->belongsTo(Business::class);
    }

    /**
     * Find an API key record by the raw key string.
     * We hash it and look up key_hash — the plain key is never stored.
     */
    public static function findByRawKey(string $rawKey): ?self
    {
        return self::where('key_hash', hash('sha256', $rawKey))
            ->where('is_active', true)
            ->first();
    }

    /**
     * Generate a new raw API key + its stored components.
     * Returns ['raw' => '...', 'hash' => '...', 'prefix' => '...']
     * Save hash + prefix to DB. Give raw to the user once — never again.
     */
    public static function generate(): array
    {
        $raw    = 'crm_' . bin2hex(random_bytes(32));
        $hash   = hash('sha256', $raw);
        $prefix = substr($raw, 0, 10);

        return compact('raw', 'hash', 'prefix');
    }
}