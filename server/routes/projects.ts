import { Router, Response } from 'express';
import PDFDocument from 'pdfkit';
import multer from 'multer';
import { db, ProjectStatus, ProjectPriority } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest, sanitizeUser } from '../auth.ts';
import { ensureProjectFolderStructure, uploadFileToDrive, deleteDriveFile } from '../services/google/drive.ts';
import { createGoogleMeeting } from '../services/google/calendar.ts';
import { sendClientProjectConfirmationEmail, sendProjectStatusChangedEmail } from '../email.ts';
import { broadcastUpdate } from '../events.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export const projectsRouter = Router();

// GET /api/projects
projectsRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { search, status, priority, clientId } = req.query;

  let allProjects = db.getProjects();
  db.recalculateAllProjectProgress();

  // Role Scoping
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    const matchingClients = db.getClients().filter(
      (c) => (currentUser.clientId && c.id === currentUser.clientId) || c.email.toLowerCase() === currentUser.email.toLowerCase() || c.id === currentUser.id
    );
    const clientIds = new Set(matchingClients.map((c) => c.id));
    allProjects = allProjects.filter(
      (p) => clientIds.has(p.clientId) || p.createdById === currentUser.id
    );
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const memberProjectIds = new Set(
      db.getProjectMembersByUserId(currentUser.id).map((pm) => pm.projectId)
    );
    // Also include projects where user is assigned to tasks
    db.getTasks()
      .filter((t) => t.assignedToId === currentUser.id)
      .forEach((t) => memberProjectIds.add(t.projectId));

    allProjects = allProjects.filter((p) => memberProjectIds.has(p.id));
  }

  // Filtering
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    allProjects = allProjects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    allProjects = allProjects.filter((p) => p.status === status);
  }

  if (priority && typeof priority === 'string' && priority !== 'ALL') {
    allProjects = allProjects.filter((p) => p.priority === priority);
  }

  if (clientId && typeof clientId === 'string') {
    allProjects = allProjects.filter((p) => p.clientId === clientId);
  }

  // Enrich with client info, task counts, and member counts
  const enriched = allProjects.map((proj) => {
    const client = db.getClientById(proj.clientId);
    const creator = db.getUserById(proj.createdById);
    const members = db.getProjectMembers(proj.id).map((pm) => {
      const u = db.getUserById(pm.userId);
      return u ? sanitizeUser(u) : null;
    }).filter(Boolean);
    const tasks = db.getTasks().filter((t) => t.projectId === proj.id);
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const handoverEligible = tasks.length > 0 && tasks.every((t) =>
      t.progress === 100 && Boolean(t.submittedAt) && t.clientApprovalStatus === 'APPROVED' && t.status === 'COMPLETED'
    );

    return {
      ...proj,
      client: client || null,
      createdBy: creator ? sanitizeUser(creator) : null,
      members,
      taskCount: tasks.length,
      completedTaskCount: completedTasks,
      handoverEligible,
    };
  });

  return res.json(enriched);
});

