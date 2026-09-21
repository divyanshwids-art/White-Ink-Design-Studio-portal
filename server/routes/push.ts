import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';
import { getVapidPublicKey, sendWebPushToUser } from '../services/webpush.ts';

export const pushRouter = Router();

// GET /vapid-key - Return public VAPID key for browser push subscription
pushRouter.get('/vapid-key', (_req, res: Response) => {
  try {
    const publicKey = getVapidPublicKey();
    return res.status(200).json({ publicKey });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to get VAPID key.' });
  }
});

pushRouter.use(requireAuth);

// POST /subscribe - Save web push subscription
pushRouter.post('/subscribe', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.auth || !keys?.p256dh) {
      return res.status(400).json({ message: 'Invalid push subscription object.' });
    }

    const sub = db.savePushSubscription({
      userId: req.user!.id,
      endpoint,
      authKey: keys.auth,
      p256dhKey: keys.p256dh,
    });

    return res.status(201).json({ message: 'Push notifications subscribed successfully.', subscription: sub });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to save push subscription.' });
  }
});

// POST /unsubscribe - Remove web push subscription
pushRouter.post('/unsubscribe', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      db.removePushSubscription(endpoint);
    }
    return res.status(200).json({ message: 'Push notifications unsubscribed.' });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to unsubscribe.' });
  }
});

// POST /test-push - Test push notification for logged-in user
pushRouter.post('/test-push', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await sendWebPushToUser(req.user!.id, {
      title: req.body.title || 'White Ink Design Studio',
      body: req.body.body || 'Test desktop push notification received successfully!',
      linkUrl: req.body.linkUrl || '/chat',
    });
    return res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to send test push.' });
  }
});
