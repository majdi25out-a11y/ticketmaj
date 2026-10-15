// Custom Service Worker script for Android & PWA Push / Background Notifications
/* eslint-disable no-restricted-globals */

self.addEventListener('install', (event) => {
  // Activate worker immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Take control of all clients immediately
  event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const ticketId = event.notification.data?.ticketId;
  const targetUrl = event.notification.data?.url || (ticketId ? `/?ticket=${ticketId}` : '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and notify client
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'OPEN_TICKET', ticketId, url: targetUrl });
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Push notification received from Server (even when app is closed / in background on Android)
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = {
      title: 'TicketFlow',
      body: event.data ? event.data.text() : 'Nouvelle mise à jour disponible',
    };
  }

  const title = payload.title || 'TicketFlow';
  const tag = payload.tag || `tf-${payload.ticketId || Date.now()}`;
  const options = {
    body: payload.desc || payload.body || 'Une nouvelle notification est disponible.',
    icon: payload.icon || '/pwa-192x192.png',
    badge: '/favicon.png',
    vibrate: [250, 100, 250, 100, 250],
    data: {
      ticketId: payload.ticketId,
      url: payload.url || (payload.ticketId ? `/?ticket=${payload.ticketId}` : '/'),
    },
    tag,
    renotify: true,
    requireInteraction: Boolean(payload.urgent),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Foreground & In-App messages
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, ticketId, urgent, tag } = event.data;
    const finalTag = tag || `tf-${ticketId || Date.now()}`;
    const options = {
      body: body || 'Mise à jour disponible.',
      icon: '/pwa-192x192.png',
      badge: '/favicon.png',
      vibrate: [200, 100, 200],
      data: {
        ticketId,
        url: ticketId ? `/?ticket=${ticketId}` : '/',
      },
      tag: finalTag,
      renotify: true,
      requireInteraction: Boolean(urgent),
    };

    event.waitUntil(self.registration.showNotification(title || 'TicketFlow', options));
  }
});

// Periodic background sync if supported by Android browser
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-tickets-notifications') {
    event.waitUntil(
      fetch('/api/notifications')
        .then((res) => (res.ok ? res.json() : []))
        .then((notifs) => {
          if (Array.isArray(notifs) && notifs.length > 0) {
            const unread = notifs.filter((n) => !n.read && n.urgent);
            if (unread.length > 0) {
              const latest = unread[0];
              return self.registration.showNotification(latest.title, {
                body: latest.desc,
                icon: '/pwa-192x192.png',
                badge: '/favicon.png',
                vibrate: [200, 100, 200],
                tag: `tf-periodic-${latest.id}`,
                data: { ticketId: latest.ticketId },
              });
            }
          }
        })
        .catch(() => {})
    );
  }
});