// GET /api/projects/:id
projectsRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  db.recalculateProjectProgress(id);
  const project = db.getProjectById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const client = db.getClientById(project.clientId);

  // Scoping check for Client & Team Member
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    const isCreator = project.createdById === currentUser.id;
    const clientMatch = client && ((currentUser.clientId && client.id === currentUser.clientId) || client.email.toLowerCase() === currentUser.email.toLowerCase() || client.id === currentUser.id);
    if (!isCreator && !clientMatch) {
      return res.status(403).json({ message: 'Forbidden: Access to this project is restricted.' });
    }
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const isMember = db.getProjectMembers(id).some((pm) => pm.userId === currentUser.id);
    const hasAssignedTask = db.getTasks().some((t) => t.projectId === id && t.assignedToId === currentUser.id);
    if (!isMember && !hasAssignedTask && project.createdById !== currentUser.id) {
      return res.status(403).json({ message: 'Forbidden: You are not assigned to this project.' });
    }
  }

  const creator = db.getUserById(project.createdById);
  const members = db.getProjectMembers(id).map((pm) => {
    const u = db.getUserById(pm.userId);
    return u ? { ...sanitizeUser(u), memberRecordId: pm.id } : null;
  }).filter(Boolean);

  const tasks = db.getTasks()
    .filter((t) => t.projectId === id)
    .map((t) => {
      const assigned = t.assignedToId ? db.getUserById(t.assignedToId) : null;
      return {
        ...t,
        assignedTo: assigned ? sanitizeUser(assigned) : null,
      };
    });

  const comments = db.getComments()
    .filter((c) => c.projectId === id && !c.taskId)
    .map((c) => {
      const author = db.getUserById(c.userId);
      return {
        ...c,
        user: author ? sanitizeUser(author) : { name: 'Unknown User' },
      };
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const milestones = db.getMilestonesByProjectId(id).sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const approvals = db.getApprovalsByProjectId(id).map((appr) => {
    const requester = db.getUserById(appr.requestedById);
    const reviewer = appr.reviewedById ? db.getUserById(appr.reviewedById) : null;
    return {
      ...appr,
      requestedBy: requester ? sanitizeUser(requester) : null,
      reviewedBy: reviewer ? sanitizeUser(reviewer) : null,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'PENDING').length;
  const handoverEligibility = {
    eligible: tasks.length > 0 && tasks.every((task) =>
      task.progress === 100 &&
      Boolean(task.submittedAt) &&
      task.clientApprovalStatus === 'APPROVED' &&
      task.status === 'COMPLETED'
    ),
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.progress === 100).length,
    submittedTasks: tasks.filter((task) => Boolean(task.submittedAt)).length,
    approvedTasks: tasks.filter((task) => task.clientApprovalStatus === 'APPROVED').length,
    pendingTasks: tasks.filter((task) => task.clientApprovalStatus === 'PENDING').length,
    revisionRequestedTasks: tasks.filter((task) => task.status === 'REVISION_REQUESTED').length,
  };

  let handoverDocsList = [];
  if (project.handoverDocs) {
    try {
      handoverDocsList = JSON.parse(project.handoverDocs);
    } catch (e) {
      handoverDocsList = [];
    }
  }

  return res.json({
    ...project,
    client: client || null,
    createdBy: creator ? sanitizeUser(creator) : null,
    members,
    tasks,
    milestones,
    approvals,
    pendingApprovalsCount,
    handoverEligibility,
    handoverDocsList,
    comments,
    stats: {
      totalTasks: tasks.length,
      todoTasks: tasks.filter((t) => t.status === 'TODO').length,
      inProgressTasks: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      reviewTasks: tasks.filter((t) => t.status === 'REVIEW').length,
      completedTasks: tasks.filter((t) => t.status === 'COMPLETED').length,
    }
  });
});

// POST /api/projects/client-request (CLIENT or CLIENT_ADMIN)
projectsRouter.post('/client-request', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;

  if (currentUser.role !== 'CLIENT' && currentUser.role !== 'CLIENT_ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Only clients can submit project requests.' });
  }

  try {
    const { name, description, startDate, dueDate, estimatedBudget, leadOwnerId, preferredMeetingTime } = req.body;

    if (!name?.trim() || !description?.trim() || !startDate || !dueDate || !preferredMeetingTime) {
      return res.status(400).json({ message: 'Project name, description, start date, due date, and preferred meeting time are required.' });
    }

    // Resolve or create Client record for this client user
    let clientRecord = currentUser.clientId ? db.getClientById(currentUser.clientId) : null;
    if (!clientRecord) {
      clientRecord = db.getClients().find((c) => c.email.toLowerCase() === currentUser.email.toLowerCase()) || null;
      if (!clientRecord) {
        clientRecord = db.createClient({
          id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: currentUser.name,
          company: `${currentUser.name}'s Organization`,
          email: currentUser.email.toLowerCase(),
        });
      }
    }

    const resolvedClientId = clientRecord.id;

    const leadOwner = leadOwnerId ? db.getUserById(leadOwnerId) : null;
    if (leadOwnerId && !leadOwner) {
      return res.status(400).json({ message: 'Selected lead owner not found.' });
    }

    // Create client-initiated Project with status PLANNING (awaiting internal setup)
    const newProject = db.createProject({
      name: name.trim(),
      description: description ? description.trim() : null,
      clientId: resolvedClientId,
      createdById: currentUser.id,
      startDate: startDate || null,
      dueDate: dueDate || null,
      status: 'PLANNING',
      priority: 'MEDIUM',
      estimatedBudget: estimatedBudget ? Number(estimatedBudget) : null,
      leadOwnerId,
      preferredMeetingTime,
    });

    if (leadOwnerId) db.addProjectMember(newProject.id, leadOwnerId);

    // Automation: Google Drive folder structure (async non-blocking)
    ensureProjectFolderStructure({
      id: newProject.id,
      name: newProject.name,
      clientId: newProject.clientId,
    }).catch((err) => console.warn('[DRIVE] Client project folder setup skipped/failed:', err?.message));

    // Automation: Google Calendar & dynamic Google Meet generation
    let dynamicMeetLink: string | null = null;
    try {
      const startTime = new Date(preferredMeetingTime).toISOString();
      const endTime = new Date(new Date(preferredMeetingTime).getTime() + 60 * 60 * 1000).toISOString();
      const meetingRes = await createGoogleMeeting({
        projectId: newProject.id,
        title: `Kick-off: ${newProject.name}`,
        description: `Project kick-off meeting for ${newProject.name} with ${currentUser.name} (${clientRecord?.company || 'Client'})`,
        startTime,
        endTime,
        attendeeEmails: [currentUser.email, leadOwner?.email].filter(Boolean),
      });
      dynamicMeetLink = meetingRes.meetLink || null;
    } catch (meetErr: any) {
      console.warn('[CALENDAR] Dynamic Google Meet creation unavailable, using fallback:', meetErr?.message);
    }

    const meetingLink = dynamicMeetLink || db.getMeetingLink();
    const meetingTime = new Date(preferredMeetingTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const clientCompany = clientRecord?.company || 'your organization';

    // Automation: Transactional confirmation email via Gmail (or console/log fallback)
    sendClientProjectConfirmationEmail({
      toEmail: currentUser.email,
      clientName: currentUser.name,
      projectName: newProject.name,
      projectDescription: newProject.description,
      preferredMeetingTime,
      meetingLink: meetingLink || '',
      leadOwnerName: leadOwner?.name || 'Our Team',
      companyName: clientCompany,
    }).catch((emailErr) => console.warn('[EMAIL] Automated confirmation email error:', emailErr?.message));

    // Notify client (confirmation in-app notification)
    db.createNotification({
      id: `notif_${Date.now()}_cr1`,
      userId: currentUser.id,
      title: 'Project Request Received',
      message: `Your project "${newProject.name}" has been created and our team will reach out soon.${meetingLink ? ` Meeting scheduled for ${meetingTime}. Join: ${meetingLink}` : ` Preferred meeting time: ${meetingTime}.`}`,
      type: 'PROJECT_ASSIGNED',
      linkUrl: `/projects/${newProject.id}`,
      isRead: false,
    });

    // Notify assigned Lead Owner (only if one was provided)
    if (leadOwner) {
      db.createNotification({
        id: `notif_${Date.now()}_cr2`,
        userId: leadOwnerId,
        title: 'New Client Project Request',
        message: `${currentUser.name} (${clientCompany}) submitted a new project request: "${newProject.name}". Preferred meeting: ${meetingTime}.`,
        type: 'PROJECT_ASSIGNED',
        linkUrl: `/projects/${newProject.id}`,
        isRead: false,
      });
    }

    // Notify internal team Admins
    const admins = db.getUsers().filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN');
    for (const admin of admins) {
      if (admin.id === leadOwnerId) continue;
      db.createNotification({
        id: `notif_${Date.now()}_cr3_${admin.id}`,
        userId: admin.id,
        title: 'New Client Project Request',
        message: `${currentUser.name} (${clientCompany}) submitted a new project request: "${newProject.name}".${leadOwner ? ` Lead: ${leadOwner.name}.` : ' Awaiting lead assignment.'}`,
        type: 'GENERAL',
        linkUrl: `/projects/${newProject.id}`,
        isRead: false,
      });
    }

    broadcastUpdate('projects', 'create', newProject);

    return res.status(201).json({
      project: newProject,
      meetingLink: meetingLink || null,
      meetingTime,
      message: 'Your project has been created and our team will reach out soon.',
    });
  } catch (error: any) {
    console.error('Error creating client project request:', error);
    return res.status(500).json({ message: 'Failed to submit project request.' });
  }
});

