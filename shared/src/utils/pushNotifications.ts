import { api } from '../services/api';

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function checkPushSupport(): Promise<PushStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'denied', isSubscribed: false };
  }

  const permission = Notification.permission;
  let isSubscribed = false;

  if (permission === 'granted' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        isSubscribed = Boolean(sub);
      }
    } catch {
      isSubscribed = false;
    }
  }

  return {
    supported: true,
    permission,
    isSubscribed,
  };
}

/**
 * Registers the background Service Worker and subscribes Chrome to native Web Push (VAPID).
 * This ensures Chrome wakes up and shows notifications even when the portal is completely closed!
 */
export async function subscribeToWebPush(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    // 1. Request or verify permission
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }
    if (permission !== 'granted') {
      return false;
    }

    // 2. Register Service Worker with root scope
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    }

    // Give service worker a moment to initialize without blocking indefinitely
    let sw = reg.installing || reg.waiting || reg.active;
    if (!sw) {
      reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
    }

    // 3. Obtain VAPID Public Key from server
    const vapidRes = await api.getVapidPublicKey().catch(() => null);
    if (!vapidRes?.publicKey) {
      console.warn('[WebPush] Server did not provide a VAPID public key.');
      return false;
    }

    // 4. Subscribe with PushManager
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const appServerKey = urlBase64ToUint8Array(vapidRes.publicKey);
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });
    }

    // 5. Send real Chrome push subscription to backend
    const subJson = subscription.toJSON();
    if (subJson.endpoint && subJson.keys?.auth && subJson.keys?.p256dh) {
      await api.subscribePush({
        endpoint: subJson.endpoint,
        keys: {
          auth: subJson.keys.auth,
          p256dh: subJson.keys.p256dh,
        },
      });
      console.info('[WebPush] Native Chrome push subscription successfully registered with backend.');
      return true;
    }

    return false;
  } catch (err: any) {
    console.warn('[WebPush] Push subscription registration error:', err?.message || err);
    return false;
  }
}

export async function requestPushPermission(): Promise<boolean> {
  return subscribeToWebPush();
}

/**
 * Triggers a desktop notification when the portal is open in a browser tab.
 * Never hangs indefinitely on serviceWorker.ready.
 */
export async function triggerLocalNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const notificationOptions: NotificationOptions = {
    icon: '/white-ink-logo.png',
    badge: '/white-ink-logo.png',
    ...options,
  };

  // 1. Try displaying through active service worker (best on Chrome for rich notifications)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.active && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notificationOptions);
        return;
      }
    } catch {
      // Fall through to Notification constructor
    }
  }

  // 2. Direct Notification constructor fallback
  try {
    const notif = new Notification(title, notificationOptions);
    if (options?.data?.linkUrl) {
      notif.onclick = () => {
        window.focus();
        if (options.data.linkUrl && options.data.linkUrl !== '/') {
          window.location.hash = options.data.linkUrl;
        }
        notif.close();
      };
    }
  } catch (e) {
    console.warn('[LocalNotification] Desktop notification popup failed:', e);
  }
}
