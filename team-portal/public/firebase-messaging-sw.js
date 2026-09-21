/* eslint-disable no-undef */
// Safe import of Firebase scripts (fallback to standard Web Push if offline or blocked)
try {
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');
} catch (e) {
  // Offline or blocked; native Web Push listener handles all alerts
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Read config passed via URL search parameters if configured
try {
  const urlParams = new URL(location.href).searchParams;
  const firebaseConfig = {
    apiKey: urlParams.get('apiKey') || '',
    authDomain: urlParams.get('authDomain') || '',
    projectId: urlParams.get('projectId') || '',
    storageBucket: urlParams.get('storageBucket') || '',
    messagingSenderId: urlParams.get('messagingSenderId') || '',
    appId: urlParams.get('appId') || '',
  };

  if (typeof firebase !== 'undefined' && firebaseConfig.projectId && firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const title = payload.title || payload.notification?.title || payload.data?.title || 'White Ink Design Studio';
      const body =
        payload.body || payload.notification?.body || payload.data?.body || payload.data?.message || 'You have a new update.';
      const icon = payload.icon || payload.notification?.icon || '/white-ink-logo.png';
      const linkUrl = payload.linkUrl || payload.data?.linkUrl || payload.fcmOptions?.link || '/chat';

      self.registration.showNotification(title, {
        body,
        icon,
        badge: '/white-ink-logo.png',
        data: {
          linkUrl,
          ...(payload.data || {}),
        },
      });
    });
  }
} catch (err) {
  // Fall back to native push listener
}

// Native W3C Web Push event listener (Runs when portal is closed or backgrounded)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const payload = event.data.json();
    const title = payload.title || payload.notification?.title || payload.data?.title || 'White Ink Design Studio';
    const body = payload.body || payload.notification?.body || payload.data?.body || payload.data?.message || 'You have a new message.';
    const icon = payload.icon || payload.notification?.icon || '/white-ink-logo.png';
    const linkUrl = payload.linkUrl || payload.data?.linkUrl || payload.fcmOptions?.link || '/chat';

    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge: '/white-ink-logo.png',
        data: {
          linkUrl,
          ...(payload.data || {}),
        },
      })
    );
  } catch {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('White Ink Design Studio', {
        body: text,
        icon: '/white-ink-logo.png',
        badge: '/white-ink-logo.png',
        data: { linkUrl: '/chat' },
      })
    );
  }
});

// Handle notification clicks: navigate to linkUrl and focus client window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.linkUrl || '/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          if ('navigate' in client && urlToOpen && urlToOpen !== '/') {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
