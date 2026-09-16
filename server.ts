import 'dotenv/config';
import express from 'express';
import cors, { CorsOptions } from 'cors';
import path from 'path';
import { db } from './server/db.ts';
import { authRouter } from './server/routes/auth.ts';
import { usersRouter } from './server/routes/users.ts';
import { clientsRouter } from './server/routes/clients.ts';
import { projectsRouter } from './server/routes/projects.ts';
import { tasksRouter } from './server/routes/tasks.ts';
import { commentsRouter } from './server/routes/comments.ts';
import { dashboardRouter } from './server/routes/dashboard.ts';
import { attendanceRouter } from './server/routes/attendance.ts';
import { milestonesRouter } from './server/routes/milestones.ts';
import { approvalsRouter } from './server/routes/approvals.ts';
import { notificationsRouter } from './server/routes/notifications.ts';
import { reportsRouter } from './server/routes/reports.ts';
import { leavesRouter } from './server/routes/leaves.ts';
import { sopsRouter } from './server/routes/sops.ts';
import { reviewsRouter } from './server/routes/reviews.ts';
import { activitiesRouter } from './server/routes/activities.ts';
import { chatRouter } from './server/routes/chat.ts';
import { settingsRouter } from './server/routes/settings.ts';
import { pushRouter } from './server/routes/push.ts';
import { accessRequestsRouter } from './server/routes/access-requests.ts';
import { credentialsRouter } from './server/routes/credentials.ts';
import { googleRouter } from './server/routes/google.ts';
import { meetingsRouter } from './server/routes/meetings.ts';
import { todosRouter } from './server/routes/todos.ts';

// Helper to collect all allowed frontend origins from environment or default dev ports
function getAllowedOrigins(): string[] {
  const envOrigins: string[] = [];

  const rawFrontendUrl = process.env.FRONTEND_URL;
  const rawClientUrl = process.env.CLIENT_PORTAL_URL;
  const rawTeamUrl = process.env.TEAM_PORTAL_URL;
  const rawAllowedOrigins = process.env.ALLOWED_ORIGINS;

  [rawFrontendUrl, rawClientUrl, rawTeamUrl, rawAllowedOrigins].forEach((entry) => {
    if (entry) {
      entry
        .split(',')
        .map((s) => s.trim().replace(/\/$/, ''))
        .filter(Boolean)
        .forEach((origin) => {
          if (!envOrigins.includes(origin)) envOrigins.push(origin);
        });
    }
  });

  // Local development default origins
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
  ];

  devOrigins.forEach((origin) => {
    if (!envOrigins.includes(origin)) envOrigins.push(origin);
  });

  return envOrigins;
}

async function startServer() {
  // Initialize database
  await db.init();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const allowedOrigins = getAllowedOrigins();

  // Multi-origin CORS configuration
  const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // In non-production, allow localhost and 127.0.0.1 on any port
      if (process.env.NODE_ENV !== 'production') {
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }

      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      console.warn(`[CORS] Blocked request from unauthorized origin: ${origin}`);
      return callback(new Error(`CORS policy does not allow access from origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '20mb' }));

  // API Health Check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'White Ink Central Backend API',
      timestamp: new Date().toISOString(),
      port: PORT,
    });
  });

  // Root route info for API server
  app.get('/', (_req, res) => {
    res.json({
      name: 'White Ink Design Studio Portal API',
      version: '1.0.0',
      status: 'online',
      endpoints: '/api/*',
      health: '/api/health',
    });
  });

  // Central API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/access-requests', accessRequestsRouter);
  app.use('/api/credentials', credentialsRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/clients', clientsRouter);
  app.use('/api/projects', projectsRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/todos', todosRouter);
  app.use('/api', commentsRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/attendance', attendanceRouter);
  app.use('/api/milestones', milestonesRouter);
  app.use('/api/approvals', approvalsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/leaves', leavesRouter);
  app.use('/api/sops', sopsRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/push', pushRouter);
  app.use('/api/google', googleRouter);
  app.use('/api', meetingsRouter);

  // Serve Firebase messaging service worker with root service-worker scope
  app.get('/firebase-messaging-sw.js', (_req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    const swPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
    res.sendFile(swPath);
  });

  // Global 404 handler for API routes
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `API endpoint ${req.method} ${req.originalUrl} does not exist on this server.`,
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[White Ink Backend API] Server running on http://0.0.0.0:${PORT}`);
    console.log(`[White Ink Backend API] Configured CORS allowed origins: ${allowedOrigins.join(', ')}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
