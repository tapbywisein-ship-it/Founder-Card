import { apiFetch } from '@/services/api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export type PushState = 'unsupported' | 'denied' | 'subscribed' | 'default';

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'subscribed' : 'default';
}

/** Request permission + subscribe this browser; persists the subscription server-side. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Push notifications aren’t supported in this browser');
  const { data } = await apiFetch<{ data: { publicKey: string; configured: boolean } }>(
    '/notifications/push/public-key'
  );
  if (!data.configured || !data.publicKey) {
    throw new Error('Push notifications aren’t configured on the server yet');
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Notification permission was denied');

  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
  });
  await apiFetch('/notifications/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await apiFetch('/notifications/push/unsubscribe', {
    method: 'POST',
    body: JSON.stringify({ endpoint: sub.endpoint }),
  }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
