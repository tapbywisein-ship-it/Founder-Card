import { apiFetch } from './api';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

export const notificationsService = {
  async getNotifications(page = 1, limit = 20) {
    return apiFetch<{ data: { notifications: Notification[]; pagination: unknown; unreadCount: number } }>(
      `/notifications?page=${page}&limit=${limit}`
    );
  },

  async markRead(notificationId: string) {
    return apiFetch<{ data: Notification }>(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    });
  },

  async markAllRead() {
    return apiFetch<{ data: null }>('/notifications/read-all', { method: 'PUT' });
  },

  async getUnreadCount() {
    return apiFetch<{ data: { count: number } }>('/notifications/unread-count');
  },

  async getPushPublicKey() {
    return apiFetch<{ data: { publicKey: string; configured: boolean } }>(
      '/notifications/push/public-key'
    );
  },

  async subscribePush(subscription: PushSubscriptionJSON) {
    return apiFetch<{ data: null }>('/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ subscription }),
    });
  },

  async unsubscribePush(endpoint: string) {
    return apiFetch<{ data: null }>('/notifications/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    });
  },
};

/** Decode a base64url VAPID public key into the Uint8Array the Push API wants. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export type PushPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export function getPushPermissionState(): PushPermissionState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as PushPermissionState;
}

/**
 * Ask permission, subscribe the active service worker to Web Push using the
 * server's VAPID public key, and register the subscription with the backend.
 * Returns true on success. Safe to call repeatedly (idempotent on the server).
 */
export async function enablePushNotifications(): Promise<boolean> {
  if (getPushPermissionState() === 'unsupported') {
    throw new Error('Push notifications are not supported in this browser');
  }

  const { data } = await notificationsService.getPushPublicKey();
  if (!data.configured || !data.publicKey) {
    throw new Error('Push notifications are not configured on the server yet');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });
  }

  await notificationsService.subscribePush(sub.toJSON());
  return true;
}

/** Unsubscribe locally and tell the backend to drop the record. */
export async function disablePushNotifications(): Promise<void> {
  if (getPushPermissionState() === 'unsupported') return;
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  const { endpoint } = sub;
  await sub.unsubscribe().catch(() => {});
  await notificationsService.unsubscribePush(endpoint).catch(() => {});
}
