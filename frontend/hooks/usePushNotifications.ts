// frontend/hooks/usePushNotifications.ts
'use client';

import { useEffect, useRef, useState } from 'react';

// ─── API helper ──────────────────────────────────────────────────────────────
// Uses native fetch — no axios dependency needed.
// Reads token from Zustand-persisted auth store in localStorage.

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

const BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api/v1';

async function apiGet<T>(path: string): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function apiPost(path: string, body: unknown): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
}

async function apiDelete(path: string, body: unknown): Promise<void> {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}

// ─── Types ───────────────────────────────────────────────────────────────────

type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

export interface UsePushNotificationsReturn {
  permission:   PushPermission;
  isSubscribed: boolean;
  isLoading:    boolean;
  subscribe:    () => Promise<void>;
  unsubscribe:  () => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Convert a base64 URL-safe string to Uint8Array — required by PushManager */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output  = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output.buffer;
}

/** Pull the encrypted keys from a PushSubscription into a plain object */
function serializeSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  return {
    endpoint: sub.endpoint,
    p256dh:   json.keys?.p256dh ?? '',
    auth:     json.keys?.auth   ?? '',
  };
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  } catch (err) {
    console.error('[PushNotifications] SW registration failed:', err);
    return null;
  }
}

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const data = await apiGet<{ public_key: string }>('/push/vapid-public-key');
    return data?.public_key ?? null;
  } catch {
    return null;
  }
}

async function saveSubscriptionToBackend(sub: PushSubscription): Promise<void> {
  await apiPost('/push/subscribe', serializeSubscription(sub));
}

async function deleteSubscriptionFromBackend(endpoint: string): Promise<void> {
  await apiDelete('/push/subscribe', { endpoint });
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * usePushNotifications
 *
 * Full push notification lifecycle:
 * 1. Registers /sw.js service worker
 * 2. Reads current browser permission
 * 3. If permission already granted, auto-subscribes silently (returning users)
 * 4. subscribe() shows browser permission prompt + saves subscription
 * 5. unsubscribe() removes from browser + backend
 *
 * Call once in (dashboard)/layout.tsx — it handles everything internally.
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission,   setPermission]   = useState<PushPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  // ── On mount: register SW and check current state ─────────────────────────
  useEffect(() => {
    if (!isPushSupported()) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as PushPermission);

    registerServiceWorker().then((reg) => {
      if (!reg) return;
      swRegRef.current = reg;

      // Handle subscription rotation (browser may rotate push keys)
      navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
        if (e.data?.type === 'PUSH_SUBSCRIPTION_CHANGED') {
          autoSubscribeIfPermitted(reg);
        }
      });

      // If permission already granted, silently re-subscribe if needed
      if (Notification.permission === 'granted') {
        autoSubscribeIfPermitted(reg);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function autoSubscribeIfPermitted(reg: ServiceWorkerRegistration) {
    try {
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setIsSubscribed(true);
        return;
      }

      const vapidKey = await fetchVapidPublicKey();
      if (!vapidKey) return;

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      await saveSubscriptionToBackend(subscription);
      setIsSubscribed(true);
    } catch {
      // Auto-subscribe failures are non-critical — user can click Enable manually
    }
  }

  // ── Manual subscribe (triggers browser permission prompt) ─────────────────
  async function subscribe(): Promise<void> {
    if (!isPushSupported()) return;
    setIsLoading(true);
    try {
      const reg = swRegRef.current ?? (await registerServiceWorker());
      if (!reg) return;
      swRegRef.current = reg;

      const vapidKey = await fetchVapidPublicKey();
      if (!vapidKey) {
        console.error('[PushNotifications] VAPID public key missing — check .env');
        return;
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      setPermission('granted');
      await saveSubscriptionToBackend(subscription);
      setIsSubscribed(true);
    } catch (err) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setPermission('denied');
      }
      console.error('[PushNotifications] subscribe() failed:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Manual unsubscribe ────────────────────────────────────────────────────
  async function unsubscribe(): Promise<void> {
    if (!isPushSupported()) return;
    setIsLoading(true);
    try {
      const reg = swRegRef.current;
      if (!reg) return;

      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        setIsSubscribed(false);
        return;
      }

      await deleteSubscriptionFromBackend(subscription.endpoint);
      await subscription.unsubscribe();
      setIsSubscribed(false);
    } catch (err) {
      console.error('[PushNotifications] unsubscribe() failed:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe };
}