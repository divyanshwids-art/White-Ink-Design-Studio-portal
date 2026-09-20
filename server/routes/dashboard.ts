import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest, sanitizeUser } from '../auth.ts';

export const dashboardRouter = Router();

// GET /api/dashboard/stats
dashboardRouter.get('/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  db.recalculateAllProjectProgress();

  let projects = db.getProjects();
  let tasks = db.getTasks();
  let clients = db.getClients();
  let users = db.getUsers();

  // Role scoping
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    const clientRecords = clients.filter(
      (c) => (currentUser.clientId && c.id === currentUser.clientId) || c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
    );
    const clientIds = new Set(clientRecords.map((c) => c.id));
    projects = projects.filter((p) => clientIds.has(p.clientId));
    const projectIds = new Set(projects.map((p) => p.id));
    tasks = tasks.filter((t) => projectIds.has(t.projectId));
    clients = clientRecords;
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const memberProjectIds = new Set(
      db.getProjectMembersByUserId(currentUser.id).map((pm) => pm.projectId)
    );
    tasks.filter((t) => t.assignedToId === currentUser.id).forEach((t) => memberProjectIds.add(t.projectId));
    projects = projects.filter((p) => memberProjectIds.has(p.id));
    tasks = tasks.filter((t) => t.assignedToId === currentUser.id);
  }

  const teamMembers = users.filter((u) => u.role === 'TEAM_MEMBER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');

  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === 'ACTIVE').length,
    completedProjects: projects.filter((p) => p.status === 'COMPLETED').length,
    planningProjects: projects.filter((p) => p.status === 'PLANNING').length,
    onHoldProjects: projects.filter((p) => p.status === 'ON_HOLD').length,

    totalTasks: tasks.length,
    pendingTasks: tasks.filter((t) => t.status === 'TODO').length,
    inProgressTasks: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    reviewTasks: tasks.filter((t) => t.status === 'REVIEW').length,
    completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,

    totalClients: clients.length,
    totalTeamMembers: teamMembers.length,

    averageProjectProgress:
      projects.length > 0
        ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / projects.length)
        : 0,
  };

  return res.json(stats);
});

// GET /api/dashboard/recent-projects
dashboardRouter.get('/recent-projects', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  db.recalculateAllProjectProgress();

  let projects = [...db.getProjects()];

  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    const clientRecords = db.getClients().filter(
      (c) => (currentUser.clientId && c.id === currentUser.clientId) || c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
    );
    const clientIds = new Set(clientRecords.map((c) => c.id));
    projects = projects.filter((p) => clientIds.has(p.clientId));
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const memberProjectIds = new Set(
      db.getProjectMembersByUserId(currentUser.id).map((pm) => pm.projectId)
    );
    db.getTasks()
      .filter((t) => t.assignedToId === currentUser.id)
      .forEach((t) => memberProjectIds.add(t.projectId));
    projects = projects.filter((p) => memberProjectIds.has(p.id));
  }

  projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const recentProjects = projects.slice(0, 5).map((p) => {
    const client = db.getClientById(p.clientId);
    const tasks = db.getTasks().filter((t) => t.projectId === p.id);
    return {
      id: p.id,
      name: p.name,
      clientName: client ? client.company || client.name : 'Unknown Client',
      status: p.status,
      priority: p.priority,
      progress: p.progress,
      startDate: p.startDate,
      dueDate: p.dueDate,
      taskCount: tasks.length,
      completedTaskCount: tasks.filter((t) => t.status === 'COMPLETED').length,
    };
  });

  return res.json(recentProjects);
});

// GET /api/dashboard/recent-tasks
dashboardRouter.get('/recent-tasks', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  let tasks = [...db.getTasks()];

  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    const clientRecords = db.getClients().filter(
      (c) => (currentUser.clientId && c.id === currentUser.clientId) || c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
    );
    const clientIds = new Set(clientRecords.map((c) => c.id));
    const allowedProjects = new Set(db.getProjects().filter((p) => clientIds.has(p.clientId)).map((p) => p.id));
    tasks = tasks.filter((t) => allowedProjects.has(t.projectId));
  } else if (currentUser.role === 'TEAM_MEMBER') {
    tasks = tasks.filter((t) => t.assignedToId === currentUser.id);
  }

  tasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const recentTasks = tasks.slice(0, 6).map((t) => {
    const project = db.getProjectById(t.projectId);
    const assignedUser = t.assignedToId ? db.getUserById(t.assignedToId) : null;
    return {
      id: t.id,
      title: t.title,
      projectId: t.projectId,
      projectName: project ? project.name : 'Unknown Project',
      priority: t.priority,
      status: t.status,
      progress: t.progress,
      dueDate: t.dueDate,
      assignedTo: assignedUser ? sanitizeUser(assignedUser) : null,
    };
  });

  return res.json(recentTasks);
});

// POST /api/dashboard/reset-seed (SUPER_ADMIN only)
dashboardRouter.post('/reset-seed', requireAuth, requireRoles(['SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await db.resetToSeed();
    return res.json({ message: 'Database reset to initial demo state successfully.' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to reset database.' });
  }
});
