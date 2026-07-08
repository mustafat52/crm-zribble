<?php

namespace App\Modules\Auth\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Modules\Auth\Models\LoginHistory;
use App\Modules\Auth\Models\TokenFamily;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Carbon\Carbon;

class AuthController extends Controller
{
    // -------------------------------------------------------------------------
    // POST /api/v1/auth/login
    // -------------------------------------------------------------------------
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        // Rate limit: 5 attempts per minute per IP
        $throttleKey = 'login:' . $request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            return response()->json([
                'message' => "Too many login attempts. Try again in {$seconds} seconds.",
            ], 429);
        }

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($throttleKey, 60);

            $this->logLoginAttempt($request, $user, 'failed', 'wrong_password');

            return response()->json(['message' => 'Invalid credentials.'], 401);
        }

        if (! $user->isActive()) {
            $this->logLoginAttempt($request, $user, 'failed', 'account_inactive');
            return response()->json(['message' => 'Your account has been deactivated. Contact your administrator.'], 403);
        }

        RateLimiter::clear($throttleKey);

        // Create Sanctum access token (short-lived — 1 day)
        $accessToken = $user->createToken(
            name: $this->deviceName($request),
            abilities: ['*'],
            expiresAt: Carbon::now()->addDay(),
        );

        // Create refresh token family (long-lived — 30 days)
        $familyId     = Str::uuid()->toString();
        $refreshToken = Str::random(64);

        TokenFamily::create([
            'user_id'             => $user->id,
            'business_id'         => $user->business_id,
            'family_id'           => $familyId,
            'refresh_token_hash'  => Hash::make($refreshToken),
            'device_name'         => $this->deviceName($request),
            'device_type'         => $this->deviceType($request),
            'ip_address'          => $request->ip(),
            'user_agent'          => $request->userAgent(),
            'expires_at'          => Carbon::now()->addDays(30),
        ]);

        $user->update(['last_login_at' => now()]);

        $this->logLoginAttempt($request, $user, 'success');

        return response()->json([
            'access_token'  => $accessToken->plainTextToken,
            'refresh_token' => $refreshToken,
            'family_id'     => $familyId,
            'token_type'    => 'Bearer',
            'expires_in'    => 86400,
            'user'          => $this->userPayload($user),
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/auth/refresh
    // Rotates the refresh token. Stolen token detection built in.
    // -------------------------------------------------------------------------
    public function refresh(Request $request): JsonResponse
    {
        $request->validate([
            'refresh_token' => 'required|string',
            'family_id'     => 'required|string',
        ]);

        $family = TokenFamily::where('family_id', $request->family_id)
            ->where('is_invalidated', false)
            ->first();

        if (! $family) {
            return response()->json(['message' => 'Invalid or expired session. Please log in again.'], 401);
        }

        // Stolen token detection:
        if (! Hash::check($request->refresh_token, $family->refresh_token_hash)) {
            $family->update([
                'is_invalidated' => true,
                'invalidated_at' => now(),
            ]);

            TokenFamily::where('family_id', $request->family_id)
                ->update(['is_invalidated' => true, 'invalidated_at' => now()]);

            return response()->json([
                'message' => 'Security alert: session invalidated due to token reuse. Please log in again.',
            ], 401);
        }

        if ($family->isExpired()) {
            return response()->json(['message' => 'Session expired. Please log in again.'], 401);
        }

        $user = User::find($family->user_id);

        if (! $user || ! $user->isActive()) {
            return response()->json(['message' => 'Account not found or deactivated.'], 401);
        }

        // Rotate: issue new access token and new refresh token, update the family
        $newAccessToken  = $user->createToken(
            name: $family->device_name ?? 'api',
            abilities: ['*'],
            expiresAt: Carbon::now()->addDay(),
        );

        $newRefreshToken = Str::random(64);

        $family->update([
            'refresh_token_hash' => Hash::make($newRefreshToken),
            'expires_at'         => Carbon::now()->addDays(30),
            'ip_address'         => $request->ip(),
        ]);

        return response()->json([
            'access_token'  => $newAccessToken->plainTextToken,
            'refresh_token' => $newRefreshToken,
            'family_id'     => $family->family_id,
            'token_type'    => 'Bearer',
            'expires_in'    => 86400,
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/auth/logout  (revokes current token only)
    // -------------------------------------------------------------------------
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    // -------------------------------------------------------------------------
    // POST /api/v1/auth/logout-all  (revokes all tokens across all devices)
    // -------------------------------------------------------------------------
    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->tokens()->delete();

        TokenFamily::where('user_id', $user->id)
            ->update(['is_invalidated' => true, 'invalidated_at' => now()]);

        return response()->json(['message' => 'Logged out from all devices.']);
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/auth/devices  (list active sessions)
    // -------------------------------------------------------------------------
    public function devices(Request $request): JsonResponse
    {
        $devices = TokenFamily::where('user_id', $request->user()->id)
            ->where('is_invalidated', false)
            ->where('expires_at', '>', now())
            ->orderByDesc('created_at')
            ->get(['id', 'device_name', 'device_type', 'ip_address', 'created_at', 'expires_at']);

        return response()->json(['devices' => $devices]);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/v1/auth/devices/{tokenId}  (revoke a specific device)
    // -------------------------------------------------------------------------
    public function revokeDevice(Request $request, string $tokenId): JsonResponse
    {
        $family = TokenFamily::where('id', $tokenId)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $family->update(['is_invalidated' => true, 'invalidated_at' => now()]);

        return response()->json(['message' => 'Device session revoked.']);
    }

    // -------------------------------------------------------------------------
    // GET /api/v1/me  (current authenticated user)
    // -------------------------------------------------------------------------
    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->userPayload($request->user())]);
    }

    // -------------------------------------------------------------------------
    // T58: Forgot / Reset password — implemented via Laravel password broker
    // -------------------------------------------------------------------------

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => 'required|email']);

        $status = Password::sendResetLink(
            $request->only('email')
        );

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json(['message' => 'If that email exists, a reset link has been sent.']);
        }

        return response()->json([
            'message' => 'Unable to send reset link. Please check the email address and try again.',
        ], 422);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->validate([
            'token'                 => 'required',
            'email'                 => 'required|email',
            'password'              => 'required|min:8|confirmed',
            'password_confirmation' => 'required',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(Str::random(60));

                $user->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return response()->json(['message' => 'Password reset successfully.']);
        }

        return response()->json([
            'message' => 'Invalid or expired reset token. Please request a new password reset.',
        ], 422);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private function userPayload(User $user): array
    {
        return [
            'id'          => $user->id,
            'name'        => $user->name,
            'email'       => $user->email,
            'phone'       => $user->phone,
            'business_id' => $user->business_id,
            'branch_id'   => $user->branch_id,
            'roles'       => $user->getRoleNames(),
            'is_active'   => $user->is_active,
            'last_login'  => $user->last_login_at,
        ];
    }

    private function logLoginAttempt(Request $request, ?User $user, string $outcome, ?string $reason = null): void
    {
        if (! $user) {
            return;
        }

        LoginHistory::create([
            'user_id'        => $user->id,
            'business_id'    => $user->business_id,
            'ip_address'     => $request->ip(),
            'user_agent'     => $request->userAgent(),
            'device_name'    => $this->deviceName($request),
            'device_type'    => $this->deviceType($request),
            'outcome'        => $outcome,
            'failure_reason' => $reason,
            'logged_in_at'   => now(),
        ]);
    }

    private function deviceName(Request $request): string
    {
        return $request->header('X-Device-Name', $request->userAgent() ?? 'Unknown Device');
    }

    private function deviceType(Request $request): string
    {
        $agent = strtolower($request->userAgent() ?? '');
        if (str_contains($agent, 'mobile') || str_contains($agent, 'android')) {
            return 'mobile';
        }
        if (str_contains($agent, 'tablet') || str_contains($agent, 'ipad')) {
            return 'tablet';
        }
        return 'desktop';
    }
}
