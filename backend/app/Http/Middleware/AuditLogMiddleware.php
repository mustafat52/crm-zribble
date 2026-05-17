<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\AuditLog;

class AuditLogMiddleware
{
    public function handle(Request $request, Closure $next)
    {
        return $next($request);
    }

    public static function log(
        string $modelType,
        string $modelId,
        string $event,
        ?array $oldValues = null,
        ?array $newValues = null
    ): void {
        if (!Auth::check()) return;

        $user = Auth::user();
        if (!$user->business_id) return;

        AuditLog::create([
            'business_id' => $user->business_id,
            'user_id'     => $user->id,
            'model_type'  => $modelType,
            'model_id'    => $modelId,
            'event'       => $event,
            'old_values'  => $oldValues,
            'new_values'  => $newValues,
            'ip_address'  => request()->ip(),
            'user_agent'  => request()->userAgent(),
        ]);
    }
}