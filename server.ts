import 'dotenv/config';
import express from 'express';
import cors, { CorsOptions } from 'cors';
import path from 'path';
import fs from 'fs';
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

  // Automatically detect Railway domains
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    envOrigins.push(`https://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
    envOrigins.push(`http://${process.env.RAILWAY_PUBLIC_DOMAIN}`);
  }
  if (process.env.RAILWAY_STATIC_URL) {
    envOrigins.push(`https://${process.env.RAILWAY_STATIC_URL}`);
  }

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
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow any Railway deployment domain
      try {
        const parsed = new URL(origin);
        if (parsed.hostname.endsWith('.railway.app') || parsed.hostname.endsWith('.up.railway.app')) {
          return callback(null, true);
        }
      } catch {
        // invalid URL format, fall through
      }

      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      // If in production without restrictive ALLOWED_ORIGINS, allow web traffic
      // (Never throw new Error here because it crashes Express with a 500 HTML error page)
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
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

  // Frontend Static Files & SPA Wildcard Fallback
  const rootDir = process.cwd();
  const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();

  const isTeamPortal = process.env.PORTAL_TYPE === 'team' || process.env.PORTAL === 'team';

  const candidateDirs = [
    process.env.FRONTEND_DIST ? path.resolve(rootDir, process.env.FRONTEND_DIST) : null,
    process.env.CLIENT_DIST_DIR ? path.resolve(rootDir, process.env.CLIENT_DIST_DIR) : null,
    process.env.STATIC_DIR ? path.resolve(rootDir, process.env.STATIC_DIR) : null,
    // If PORTAL_TYPE=team, prioritize team-portal
    isTeamPortal ? path.resolve(rootDir, 'team-portal', 'dist') : null,
    isTeamPortal ? path.resolve(currentDir, '..', 'team-portal', 'dist') : null,
    isTeamPortal ? path.resolve(currentDir, 'team-portal', 'dist') : null,
    // Otherwise prioritize client-portal
    path.resolve(rootDir, 'client-portal', 'dist'),
    path.resolve(currentDir, '..', 'client-portal', 'dist'),
    path.resolve(currentDir, 'client-portal', 'dist'),
    path.resolve(rootDir, 'dist'),
    path.resolve(rootDir, 'dist', 'client'),
    path.resolve(currentDir, 'dist'),
    path.resolve(currentDir, '..', 'dist'),
    path.resolve(currentDir, '.'),
    path.resolve(rootDir, 'team-portal', 'dist'),
    path.resolve(currentDir, '..', 'team-portal', 'dist'),
  ].filter(Boolean) as string[];

  // Remove duplicates while preserving priority order
  const uniqueCandidateDirs = Array.from(new Set(candidateDirs));

  // Find the primary frontend directory that has index.html
  let primaryIndexHtml: string | null = null;
  let primaryStaticDir: string | null = null;

  for (const dir of uniqueCandidateDirs) {
    const candidateIndex = path.join(dir, 'index.html');
    if (fs.existsSync(candidateIndex)) {
      primaryIndexHtml = candidateIndex;
      primaryStaticDir = dir;
      break;
    }
  }

  // Find all existing candidate directories to serve static assets from
  const existingStaticDirs = uniqueCandidateDirs.filter((dir) => {
    try {
      return fs.existsSync(dir) && fs.statSync(dir).isDirectory();
    } catch {
      return false;
    }
  });

  const shouldServeFrontend = process.env.NODE_ENV === 'production' || !!primaryIndexHtml;

  if (shouldServeFrontend && existingStaticDirs.length > 0) {
    console.log(`[White Ink Server] Primary frontend build: ${primaryStaticDir || 'unknown'}`);
    console.log(`[White Ink Server] Static asset directories: ${existingStaticDirs.join(', ')}`);

    // 1. Explicitly serve hashed assets folder from all matching dist directories
    for (const dir of existingStaticDirs) {
      const assetsDir = path.join(dir, 'assets');
      if (fs.existsSync(assetsDir)) {
        app.use('/assets', express.static(assetsDir, {
          maxAge: '1y',
          immutable: true,
        }));
      }
    }

    // 2. Serve all static files (images, favicon, manifest, sw, etc.)
    for (const dir of existingStaticDirs) {
      app.use(express.static(dir, {
        maxAge: '1d',
        index: false,
      }));
    }

    // 3. Serve root index.html
    app.get('/', (_req, res) => {
      if (primaryIndexHtml && fs.existsSync(primaryIndexHtml)) {
        return res.sendFile(primaryIndexHtml);
      }
      res.json({
        name: 'White Ink Design Studio Portal API',
        version: '1.0.0',
        status: 'online',
        endpoints: '/api/*',
        health: '/api/health',
      });
    });

    // 4. Fallback wildcard route for React Router client-side SPA navigation
    app.get('*', (req, res, next) => {
      // Skip API routes: return JSON 404
      if (req.path.startsWith('/api/') || req.path === '/api') {
        return res.status(404).json({
          error: 'Not Found',
          message: `API endpoint ${req.method} ${req.originalUrl} does not exist on this server.`,
        });
      }

      // Skip static asset requests: NEVER return index.html for missing .js, .css, .png, etc.
      if (path.extname(req.path) || req.path.startsWith('/assets/')) {
        return res.status(404).type('text/plain').send(`Static asset not found: ${req.path}`);
      }

      // Serve index.html for client-side routing paths (e.g. /login, /dashboard, /projects)
      if (primaryIndexHtml && fs.existsSync(primaryIndexHtml)) {
        return res.sendFile(primaryIndexHtml);
      }

      next();
    });
  } else {
    // Non-production root info endpoint
    app.get('/', (_req, res) => {
      res.json({
        name: 'White Ink Design Studio Portal API',
        version: '1.0.0',
        status: 'online',
        endpoints: '/api/*',
        health: '/api/health',
      });
    });
  }

  // Global Express error handler to prevent HTML 500 responses
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
    if (res.headersSent) return;

    if (req.path.startsWith('/api') || path.extname(req.path) || req.path.startsWith('/assets/')) {
      return res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: err.message || 'An unexpected error occurred',
      });
    }

    res.status(err.status || 500).send(err.message || 'Internal Server Error');
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