// POST /api/projects (SUPER_ADMIN, ADMIN)
projectsRouter.post('/', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { name, description, clientId, startDate, dueDate, status, priority, handoverNote, driveUrl, memberIds } = req.body;

    if (!name || !clientId) {
      return res.status(400).json({ message: 'Project name and client are required.' });
    }

    const client = db.getClientById(clientId);
    if (!client) {
      return res.status(400).json({ message: 'Client does not exist.' });
    }

    const newProject = db.createProject({
      name: name.trim(),
      description: description ? description.trim() : null,
      clientId,
      createdById: currentUser.id,
      startDate: startDate || null,
      dueDate: dueDate || null,
      status: status || 'PLANNING',
      priority: priority || 'MEDIUM',
      handoverNote: handoverNote ? handoverNote.trim() : null,
      driveUrl: driveUrl ? driveUrl.trim() : null,
    });

    if (Array.isArray(memberIds)) {
      memberIds.forEach((uid) => {
        if (typeof uid === 'string') {
          db.addProjectMember(newProject.id, uid);
        }
      });
    }

    // Automation: Google Drive folder structure (async non-blocking)
    ensureProjectFolderStructure({
      id: newProject.id,
      name: newProject.name,
      clientId: newProject.clientId,
    }).catch((err) => console.warn('[DRIVE] Admin project folder setup skipped/failed:', err?.message));

    broadcastUpdate('projects', 'create', newProject);

    return res.status(201).json(newProject);
  } catch (error: any) {
    console.error('Error creating project:', error);
    return res.status(500).json({ message: 'Failed to create project.' });
  }
});

