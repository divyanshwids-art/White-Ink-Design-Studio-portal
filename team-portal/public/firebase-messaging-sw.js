/* eslint-disable no-undef */
// Scripts for Firebase Cloud Messaging in Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Read config passed via URL search parameters
const urlParams = new URL(location.href).searchParams;
const firebaseConfig = {
  apiKey: urlParams.get('apiKey') || '',
  authDomain: urlParams.get('authDomain') || '',
  projectId: urlParams.get('projectId') || '',
  storageBucket: urlParams.get('storageBucket') || '',
  messagingSenderId: urlParams.get('messagingSenderId') || '',
  appId: urlParams.get('appId') || '',
};

if (firebaseConfig.projectId && firebaseConfig.apiKey) {
  try {
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Background push payload received:', payload);
      const title = payload.notification?.title || payload.data?.title || 'White Ink Team Alert';
      const body =
        payload.notification?.body || payload.data?.body || payload.data?.message || 'You have a new update.';
      const icon = payload.notification?.icon || '/white-ink-logo.png';
      const linkUrl = payload.data?.linkUrl || payload.fcmOptions?.link || '/';

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
  } catch (err) {
    console.warn('[firebase-messaging-sw.js] Failed to initialize Firebase messaging in SW:', err);
  }
}

// Handle notification clicks: navigate to linkUrl and focus client window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.linkUrl || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          if ('navigate' in client && urlToOpen !== '/') {
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
