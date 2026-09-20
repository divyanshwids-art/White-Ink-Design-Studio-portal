import { Request, Response } from 'express';

interface SSEClient {
  id: string;
  res: Response;
}

const clients: Map<string, Response> = new Map();

// Send heartbeat every 15s so connection stays open
setInterval(() => {
  const timestamp = Date.now();
  for (const [id, res] of clients.entries()) {
    try {
      res.write(`event: ping\ndata: ${timestamp}\n\n`);
    } catch {
      clients.delete(id);
    }
  }
}, 15000);

export function handleSSEConnection(req: Request, res: Response) {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable proxy buffering (Nginx, Railway)
  res.flushHeaders();

  clients.set(clientId, res);

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: Date.now() })}\n\n`);

  req.on('close', () => {
    clients.delete(clientId);
  });
}

export function broadcastUpdate(entity: string, action: string, data?: any) {
  const payload = JSON.stringify({
    entity,
    action,
    data,
    timestamp: Date.now(),
  });

  for (const [id, res] of clients.entries()) {
    try {
      res.write(`event: update\ndata: ${payload}\n\n`);
    } catch {
      clients.delete(id);
    }
  }
}