// PATCH /api/projects/:id (SUPER_ADMIN, ADMIN, or assigned TEAM_MEMBER for handoverNote & driveUrl)
projectsRouter.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { name, description, clientId, startDate, dueDate, status, priority, handoverNote, driveUrl } = req.body;

    const existing = db.getProjectById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
    const isMember = db.getProjectMembers(id).some((pm) => pm.userId === currentUser.id);

    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to update this project.' });
    }

    const updates: any = {};
    if (handoverNote !== undefined) updates.handoverNote = handoverNote ? handoverNote.trim() : null;
    if (driveUrl !== undefined) updates.driveUrl = driveUrl ? driveUrl.trim() : null;

    if (isAdmin) {
      if (name) updates.name = name.trim();
      if (description !== undefined) updates.description = description ? description.trim() : null;
      if (clientId) {
        const client = db.getClientById(clientId);
        if (!client) return res.status(400).json({ message: 'Client does not exist.' });
        updates.clientId = clientId;
      }
      if (startDate !== undefined) updates.startDate = startDate;
      if (dueDate !== undefined) updates.dueDate = dueDate;
      if (status) updates.status = status;
      if (priority) updates.priority = priority;
    }

    const updated = db.updateProject(id, updates);

    // If project status changed, dispatch transactional email to client
    if (status && status !== existing.status) {
      const client = db.getClientById(updated.clientId);
      if (client?.email) {
        sendProjectStatusChangedEmail({
          toEmail: client.email,
          recipientName: client.name || 'Valued Client',
          projectName: updated.name,
          oldStatus: existing.status,
          newStatus: status,
          projectId: updated.id,
          note: handoverNote || description || undefined,
        }).catch((err) => console.warn('[EMAIL] Project status change email failed:', err?.message));
      }
    }

    broadcastUpdate('projects', 'update', updated);

    return res.json(updated);
  } catch (error: any) {
    console.error('Error updating project:', error);
    return res.status(500).json({ message: 'Failed to update project.' });
  }
});

// DELETE /api/projects/:id (SUPER_ADMIN, ADMIN)
projectsRouter.delete('/:id', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.getProjectById(id);
  if (!existing) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const success = db.deleteProject(id);
  if (!success) {
    return res.status(500).json({ message: 'Failed to delete project.' });
  }

  broadcastUpdate('projects', 'delete', { id });

  return res.json({ message: 'Project and associated tasks/comments deleted successfully.', deletedId: id });
});

// POST /api/projects/:id/members (SUPER_ADMIN, ADMIN)
projectsRouter.post('/:id/members', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'User ID is required.' });
  }

  const project = db.getProjectById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const newMember = db.addProjectMember(id, userId);
  if (!newMember) {
    return res.status(409).json({ message: 'User is already a member of this project.' });
  }

  return res.status(201).json({
    ...newMember,
    user: sanitizeUser(user),
  });
});

// DELETE /api/projects/:id/members/:userId (SUPER_ADMIN, ADMIN)
projectsRouter.delete('/:id/members/:userId', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id, userId } = req.params;

  const project = db.getProjectById(id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const success = db.removeProjectMember(id, userId);
  if (!success) {
    return res.status(404).json({ message: 'Member assignment not found for this project.' });
  }

  return res.json({ message: 'Member removed from project successfully.' });
});

