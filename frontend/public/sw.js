// frontend/public/sw.js
// LeadOS Service Worker — PWA Push Notifications
// Registered by usePushNotifications.ts on first authenticated load.

const CACHE_NAME = 'leados-v1';

// ── Install: skip waiting so updated SW activates immediately ───────────────
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// ── Activate: claim all clients immediately ──────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ── Push: show OS-level notification ─────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    // Fallback if payload is plain text
    data = {
      title: 'LeadOS',
      body: event.data.text(),
      url: '/dashboard',
      icon: '/icon-192.png',
    };
  }

  const title   = data.title   || 'LeadOS';
  const options = {
    body:             data.body    || '',
    icon:             data.icon    || '/icon-192.png',
    badge:            '/badge-72.png',
    tag:              data.url     || 'leados-notification', // groups notifications by URL
    renotify:         true,                                   // vibrate even if same tag
    requireInteraction: false,                                // auto-dismiss after a few seconds
    data: {
      url: data.url || '/dashboard',
    },
    actions: [
      { action: 'open',    title: 'Open Lead' },
      { action: 'dismiss', title: 'Dismiss'   },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification click: focus or open the CRM tab ────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // If user clicked "Dismiss" action — do nothing
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a CRM tab is already open, focus it and navigate to the lead URL
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // No existing tab — open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Push subscription change: re-subscribe automatically ─────────────────────
// This fires when the browser rotates push credentials (rare but happens).
// The frontend will re-subscribe on next page load via usePushNotifications.
self.addEventListener('pushsubscriptionchange', (event) => {
  // Signal the page to re-subscribe — handled by usePushNotifications hook
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) =>
        client.postMessage({ type: 'PUSH_SUBSCRIPTION_CHANGED' })
      );
    })
  );
});