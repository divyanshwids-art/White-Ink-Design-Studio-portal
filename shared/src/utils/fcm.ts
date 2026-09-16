import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported, Messaging } from 'firebase/messaging';
import { api } from '../services/api';

let messagingInstance: Messaging | null = null;
let isListeningForeground = false;

export interface FcmInitResult {
  success: boolean;
  token?: string;
  reason?: 'unsupported' | 'unconfigured' | 'permission_denied' | 'token_error' | 'already_registered';
  error?: string;
}

/**
 * Initializes Firebase Cloud Messaging in the browser and registers the token with the backend.
 * Called on user login, page refresh for logged-in users, or manual push enable.
 */
export async function initAndRegisterFcmToken(): Promise<FcmInitResult> {
  if (typeof window === 'undefined') {
    return { success: false, reason: 'unsupported' };
  }

  // 1. Check browser feature support
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    console.warn('[FCM] Browser does not support Notifications or Service Workers.');
    return { success: false, reason: 'unsupported' };
  }

  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('[FCM] Firebase Messaging is not supported in this browser environment.');
      return { success: false, reason: 'unsupported' };
    }
  } catch (err: any) {
    console.warn('[FCM] Error checking isSupported:', err);
    return { success: false, reason: 'unsupported' };
  }

  // 2. Retrieve Firebase Web configuration from Vite environment variables
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

  let config: any = null;
  if (apiKey && projectId && messagingSenderId) {
    config = { apiKey, projectId, messagingSenderId, appId, authDomain, storageBucket, vapidKey };
  } else {
    try {
      const res = await api.getFcmConfig();
      if (res.configured && res.config.projectId) {
        config = res.config;
      }
    } catch {
      // Ignore
    }
  }

  if (!config || !config.projectId || !config.apiKey) {
    console.info('[FCM] Firebase configuration not found in environment. Push registration is waiting for credentials.');
    return { success: false, reason: 'unconfigured' };
  }

  // 3. Request user permission
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[FCM] Notification permission was not granted by user:', permission);
      return { success: false, reason: 'permission_denied' };
    }
  } catch (permErr: any) {
    console.warn('[FCM] Error requesting notification permission:', permErr);
    return { success: false, reason: 'permission_denied' };
  }

  // 4. Register or reuse service worker with config query params
  try {
    const swParams = new URLSearchParams({
      apiKey: config.apiKey || '',
      authDomain: config.authDomain || '',
      projectId: config.projectId || '',
      storageBucket: config.storageBucket || '',
      messagingSenderId: config.messagingSenderId || '',
      appId: config.appId || '',
    });

    const swUrl = `/firebase-messaging-sw.js?${swParams.toString()}`;
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/',
    });

    await navigator.serviceWorker.ready;

    // 5. Initialize Firebase App
    const firebaseConfig = {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    };

    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    const messaging = getMessaging(app);
    messagingInstance = messaging;

    // 6. Obtain FCM device token
    const tokenOptions: { vapidKey?: string; serviceWorkerRegistration: ServiceWorkerRegistration } = {
      serviceWorkerRegistration: registration,
    };
    if (config.vapidKey) {
      tokenOptions.vapidKey = config.vapidKey;
    }

    const currentToken = await getToken(messaging, tokenOptions);

    if (currentToken) {
      // 7. Register token with backend User model
      await api.registerFcmToken(currentToken);
      localStorage.setItem('pms_fcm_token', currentToken);

      // 8. Attach foreground notification listener
      if (!isListeningForeground) {
        isListeningForeground = true;
        onMessage(messaging, (payload) => {
          console.log('[FCM] Foreground notification received:', payload);
          const title = payload.notification?.title || payload.data?.title || 'Workspace Alert';
          const body = payload.notification?.body || payload.data?.body || payload.data?.message || '';

          // Display desktop notification when in foreground if permitted
          if (Notification.permission === 'granted') {
            try {
              new Notification(title, {
                body,
                icon: '/favicon.ico',
                data: payload.data,
              });
            } catch (e) {
              console.warn('[FCM] Foreground Notification constructor failed:', e);
            }
          }
        });
      }

      return { success: true, token: currentToken };
    } else {
      console.warn('[FCM] No registration token available. Request permission to generate one.');
      return { success: false, reason: 'token_error', error: 'No token generated' };
    }
  } catch (err: any) {
    console.error('[FCM] An error occurred while retrieving token:', err);
    return { success: false, reason: 'token_error', error: err?.message || String(err) };
  }
}

/**
 * Check current push notification permission & status
 */
export async function getFcmPermissionStatus(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  hasToken: boolean;
}> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
    return { supported: false, permission: 'denied', hasToken: false };
  }

  const permission = Notification.permission;
  const hasToken = Boolean(localStorage.getItem('pms_fcm_token'));

  return {
    supported: true,
    permission,
    hasToken,
  };
}
