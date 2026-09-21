import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, UserRecord } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';
import { broadcastUpdate } from '../events.ts';

export const chatRouter = Router();

const chatUploadDir = path.join(process.cwd(), 'public', 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, chatUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    cb(null, `${sanitizedBase}_${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
});

chatRouter.use(requireAuth);

export function canAccessChannel(user: UserRecord, channel: string): boolean {
  if (channel === 'internal') {
    return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'TEAM_MEMBER';
  }

  if (channel.startsWith('client-')) {
    const clientId = channel.replace('client-', '');

    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      return true;
    }

    if (user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN') {
      if (user.clientId === clientId) return true;
      const client = db.getClientById(clientId);
      if (client && (client.email.toLowerCase() === user.email.toLowerCase() || client.id === user.id)) {
        return true;
      }
      return false;
    }

    if (user.role === 'TEAM_MEMBER') {
      const accessibleClientIds = db.getAccessibleClientIdsForTeamMember(user.id);
      return accessibleClientIds.includes(clientId);
    }

    return false;
  }

  return false;
}

// GET /channels - List accessible channels for current user
chatRouter.get('/channels', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const channels: { id: string; name: string; type: 'internal' | 'client' }[] = [];

    // 1. Internal Team Chat for staff only
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'TEAM_MEMBER') {
      channels.push({
        id: 'internal',
        name: 'Internal Team Chat',
        type: 'internal',
      });
    }

    // 2. Client channels
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      const clients = db.getClients();
      for (const client of clients) {
        channels.push({
          id: `client-${client.id}`,
          name: client.company || client.name,
          type: 'client',
        });
      }
    } else if (user.role === 'TEAM_MEMBER') {
      const accessibleClientIds = db.getAccessibleClientIdsForTeamMember(user.id);
      for (const cId of accessibleClientIds) {
        const client = db.getClientById(cId);
        if (client) {
          channels.push({
            id: `client-${client.id}`,
            name: client.company || client.name,
            type: 'client',
          });
        }
      }
    } else if (user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN') {
      let client = user.clientId ? db.getClientById(user.clientId) : null;
      if (!client) {
        client =
          db
            .getClients()
            .find(
              (c) => c.email.toLowerCase() === user.email.toLowerCase() || c.id === user.id
            ) || null;
      }
      if (client) {
        channels.push({
          id: `client-${client.id}`,
          name: client.company || client.name,
          type: 'client',
        });
      }
    }

    return res.json(channels);
  } catch (err: any) {
    console.error('Error fetching chat channels:', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch channels.' });
  }
});

// GET /messages - List messages in channel with access control
chatRouter.get('/messages', (req: AuthenticatedRequest, res: Response) => {
  try {
    const channel = (req.query.channel as string) || (req.user!.role === 'CLIENT' || req.user!.role === 'CLIENT_ADMIN' ? `client-${req.user!.clientId}` : 'internal');

    if (!canAccessChannel(req.user!, channel)) {
      return res.status(403).json({ message: `Forbidden: You do not have access to channel '${channel}'.` });
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const messages = db.getChatMessages({ channel, limit });
    return res.status(200).json(messages);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch messages.' });
  }
});

// POST /upload - Upload a file (photo, PDF, document) for chat attachment
chatRouter.post('/upload', upload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file was provided for upload.' });
    }

    const file = req.file;
    const fileUrl = `/uploads/chat/${file.filename}`;

    return res.status(200).json({
      url: fileUrl,
      name: file.originalname,
      size: file.size,
      type: file.mimetype,
    });
  } catch (err: any) {
    console.error('Chat file upload failed:', err);
    return res.status(500).json({ message: err.message || 'Failed to upload chat file.' });
  }
});

// POST /messages - Post a new message with access control
chatRouter.post('/messages', (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, channel, attachments } = req.body;
    const resolvedChannel = channel || (req.user!.role === 'CLIENT' || req.user!.role === 'CLIENT_ADMIN' ? `client-${req.user!.clientId}` : 'internal');

    if (!canAccessChannel(req.user!, resolvedChannel)) {
      return res.status(403).json({ message: `Forbidden: You cannot post in channel '${resolvedChannel}'.` });
    }

    const hasAttachments = attachments && (Array.isArray(attachments) ? attachments.length > 0 : !!attachments);
    const trimmedContent = (content || '').trim();

    if (!trimmedContent && !hasAttachments) {
      return res.status(400).json({ message: 'Message content or an attachment is required.' });
    }

    const serializedAttachments = attachments
      ? typeof attachments === 'string'
        ? attachments
        : JSON.stringify(attachments)
      : null;

    const message = db.createChatMessage({
      senderId: req.user!.id,
      channel: resolvedChannel,
      content: trimmedContent,
      attachments: serializedAttachments,
    });

    broadcastUpdate('chat', 'message', message);

    return res.status(201).json(message);
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to post message.' });
  }
});

// DELETE /messages/:id - Delete a message
chatRouter.delete('/messages/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    const success = db.deleteChatMessage(req.params.id, req.user!.id, isAdmin);
    if (!success) {
      return res.status(404).json({ message: 'Message not found.' });
    }
    broadcastUpdate('chat', 'delete', { id: req.params.id, channel: req.query.channel });
    return res.status(200).json({ message: 'Message deleted.' });
  } catch (err: any) {
    return res.status(403).json({ message: err.message || 'Failed to delete message.' });
  }
});
