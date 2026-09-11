import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
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

async function startServer() {
  // Initialize database
  await db.init();

  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

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
  app.get('/firebase-messaging-sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    const swPath = path.join(process.cwd(), 'public', 'firebase-messaging-sw.js');
    res.sendFile(swPath);
  });

  // Vite middleware for development / static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
