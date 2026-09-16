import { api } from '../services/api';

export interface PushStatus {
  supported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}

export async function checkPushSupport(): Promise<PushStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return { supported: false, permission: 'denied', isSubscribed: false };
  }

  const permission = Notification.permission;
  const isSubscribed = permission === 'granted';

  return {
    supported: true,
    permission,
    isSubscribed,
  };
}

export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Register subscription endpoint on backend for simulated / web push notifications
      const dummyEndpoint = `https://fcm.googleapis.com/fcm/send/workspace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      await api.subscribePush({
        endpoint: dummyEndpoint,
        keys: {
          p256dh: 'mock-p256dh-key',
          auth: 'mock-auth-key',
        },
      }).catch(() => {});

      new Notification('Notifications Enabled', {
        body: 'You will now receive desktop alerts for task assignments, leave reviews, and mentions.',
        icon: '/favicon.ico',
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to request push notification permission:', err);
    return false;
  }
}

export function triggerLocalNotification(title: string, options?: NotificationOptions) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        ...options,
      });
    } catch (e) {
      console.warn('Could not display desktop notification:', e);
    }
  }
}
