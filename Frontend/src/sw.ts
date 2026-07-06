/// <reference lib="webworker" />
// Push-only service worker. Intentionally has NO fetch handler and NO caching —
// it exists solely to receive Web Push events and show notifications, so it can
// never intercept navigation or serve stale bundles (the failure mode the old
// self-destroying SW guarded against). Compiled by vite-plugin-pwa
// (injectManifest); excluded from the app tsc via tsconfig.app.json.

import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope &
  typeof globalThis & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

// Precache only static, immutable assets (icons/favicon/robots/manifest) —
// NEVER index.html. Precaching index.html is exactly what served stale,
// app-breaking bundles before; excluding it means navigations always fetch the
// live HTML (with the current bundle hashes) from the network. This reference
// also satisfies injectManifest's __WB_MANIFEST injection point.
precacheAndRoute(self.__WB_MANIFEST.filter((entry) => !/(^|\/)index\.html$/.test(entry.url)));

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  tag?: string;
}

// Activate immediately so a freshly-installed SW starts receiving push events.
self.addEventListener('install', () => {
  void self.skipWaiting();
});
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event: PushEvent) => {
  let payload: PushPayload = {};
  try {
    payload = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    payload = { body: event.data?.text() };
  }

  const title = payload.title || 'TapByWisein';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: payload.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: payload.tag,
      data: { url: payload.url || '/notifications' },
    })
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const target = (event.notification.data?.url as string) || '/notifications';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            void client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