// POST /api/projects/:id/handover-docs (SUPER_ADMIN, ADMIN, or assigned TEAM_MEMBER)
projectsRouter.post('/:id/handover-docs', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { name, size, type, dataUrl, note } = req.body;

    const docName = req.file?.originalname || (typeof name === 'string' ? name.trim() : '');
    if (!docName) {
      return res.status(400).json({ message: 'Document name is required.' });
    }

    const project = db.getProjectById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    if (project.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Project must be marked complete before uploading handover documents.' });
    }

    const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
    const isMember = db.getProjectMembers(id).some((pm) => pm.userId === currentUser.id);

    let isAuthorized = false;
    if (isAdmin) {
      isAuthorized = true;
    } else if (currentUser.role === 'TEAM_MEMBER') {
      isAuthorized = isMember || project.createdById === currentUser.id;
    } else if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
      const client = db.getClientById(project.clientId);
      isAuthorized = Boolean(
        (currentUser.clientId && client && client.id === currentUser.clientId) ||
        (client && client.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        project.clientId === currentUser.id ||
        project.createdById === currentUser.id
      );
    }

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Forbidden: You cannot upload handover documents for this project.' });
    }

    let finalDataUrl: string | null = dataUrl || null;
    let fileBuffer: Buffer | null = req.file?.buffer || null;
    let mimeType = req.file?.mimetype || type || 'application/octet-stream';

    // If dataUrl is provided as base64, parse buffer for Drive upload
    if (!fileBuffer && typeof dataUrl === 'string' && dataUrl.startsWith('data:')) {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        fileBuffer = Buffer.from(match[2], 'base64');
      }
    }

    // Upload to Google Drive Handover subfolder if buffer is present
    if (fileBuffer) {
      try {
        const hierarchy = await ensureProjectFolderStructure({
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          driveFolderId: project.driveFolderId,
        });
        const targetFolderId = hierarchy.structure?.subfolders.handover || hierarchy.structure?.projectFolderId;
        if (targetFolderId) {
          const uploadResult = await uploadFileToDrive({
            filename: docName,
            mimeType,
            buffer: fileBuffer,
            folderId: targetFolderId,
          });
          if (uploadResult.success && uploadResult.fileId) {
            finalDataUrl = `/api/google/files/${uploadResult.fileId}/view`;
          }
        }
      } catch (driveErr: any) {
        console.warn('[DRIVE] Handover file upload to Google Drive skipped/failed:', driveErr?.message);
      }
    }

    const newDoc = db.addHandoverDoc(id, {
      name: docName,
      size: size || (req.file ? `${(req.file.size / (1024 * 1024)).toFixed(1)} MB` : '1.0 MB'),
      type: mimeType,
      dataUrl: finalDataUrl,
      uploadedById: currentUser.id,
      uploadedByName: currentUser.name,
      note: note ? note.trim() : null,
    });

    // Create activity log
    db.logActivity({
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: currentUser.id,
      action: 'HANDOVER_DOC_UPLOADED',
      entityType: 'PROJECT',
      entityId: id,
      details: JSON.stringify({ documentName: docName, projectId: id }),
    });

    // Notify client and admins
    const client = db.getClientById(project.clientId);
    const clientUser = client ? db.getUsers().find((u) => u.email.toLowerCase() === client.email.toLowerCase() || u.id === client.id) : null;
    if (clientUser && clientUser.id !== currentUser.id) {
      db.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: clientUser.id,
        title: 'New Handover Document Available',
        message: `${currentUser.name} uploaded handover documentation for "${project.name}": ${docName}`,
        type: 'PROJECT_ASSIGNED',
        linkUrl: `/projects/${id}`,
        isRead: false,
      });
    }

    // Refresh updated project
    const updatedProject = db.getProjectById(id);
    let docs = [];
    if (updatedProject?.handoverDocs) {
      try {
        docs = JSON.parse(updatedProject.handoverDocs);
      } catch (e) {
        docs = [];
      }
    }

    return res.status(201).json({
      message: 'Handover document added successfully.',
      doc: newDoc,
      handoverDocs: docs,
    });
  } catch (error: any) {
    console.error('Error uploading handover document:', error);
    return res.status(500).json({ message: 'Failed to upload handover document.' });
  }
});

// PATCH /api/projects/:id/complete (SUPER_ADMIN, ADMIN)
projectsRouter.patch('/:id/complete', requireAuth, requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const project = db.getProjectById(id);

  if (!project) {
    return res.status(404).json({ message: 'Project not found.' });
  }

  const projectTasks = db.getTasks().filter((task) => task.projectId === id);
  if (projectTasks.length === 0 || !projectTasks.every((task) => task.status === 'COMPLETED')) {
    return res.status(400).json({ message: 'All tasks must be completed before the project can be marked complete.' });
  }

  const approvals = db.getApprovalsByProjectId(id);
  if (approvals.some((approval) => approval.status !== 'APPROVED')) {
    return res.status(400).json({ message: 'All client approvals must be approved before the project can be marked complete.' });
  }

  const updated = db.updateProject(id, {
    status: 'COMPLETED',
    handoverCompletedAt: new Date().toISOString(),
  });

  return res.json(updated);
});

