import webpush from 'web-push';
import fs from 'fs';
import path from 'path';
import { db } from '../db.ts';

// Storage file for persistent VAPID keys if not specified in environment
const VAPID_KEY_FILE = path.join(process.cwd(), 'server', 'vapid.json');

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

let vapidKeys: VapidKeys;

function initVapidKeys(): VapidKeys {
  const envPublic = process.env.VAPID_PUBLIC_KEY || process.env.VITE_FIREBASE_VAPID_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;

  if (envPublic && envPrivate) {
    return {
      publicKey: envPublic.trim(),
      privateKey: envPrivate.trim(),
    };
  }

  // Check if saved on disk
  if (fs.existsSync(VAPID_KEY_FILE)) {
    try {
      const content = fs.readFileSync(VAPID_KEY_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed.publicKey && parsed.privateKey) {
        return parsed;
      }
    } catch {
      // Re-generate if corrupt
    }
  }

  // Generate fresh persistent VAPID keys
  const generated = webpush.generateVAPIDKeys();
  try {
    fs.writeFileSync(VAPID_KEY_FILE, JSON.stringify(generated, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[WebPush] Could not write vapid.json to disk:', err);
  }

  return generated;
}

vapidKeys = initVapidKeys();

try {
  webpush.setVapidDetails(
    'mailto:notifications@whiteinkdesignstudio.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.info('[WebPush] VAPID push service initialized successfully.');
} catch (err) {
  console.error('[WebPush] Failed to configure VAPID details:', err);
}

export function getVapidPublicKey(): string {
  return vapidKeys.publicKey;
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  linkUrl?: string;
  data?: Record<string, any>;
}

/**
 * Dispatches a native Web Push notification to all active browser push subscriptions for a user.
 * Chrome wakes up the Service Worker even when all tabs or the portal are completely closed.
 */
export async function sendWebPushToUser(userId: string, payload: WebPushPayload): Promise<{ sent: number; failed: number }> {
  const subscriptions = db.getPushSubscriptions(userId);
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const notificationData = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/white-ink-logo.png',
    badge: payload.badge || '/white-ink-logo.png',
    linkUrl: payload.linkUrl || '/chat',
    data: {
      linkUrl: payload.linkUrl || '/chat',
      ...(payload.data || {}),
    },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.authKey,
            p256dh: sub.p256dhKey,
          },
        },
        notificationData,
        {
          urgency: 'high',
          TTL: 60 * 60 * 24, // 24 hours
        }
      );
      sent++;
    } catch (err: any) {
      failed++;
      console.warn(`[WebPush] Push to endpoint failed (status ${err?.statusCode}):`, err?.message || err);
      // If subscription is expired, deregistered, or invalid (404/410), clean it up from DB
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        console.info(`[WebPush] Removing expired push subscription for user ${userId}`);
        db.removePushSubscription(sub.endpoint);
      }
    }
  }

  return { sent, failed };
}

