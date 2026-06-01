<?php

namespace App\Modules\Notifications\Services;

use App\Models\PushSubscription;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;
use Illuminate\Support\Facades\Log;

class WebPushService
{
    private WebPush $webPush;

    public function __construct()
    {
        $auth = [
            'VAPID' => [
                'subject'    => env('APP_URL', 'http://localhost:3000'),
                'publicKey'  => env('VAPID_PUBLIC_KEY', ''),
                'privateKey' => env('VAPID_PRIVATE_KEY', ''),
            ],
        ];

        // TTL: 4 hours. If the browser is offline, the push server holds the message for 4h.
        $this->webPush = new WebPush($auth, ['TTL' => 14400]);
    }

    /**
     * Send a push notification to ALL subscriptions belonging to a user.
     * One user can have multiple devices/browsers — we send to all of them.
     *
     * @param  string  $userId    UUID of the target user
     * @param  string  $title     Notification title shown in OS notification
     * @param  string  $body      Notification body text
     * @param  string  $url       URL to open when user clicks the notification
     * @param  string  $icon      Icon path (served from Next.js public/)
     */
    public static function sendToUser(
        string $userId,
        string $title,
        string $body,
        string $url = '/dashboard',
        string $icon = '/icon-192.png'
    ): void {
        $subscriptions = PushSubscription::where('user_id', $userId)->get();

        if ($subscriptions->isEmpty()) {
            return; // User has no push subscriptions — silent exit, not an error
        }

        try {
            $service = new self();

            $payload = json_encode([
                'title' => $title,
                'body'  => $body,
                'url'   => $url,
                'icon'  => $icon,
            ]);

            foreach ($subscriptions as $sub) {
                $subscription = Subscription::create([
                    'endpoint'        => $sub->endpoint,
                    'keys' => [
                        'p256dh' => $sub->p256dh,
                        'auth'   => $sub->auth,
                    ],
                ]);

                $service->webPush->queueNotification($subscription, $payload);
            }

            // Send all queued notifications and handle results
            foreach ($service->webPush->flush() as $report) {
                $endpoint = $report->getRequest()->getUri()->__toString();

                if (!$report->isSuccess()) {
                    $reason = $report->getReason();
                    Log::warning("WebPush failed for endpoint {$endpoint}: {$reason}");

                    // 410 Gone or 404 = subscription is expired/invalid — clean it up
                    if ($report->isSubscriptionExpired()) {
                        PushSubscription::where('endpoint', $endpoint)->delete();
                        Log::info("WebPush: removed expired subscription for user {$userId}");
                    }
                }
            }
        } catch (\Throwable $e) {
            // Push failures must NEVER crash the main notification flow
            Log::error("WebPushService::sendToUser failed: {$e->getMessage()}", [
                'user_id' => $userId,
                'title'   => $title,
            ]);
        }
    }
}