// DELETE /api/projects/:id/handover-docs/:docId (SUPER_ADMIN, ADMIN, or assigned TEAM_MEMBER)
projectsRouter.delete('/:id/handover-docs/:docId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id, docId } = req.params;

    const project = db.getProjectById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const isAdmin = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'ADMIN';
    const isMember = db.getProjectMembers(id).some((pm) => pm.userId === currentUser.id);

    if (!isAdmin && !isMember) {
      return res.status(403).json({ message: 'Forbidden: You cannot delete handover documents.' });
    }

    // Check if doc exists and has a Drive fileId to delete
    if (project.handoverDocs) {
      try {
        const parsedDocs = JSON.parse(project.handoverDocs);
        const targetDoc = parsedDocs.find((d: any) => d.id === docId);
        if (targetDoc?.dataUrl && targetDoc.dataUrl.includes('/api/google/files/')) {
          const match = targetDoc.dataUrl.match(/\/api\/google\/files\/([a-zA-Z0-9_-]+)\/view/);
          if (match && match[1]) {
            await deleteDriveFile(match[1]).catch(() => {});
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    const success = db.deleteHandoverDoc(id, docId);
    if (!success) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const updatedProject = db.getProjectById(id);
    let docs = [];
    if (updatedProject?.handoverDocs) {
      try {
        docs = JSON.parse(updatedProject.handoverDocs);
      } catch (e) {
        docs = [];
      }
    }

    return res.json({
      message: 'Handover document removed successfully.',
      handoverDocs: docs,
    });
  } catch (error: any) {
    console.error('Error deleting handover document:', error);
    return res.status(500).json({ message: 'Failed to delete handover document.' });
  }
});

// GET /api/projects/:id/audit-report
projectsRouter.get('/:id/audit-report', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const format = (req.query.format as string) || 'pdf';

    db.recalculateProjectProgress(id);
    const project = db.getProjectById(id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const client = db.getClientById(project.clientId);
    const creator = db.getUserById(project.createdById);
    const leadOwner = project.leadOwnerId ? db.getUserById(project.leadOwnerId) : null;
    const tasks = db.getTasks().filter((t) => t.projectId === id);
    const milestones = db.getMilestonesByProjectId(id);
    const approvals = db.getApprovalsByProjectId(id);

    let handoverDocsList: any[] = [];
    if (project.handoverDocs) {
      try {
        handoverDocsList = JSON.parse(project.handoverDocs);
      } catch (e) {
        handoverDocsList = [];
      }
    }

    // Access check
    if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
      const isCreator = project.createdById === currentUser.id;
      const clientMatch = client && ((currentUser.clientId && client.id === currentUser.clientId) || client.email.toLowerCase() === currentUser.email.toLowerCase() || client.id === currentUser.id);
      if (!isCreator && !clientMatch) {
        return res.status(403).json({ message: 'Forbidden: Access to this project is restricted.' });
      }
    } else if (currentUser.role === 'TEAM_MEMBER') {
      const isMember = db.getProjectMembers(id).some((pm) => pm.userId === currentUser.id);
      const hasAssignedTask = db.getTasks().some((t) => t.projectId === id && t.assignedToId === currentUser.id);
      if (!isMember && !hasAssignedTask && project.createdById !== currentUser.id) {
        return res.status(403).json({ message: 'Forbidden: You are not assigned to this project.' });
      }
    }

    const completedTasksCount = tasks.filter((t) => t.status === 'COMPLETED').length;
    const sanitizedTitle = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filename = `audit-report-${sanitizedTitle}-${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      const lines: string[] = [];
      lines.push('WHITE INK DESIGN STUDIO - PROJECT AUDIT & FINAL HANDOVER REPORT');
      lines.push(`Generated Date,${escapeCsv(new Date().toISOString())}`);
      lines.push(`Generated By,${escapeCsv(currentUser.name)} (${escapeCsv(currentUser.role)})`);
      lines.push('');

      lines.push('=== PROJECT OVERVIEW ===');
      lines.push(`Project Name,${escapeCsv(project.name)}`);
      lines.push(`Client,${escapeCsv(client?.company || client?.name || 'N/A')}`);
      lines.push(`Lead Owner,${escapeCsv(leadOwner?.name || creator?.name || 'White Ink Studio')}`);
      lines.push(`Status,${project.status}`);
      lines.push(`Overall Progress,${project.progress}%`);
      lines.push(`Mandatory Tasks Finished,${completedTasksCount} of ${tasks.length}`);
      lines.push(`Handover Completed Date,${escapeCsv(project.handoverCompletedAt || 'Completed')}`);
      lines.push(`Direct Deliverables Link,${escapeCsv(project.driveUrl || 'None configured')}`);
      lines.push(`Handover Note,${escapeCsv(project.handoverNote || 'All tasks and final deliverables successfully signed off.')}`);
      lines.push('');

      lines.push('=== MANDATORY TASKS AUDIT ===');
      lines.push('Task Title,Status,Priority,Progress,Assignee,Due Date');
      for (const t of tasks) {
        const assigned = t.assignedToId ? db.getUserById(t.assignedToId) : null;
        lines.push([
          escapeCsv(t.title),
          t.status,
          t.priority,
          `${t.progress}%`,
          escapeCsv(assigned?.name || 'Unassigned'),
          escapeCsv(t.dueDate || 'N/A'),
        ].join(','));
      }
      lines.push('');

      lines.push('=== CLIENT APPROVALS AUDIT ===');
      lines.push('Approval Title,Status,Deliverable URL,Requested Date,Reviewed Date');
      for (const a of approvals) {
        lines.push([
          escapeCsv(a.title),
          a.status,
          escapeCsv(a.deliverableUrl || 'N/A'),
          escapeCsv(a.createdAt),
          escapeCsv(a.reviewedAt || 'Pending'),
        ].join(','));
      }
      lines.push('');

      lines.push('=== HANDOVER DOCUMENTS INVENTORY ===');
      lines.push('Document Name,Size,Uploaded By,Uploaded Date,Note');
      for (const d of handoverDocsList) {
        lines.push([
          escapeCsv(d.name),
          escapeCsv(d.size),
          escapeCsv(d.uploadedByName || 'Team'),
          escapeCsv(d.uploadedAt),
          escapeCsv(d.note || ''),
        ].join(','));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.status(200).send(lines.join('\r\n'));
    }

    // PDF Generation
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

    const doc = new PDFDocument({
      size: 'A4',
      margin: 40,
      info: {
        Title: `${project.name} - Handover & Audit Report`,
        Author: 'White Ink Design Studio',
      },
    });

    doc.pipe(res);

    // Header bar
    doc.rect(40, 40, 515, 60).fill('#8C6D23');
    doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold').text('WHITE INK DESIGN STUDIO', 55, 52);
    doc.fontSize(10).font('Helvetica').text('Official Project Audit & Final Handover Report', 55, 72);
    doc.fontSize(8.5).fillColor('#F5EDD6').text(`Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 400, 72);

    let y = 120;

    // Project Details Box
    doc.rect(40, y, 515, 110).fill('#FBF8EF').stroke('#E8DEC8');
    doc.fillColor('#241E15').fontSize(14).font('Helvetica-Bold').text(project.name, 55, y + 15);
    
    // Status Badge
    doc.rect(440, y + 14, 100, 20).fill('#8C6D23');
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold').text('PROJECT CLOSURE', 445, y + 19, { width: 90, align: 'center' });

    doc.fillColor('#666158').fontSize(9).font('Helvetica').text('Client Organization:', 55, y + 42);
    doc.fillColor('#1E1B18').font('Helvetica-Bold').text(client?.company || client?.name || 'Confidential Client', 160, y + 42);

    doc.fillColor('#666158').font('Helvetica').text('Project Lead / Creator:', 55, y + 58);
    doc.fillColor('#1E1B18').font('Helvetica-Bold').text(leadOwner?.name || creator?.name || 'White Ink Studio', 160, y + 58);

    doc.fillColor('#666158').font('Helvetica').text('Completion Progress:', 55, y + 74);
    doc.fillColor('#8C6D23').font('Helvetica-Bold').text(`100% (${completedTasksCount} of ${tasks.length} mandatory tasks finished)`, 160, y + 74);

    if (project.driveUrl) {
      doc.fillColor('#666158').font('Helvetica').text('Deliverables Folder Link:', 55, y + 90);
      doc.fillColor('#2563EB').font('Helvetica').text(project.driveUrl, 160, y + 90, { width: 380, ellipsis: true });
    }

    y += 125;

    // Handover Summary Section
    doc.fillColor('#8C6D23').fontSize(11).font('Helvetica-Bold').text('HANDOVER STATEMENT & SUMMARY', 40, y);
    y += 16;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#E8DEC8').stroke();
    y += 8;

    const handoverSummary = project.handoverNote || 'All project tasks, design deliverables, and final package requirements have been verified, approved, and handed over according to agreed design specifications and standards.';
    doc.fillColor('#332F28').fontSize(9.5).font('Helvetica').text(handoverSummary, 40, y, { width: 515, lineGap: 3 });
    y += doc.heightOfString(handoverSummary, { width: 515, lineGap: 3 }) + 16;

    // Requirements & Tasks Table
    if (y > 650) {
      doc.addPage();
      y = 40;
    }

    doc.fillColor('#8C6D23').fontSize(11).font('Helvetica-Bold').text(`MANDATORY TASKS & DELIVERABLES AUDIT (${completedTasksCount}/${tasks.length} COMPLETE)`, 40, y);
    y += 16;
    doc.moveTo(40, y).lineTo(555, y).strokeColor('#E8DEC8').stroke();
    y += 8;

    // Table Header
    doc.rect(40, y, 515, 18).fill('#F2ECE0');
    doc.fillColor('#554C3D').fontSize(8.5).font('Helvetica-Bold');
    doc.text('TASK / DELIVERABLE', 48, y + 4);
    doc.text('ASSIGNEE', 280, y + 4);
    doc.text('PRIORITY', 380, y + 4);
    doc.text('STATUS', 470, y + 4);
    y += 22;

    for (const task of tasks) {
      if (y > 750) {
        doc.addPage();
        y = 40;
      }
      const assigned = task.assignedToId ? db.getUserById(task.assignedToId) : null;
      doc.fillColor('#1E1B18').fontSize(8.5).font('Helvetica').text(task.title, 48, y, { width: 220, ellipsis: true });
      doc.fillColor('#666158').text(assigned?.name || 'Team', 280, y, { width: 90, ellipsis: true });
      doc.fillColor('#666158').text(task.priority, 380, y);
      doc.fillColor('#059669').font('Helvetica-Bold').text(`[✓] ${task.status}`, 470, y);
      y += 16;
    }

    y += 10;

    // Approvals section
    if (approvals.length > 0) {
      if (y > 670) {
        doc.addPage();
        y = 40;
      }
      doc.fillColor('#8C6D23').fontSize(11).font('Helvetica-Bold').text('CLIENT SIGN-OFFS & APPROVALS', 40, y);
      y += 16;
      doc.moveTo(40, y).lineTo(555, y).strokeColor('#E8DEC8').stroke();
      y += 8;

      for (const appr of approvals) {
        if (y > 750) {
          doc.addPage();
          y = 40;
        }
        doc.fillColor('#1E1B18').fontSize(8.5).font('Helvetica-Bold').text(appr.title, 48, y);
        doc.fillColor(appr.status === 'APPROVED' ? '#059669' : '#D97706').text(`Status: ${appr.status}`, 350, y);
        doc.fillColor('#666158').font('Helvetica').text(appr.reviewedAt ? `Reviewed ${new Date(appr.reviewedAt).toLocaleDateString()}` : 'Recorded', 460, y);
        y += 15;
      }
      y += 10;
    }

    // Handover Documentation Inventory
    if (handoverDocsList.length > 0) {
      if (y > 670) {
        doc.addPage();
        y = 40;
      }
      doc.fillColor('#8C6D23').fontSize(11).font('Helvetica-Bold').text('SUBMITTED HANDOVER DOCUMENTATION', 40, y);
      y += 16;
      doc.moveTo(40, y).lineTo(555, y).strokeColor('#E8DEC8').stroke();
      y += 8;

      for (const docItem of handoverDocsList) {
        if (y > 750) {
          doc.addPage();
          y = 40;
        }
        doc.fillColor('#1E1B18').fontSize(8.5).font('Helvetica-Bold').text(docItem.name, 48, y, { width: 280, ellipsis: true });
        doc.fillColor('#666158').font('Helvetica').text(`${docItem.size} | By ${docItem.uploadedByName || 'Team'} on ${new Date(docItem.uploadedAt).toLocaleDateString()}`, 340, y);
        y += 15;
      }
      y += 10;
    }

    // Studio Sign-off Footer
    if (y > 720) {
      doc.addPage();
      y = 40;
    }
    y += 15;
    doc.rect(40, y, 515, 45).fill('#FBF8EF').stroke('#8C6D23');
    doc.fillColor('#8C6D23').fontSize(9).font('Helvetica-Bold').text('PROJECT AUDIT VERIFICATION CERTIFIED BY WHITE INK DESIGN STUDIO', 55, y + 12);
    doc.fillColor('#666158').fontSize(8).font('Helvetica').text('All requirements and deliverable packages have been transferred and finalized for client deployment.', 55, y + 26);

    doc.end();
  } catch (error: any) {
    console.error('Error generating project audit report:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Failed to generate audit report', error: error.message });
    }
  }
});

