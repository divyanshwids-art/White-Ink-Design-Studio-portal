import { Router, Response } from 'express';
import { db, TaskStatus, TaskPriority } from '../db.ts';
import { requireAuth, AuthenticatedRequest, sanitizeUser } from '../auth.ts';
import multer from 'multer';
import XLSX from 'xlsx';
import { uploadFileToDrive, ensureProjectFolderStructure } from '../services/google/drive.ts';
import {
  sendTaskSubmittedForReviewEmail,
  sendRevisionRequestedEmail,
  sendApprovalDecisionEmail,
} from '../email.ts';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const isExcel =
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/octet-stream' ||
      file.originalname.toLowerCase().endsWith('.xlsx') ||
      file.originalname.toLowerCase().endsWith('.xls');
    if (isExcel) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are supported.'));
    }
  },
});

export const tasksRouter = Router();

// GET /api/tasks/import-template — Download standardized Excel template for task bulk import
tasksRouter.get('/import-template', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    return res.status(403).json({ message: 'Clients cannot access task templates.' });
  }

  const projects = db.getProjects();
  const sampleProjectName = projects[0]?.name || 'Residential Villa Interior';
  const teamMembers = db.getUsers().filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN');
  const sampleAssignee = teamMembers[0]?.email || 'team.member@whiteink.com';
  const sampleAssignee2 = teamMembers[1]?.email || sampleAssignee;

  const templateData = [
    {
      'Project Name': sampleProjectName,
      'Task Title': 'Produce 3D Living Room Concept Renders',
      'Description': 'Generate high resolution 3D architectural renders including day and night lighting scenes.',
      'Assigned To (Email or Name)': sampleAssignee,
      'Priority': 'HIGH',
      'Status': 'TODO',
      'Due Date (YYYY-MM-DD)': '2026-10-15',
    },
    {
      'Project Name': sampleProjectName,
      'Task Title': 'Material Specification & Moodboard Sign-off',
      'Description': 'Prepare comprehensive FF&E material specifications and finish samples palette for client presentation.',
      'Assigned To (Email or Name)': sampleAssignee2,
      'Priority': 'MEDIUM',
      'Status': 'IN_PROGRESS',
      'Due Date (YYYY-MM-DD)': '2026-10-22',
    },
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);

  ws['!cols'] = [
    { wch: 32 }, // Project Name
    { wch: 40 }, // Task Title
    { wch: 60 }, // Description
    { wch: 32 }, // Assigned To
    { wch: 14 }, // Priority
    { wch: 16 }, // Status
    { wch: 22 }, // Due Date
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Tasks');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="tasks_import_template.xlsx"');
  return res.send(buffer);
});

// POST /api/tasks/import — Bulk import tasks from Excel (.xlsx, .xls)
tasksRouter.post('/import', requireAuth, excelUpload.single('file'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
      return res.status(403).json({ message: 'Clients cannot import internal tasks.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a valid Excel file (.xlsx or .xls).' });
    }

    const { defaultProjectId } = req.body;

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    } catch (parseErr: any) {
      return res.status(400).json({ message: 'Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.' });
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ message: 'The Excel file contains no sheets.' });
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rawRows.length === 0) {
      return res.status(400).json({ message: 'The uploaded Excel sheet contains no data rows.' });
    }

    const allProjects = db.getProjects();
    const allUsers = db.getUsers();
    const allMembers = db.getAllProjectMembers();

    const importedTasks: any[] = [];
    const failedRows: { row: number; title: string; reason: string }[] = [];

    // Helper for checking row value across common header aliases (case-insensitive)
    const getRowValue = (row: any, ...keys: string[]): any => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
          return row[k];
        }
        const foundKey = Object.keys(row).find((rk) => rk.trim().toLowerCase() === k.toLowerCase());
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
          return row[foundKey];
        }
      }
      return '';
    };

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // Row 1 is header
      const rawTitle = getRowValue(row, 'Task Title', 'Title', 'Task Name', 'Name', 'Task');
      const title = String(rawTitle).trim();

      const rawDesc = getRowValue(row, 'Description', 'Task Description', 'Details', 'Notes');
      const description = rawDesc ? String(rawDesc).trim() : null;

      const rawProject = getRowValue(row, 'Project Name', 'Project', 'Project ID', 'ProjectName') || defaultProjectId;
      const projectIdentifier = rawProject ? String(rawProject).trim() : '';

      const rawAssignee = getRowValue(
        row,
        'Assigned To (Email or Name)',
        'Assigned To',
        'Assignee',
        'Assigned User',
        'Assigned Email',
        'Member',
        'AssignedTo'
      );
      const assigneeIdentifier = rawAssignee ? String(rawAssignee).trim() : '';

      const rawPriority = getRowValue(row, 'Priority', 'Task Priority');
      const priorityStr = rawPriority ? String(rawPriority).trim().toUpperCase() : 'MEDIUM';

      const rawStatus = getRowValue(row, 'Status', 'Task Status');
      const statusStr = rawStatus ? String(rawStatus).trim().toUpperCase() : 'TODO';

      const rawDueDate = getRowValue(row, 'Due Date (YYYY-MM-DD)', 'Due Date', 'DueDate', 'Deadline', 'Target Date');

      // Validation 1: Title
      if (!title) {
        failedRows.push({
          row: rowNum,
          title: `Row ${rowNum}`,
          reason: 'Task title is required.',
        });
        return;
      }

      // Validation 1b: Description (Mandatory)
      if (!description || !description.trim()) {
        failedRows.push({
          row: rowNum,
          title,
          reason: 'Task description is mandatory.',
        });
        return;
      }

      // Validation 2: Project
      if (!projectIdentifier) {
        failedRows.push({
          row: rowNum,
          title,
          reason: 'Project is required. Please specify a Project column or select a default project.',
        });
        return;
      }

      const matchedProject = allProjects.find(
        (p) => p.id === projectIdentifier || p.name.toLowerCase() === projectIdentifier.toLowerCase()
      );

      if (!matchedProject) {
        failedRows.push({
          row: rowNum,
          title,
          reason: `Project "${projectIdentifier}" not found.`,
        });
        return;
      }

      // Check Team Member permission for project
      if (currentUser.role === 'TEAM_MEMBER') {
        const isProjectMember = allMembers.some((pm) => pm.projectId === matchedProject.id && pm.userId === currentUser.id);
        if (!isProjectMember && matchedProject.createdById !== currentUser.id) {
          failedRows.push({
            row: rowNum,
            title,
            reason: `Forbidden: You are not assigned to project "${matchedProject.name}".`,
          });
          return;
        }
      }

      // Validation 3: Assigned User
      let assignedToId: string | null = null;
      if (assigneeIdentifier && !['unassigned', 'none', 'n/a', '-', 'null'].includes(assigneeIdentifier.toLowerCase())) {
        const matchedUser = allUsers.find(
          (u) =>
            u.id === assigneeIdentifier ||
            u.email.toLowerCase() === assigneeIdentifier.toLowerCase() ||
            u.name.toLowerCase() === assigneeIdentifier.toLowerCase()
        );

        if (!matchedUser) {
          failedRows.push({
            row: rowNum,
            title,
            reason: `Assigned user "${assigneeIdentifier}" not found.`,
          });
          return;
        }

        if (matchedUser.role === 'CLIENT' || matchedUser.role === 'CLIENT_ADMIN') {
          failedRows.push({
            row: rowNum,
            title,
            reason: `Cannot assign task to client user "${matchedUser.name}".`,
          });
          return;
        }

        assignedToId = matchedUser.id;
      }

      // Validation 4: Priority
      let priority: TaskPriority = 'MEDIUM';
      const validPriorities: Record<string, TaskPriority> = {
        LOW: 'LOW',
        MEDIUM: 'MEDIUM',
        HIGH: 'HIGH',
        URGENT: 'URGENT',
      };
      if (priorityStr) {
        if (validPriorities[priorityStr]) {
          priority = validPriorities[priorityStr];
        } else {
          failedRows.push({
            row: rowNum,
            title,
            reason: `Invalid priority "${rawPriority}". Must be Low, Medium, High, or Urgent.`,
          });
          return;
        }
      }

      // Validation 5: Status
      let status: TaskStatus = 'TODO';
      const statusMap: Record<string, TaskStatus> = {
        TODO: 'TODO',
        'TO DO': 'TODO',
        PENDING: 'TODO',
        IN_PROGRESS: 'IN_PROGRESS',
        'IN PROGRESS': 'IN_PROGRESS',
        DOING: 'IN_PROGRESS',
        ACTIVE: 'IN_PROGRESS',
        REVIEW: 'REVIEW',
        'IN REVIEW': 'REVIEW',
        COMPLETED: 'COMPLETED',
        DONE: 'COMPLETED',
        COMPLETE: 'COMPLETED',
        REVISION_REQUESTED: 'REVISION_REQUESTED',
        'REVISION REQUESTED': 'REVISION_REQUESTED',
        REVISION: 'REVISION_REQUESTED',
      };

      if (statusStr) {
        if (statusMap[statusStr]) {
          status = statusMap[statusStr];
        } else {
          failedRows.push({
            row: rowNum,
            title,
            reason: `Invalid status "${rawStatus}". Must be To Do, In Progress, Review, Completed, or Revision Requested.`,
          });
          return;
        }
      }

      // Validation 6: Due Date
      let dueDateIso: string | null = null;
      if (rawDueDate) {
        if (rawDueDate instanceof Date) {
          if (!isNaN(rawDueDate.getTime())) {
            dueDateIso = rawDueDate.toISOString();
          } else {
            failedRows.push({
              row: rowNum,
              title,
              reason: `Invalid due date format "${rawDueDate}".`,
            });
            return;
          }
        } else {
          const parsed = new Date(String(rawDueDate).trim());
          if (!isNaN(parsed.getTime())) {
            dueDateIso = parsed.toISOString();
          } else {
            failedRows.push({
              row: rowNum,
              title,
              reason: `Invalid due date format "${rawDueDate}". Expected YYYY-MM-DD or standard date.`,
            });
            return;
          }
        }
      }

      // Create the valid task using db.createTask
      try {
        const newTask = db.createTask({
          id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${index}`,
          title,
          description,
          projectId: matchedProject.id,
          assignedToId,
          createdById: currentUser.id,
          status,
          priority,
          progress: status === 'COMPLETED' ? 100 : status === 'REVIEW' ? 75 : status === 'IN_PROGRESS' ? 25 : 0,
          dueDate: dueDateIso,
        });

        const assignedUser = newTask.assignedToId ? db.getUserById(newTask.assignedToId) : null;
        importedTasks.push({
          ...newTask,
          project: { id: matchedProject.id, name: matchedProject.name },
          assignedTo: assignedUser ? sanitizeUser(assignedUser) : null,
        });
      } catch (createErr: any) {
        failedRows.push({
          row: rowNum,
          title,
          reason: `Failed to save task: ${createErr?.message || 'Database error'}`,
        });
      }
    });

    if (importedTasks.length > 0) {
      db.logActivity({
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: currentUser.id,
        action: 'TASKS_BULK_IMPORTED',
        entityType: 'TASK',
        details: `Imported ${importedTasks.length} tasks from Excel (${failedRows.length} failed rows)`,
      });
    }

    return res.status(200).json({
      total: rawRows.length,
      imported: importedTasks.length,
      failed: failedRows.length,
      failedRows,
      importedTasks,
    });
  } catch (error: any) {
    console.error('Error importing tasks from Excel:', error);
    return res.status(500).json({ message: 'Failed to process Excel import: ' + (error?.message || 'Server error') });
  }
});

// GET /api/tasks
tasksRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { search, status, priority, projectId, assignedToId } = req.query;

  // Trigger overdue checks for non-completed tasks
  db.checkAndNotifyOverdueTasks();

  let allTasks = db.getTasks();

  // Role scoping
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    const clientProjects = db.getProjects().filter((p) => {
      const client = db.getClientById(p.clientId);
      return (client && ((currentUser.clientId && client.id === currentUser.clientId) || client.email.toLowerCase() === currentUser.email.toLowerCase() || p.clientId === currentUser.id));
    });
    const allowedProjectIds = new Set(clientProjects.map((p) => p.id));
    allTasks = allTasks.filter((t) => allowedProjectIds.has(t.projectId));
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const assignedProjectIds = new Set(
      db.getProjectMembersByUserId(currentUser.id).map((pm) => pm.projectId)
    );
    allTasks = allTasks.filter(
      (t) => t.assignedToId === currentUser.id || assignedProjectIds.has(t.projectId)
    );
  }

  // Filters
  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    allTasks = allTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  if (status && typeof status === 'string' && status !== 'ALL') {
    allTasks = allTasks.filter((t) => t.status === status);
  }

  if (priority && typeof priority === 'string' && priority !== 'ALL') {
    allTasks = allTasks.filter((t) => t.priority === priority);
  }

  if (projectId && typeof projectId === 'string') {
    allTasks = allTasks.filter((t) => t.projectId === projectId);
  }

  if (assignedToId && typeof assignedToId === 'string') {
    if (assignedToId === 'unassigned') {
      allTasks = allTasks.filter((t) => !t.assignedToId);
    } else {
      allTasks = allTasks.filter((t) => t.assignedToId === assignedToId);
    }
  }

  // Enrich tasks with project and user objects
  const enriched = allTasks.map((t) => {
    const project = db.getProjectById(t.projectId);
    const assignedTo = t.assignedToId ? db.getUserById(t.assignedToId) : null;
    const createdBy = db.getUserById(t.createdById);
    const commentsCount = db.getComments().filter((c) => c.taskId === t.id).length;

    return {
      ...t,
      revisionRequest: t.revisionRequest ? JSON.parse(t.revisionRequest) : null,
      project: project ? { id: project.id, name: project.name, status: project.status } : null,
      assignedTo: assignedTo ? sanitizeUser(assignedTo) : null,
      createdBy: createdBy ? sanitizeUser(createdBy) : null,
      commentsCount,
    };
  });

  return res.json(enriched);
});

// GET /api/tasks/:id
tasksRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  const task = db.getTaskById(id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const project = db.getProjectById(task.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Associated project not found.' });
  }

  // Role scoping
  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    const client = db.getClientById(project.clientId);
    const isOwner =
      client &&
      ((currentUser.clientId && client.id === currentUser.clientId) ||
        client.email.toLowerCase() === currentUser.email.toLowerCase() ||
        client.id === currentUser.id);
    if (!isOwner) {
      return res.status(403).json({ message: 'Forbidden: You cannot access this task.' });
    }
  } else if (currentUser.role === 'TEAM_MEMBER') {
    const isAssigned = task.assignedToId === currentUser.id;
    const isProjectMember = db.getProjectMembers(task.projectId).some((pm) => pm.userId === currentUser.id);
    if (!isAssigned && !isProjectMember && project.createdById !== currentUser.id) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this task.' });
    }
  }

  const assignedTo = task.assignedToId ? db.getUserById(task.assignedToId) : null;
  const createdBy = db.getUserById(task.createdById);
  const rawComments = db.getComments().filter((c) => c.taskId === task.id);
  const comments = rawComments.map((c) => {
    const commentUser = db.getUserById(c.userId);
    return {
      ...c,
      user: commentUser ? sanitizeUser(commentUser) : undefined,
    };
  });

  return res.json({
    ...task,
    revisionRequest: task.revisionRequest ? JSON.parse(task.revisionRequest) : null,
    project,
    assignedTo: assignedTo ? sanitizeUser(assignedTo) : null,
    createdBy: createdBy ? sanitizeUser(createdBy) : null,
    comments,
  });
});

// POST /api/tasks
tasksRouter.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { title, description, projectId, assignedToId, status, priority, progress, dueDate } = req.body;

    if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
      return res.status(403).json({ message: 'Clients cannot create internal tasks.' });
    }

    if (!title || !title.trim() || !description || !description.trim() || !projectId) {
      return res.status(400).json({ message: 'Task title, description, and Project are required.' });
    }

    const project = db.getProjectById(projectId);
    if (!project) {
      return res.status(400).json({ message: 'Referenced project does not exist.' });
    }

    if (currentUser.role === 'TEAM_MEMBER') {
      const isProjectMember = db.getProjectMembers(projectId).some((pm) => pm.userId === currentUser.id);
      if (!isProjectMember && project.createdById !== currentUser.id) {
        return res.status(403).json({ message: 'Forbidden: You can only create tasks in projects you are assigned to.' });
      }
    }

    const newTask = db.createTask({
      id: `tsk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      projectId,
      assignedToId: assignedToId || null,
      createdById: currentUser.id,
      status: (status as TaskStatus) || 'TODO',
      priority: (priority as TaskPriority) || 'MEDIUM',
      progress: typeof progress === 'number' ? progress : 0,
      dueDate: dueDate || null,
    });

    const assigned = newTask.assignedToId ? db.getUserById(newTask.assignedToId) : null;

    return res.status(201).json({
      ...newTask,
      project: { id: project.id, name: project.name },
      assignedTo: assigned ? sanitizeUser(assigned) : null,
    });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return res.status(500).json({ message: 'Failed to create task.' });
  }
});

// PATCH /api/tasks/:id
tasksRouter.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { title, description, projectId, assignedToId, status, priority, progress, dueDate } = req.body;

    const existing = db.getTaskById(id);
    if (!existing) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Role checks
    if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
      return res.status(403).json({ message: 'Clients cannot modify task configuration.' });
    }

    // Team members can update status/progress or description on their assigned tasks
    if (currentUser.role === 'TEAM_MEMBER') {
      const isAssigned = existing.assignedToId === currentUser.id;
      const isProjectMember = db.getProjectMembers(existing.projectId).some((pm) => pm.userId === currentUser.id);
      if (!isAssigned && !isProjectMember && existing.createdById !== currentUser.id) {
        return res.status(403).json({ message: 'You can only update tasks in projects you are assigned to.' });
      }
      if (status === 'COMPLETED') {
        return res.status(400).json({ message: 'Complete the work at 100%, then submit it for client approval.' });
      }
      if (status === 'REVIEW') {
        return res.status(400).json({ message: 'Use Submit for Client Approval after reaching 100% progress.' });
      }
    }

    const updates: any = {};
    if (title) updates.title = title.trim();
    if (description !== undefined) {
      if (!description || !description.trim()) {
        return res.status(400).json({ message: 'Task description cannot be empty.' });
      }
      updates.description = description.trim();
    }
    if (projectId) updates.projectId = projectId;
    if (assignedToId !== undefined) updates.assignedToId = assignedToId || null;
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (typeof progress === 'number') updates.progress = progress;
    if (dueDate !== undefined) updates.dueDate = dueDate;

    const updated = db.updateTask(id, updates);
    if (!updated) {
      return res.status(500).json({ message: 'Failed to update task.' });
    }

    const project = db.getProjectById(updated.projectId);
    const assignedTo = updated.assignedToId ? db.getUserById(updated.assignedToId) : null;
    const createdBy = db.getUserById(updated.createdById);

    return res.json({
      ...updated,
      revisionRequest: updated.revisionRequest ? JSON.parse(updated.revisionRequest) : null,
      project: project ? { id: project.id, name: project.name } : null,
      assignedTo: assignedTo ? sanitizeUser(assignedTo) : null,
      createdBy: createdBy ? sanitizeUser(createdBy) : null,
    });
  } catch (error: any) {
    console.error('Error updating task:', error);
    return res.status(500).json({ message: 'Failed to update task.' });
  }
});

// PATCH /api/tasks/:id/overdue-reason
tasksRouter.patch('/:id/overdue-reason', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUser = req.user!;
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Delay explanation reason is required.' });
    }

    const updated = db.setTaskOverdueReason(id, currentUser.id, reason.trim());
    if (!updated) {
      return res.status(403).json({ message: 'Forbidden: Only the assigned member or creator can submit delay reasons.' });
    }

    const project = db.getProjectById(updated.projectId);
    const assignedTo = updated.assignedToId ? db.getUserById(updated.assignedToId) : null;

    return res.json({
      message: 'Delay reason submitted successfully.',
      task: {
        ...updated,
        project: project ? { id: project.id, name: project.name } : null,
        assignedTo: assignedTo ? sanitizeUser(assignedTo) : null,
      },
    });
  } catch (error: any) {
    console.error('Error saving delay reason:', error);
    return res.status(500).json({ message: 'Failed to submit delay explanation.' });
  }
});

// PATCH /api/tasks/:id/revision (CLIENT role only — submit revision request)
tasksRouter.patch('/:id/revision', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;
  const { feedback, priority, targetDate, files } = req.body;

  if (currentUser.role !== 'CLIENT' && currentUser.role !== 'CLIENT_ADMIN') {
    return res.status(403).json({ message: 'Only clients can submit revision requests.' });
  }

  if (!feedback || !feedback.trim()) {
    return res.status(400).json({ message: 'Feedback is required.' });
  }

  const task = db.getTaskById(id);
  if (!task) return res.status(404).json({ message: 'Task not found.' });

  const project = db.getProjectById(task.projectId);
  if (!project) return res.status(404).json({ message: 'Project not found.' });

  const client = db.getClientById(project.clientId);
  const isClientOwner = Boolean(
    client &&
    ((currentUser.clientId && client.id === currentUser.clientId) ||
      client.email.toLowerCase() === currentUser.email.toLowerCase() ||
      client.id === currentUser.id ||
      project.createdById === currentUser.id)
  );
  if (!isClientOwner) {
    return res.status(403).json({ message: 'Forbidden: You cannot request revisions for this task.' });
  }

  const revisionRequest = {
    feedback: feedback.trim(),
    priority: (priority as 'LOW' | 'MEDIUM' | 'HIGH') || 'MEDIUM',
    targetDate: targetDate || null,
    files: Array.isArray(files) ? files : [],
    submittedAt: new Date().toISOString(),
  };

  const updated = db.updateTask(id, {
    status: 'REVISION_REQUESTED',
    revisionRequest: JSON.stringify(revisionRequest),
    clientApprovalStatus: 'REJECTED',
    clientReviewComments: feedback.trim(),
    reviewedById: currentUser.id,
    reviewedAt: new Date().toISOString(),
  });

  db.logActivity({
    userId: currentUser.id,
    action: 'REVISION_REQUESTED',
    entityType: 'TASK',
    entityId: id,
    details: `Client requested revision on task "${task.title}": ${feedback.trim().slice(0, 100)}`,
  });

  // Notify assigned team member
  if (task.assignedToId) {
    db.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: task.assignedToId,
      title: 'Revision Requested',
      message: `Client requested changes on "${task.title}" [${revisionRequest.priority} priority]: ${feedback.trim().slice(0, 120)}`,
      type: 'TASK_STATUS',
      linkUrl: `/projects/${task.projectId}`,
      isRead: false,
    });
  }

  // Also notify project creator/admin if different from assignee
  if (task.createdById && task.createdById !== task.assignedToId) {
    db.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: task.createdById,
      title: 'Revision Requested',
      message: `Client requested changes on task "${task.title}" in project "${project.name}"`,
      type: 'TASK_STATUS',
      linkUrl: `/projects/${task.projectId}`,
      isRead: false,
    });
  }

  // Dispatch transactional email to assigned employee
  const assignedUser = task.assignedToId ? db.getUserById(task.assignedToId) : null;
  if (assignedUser?.email) {
    sendRevisionRequestedEmail({
      toEmail: assignedUser.email,
      teamMemberName: assignedUser.name,
      taskTitle: task.title,
      projectName: project.name,
      clientName: currentUser.name,
      feedback: feedback.trim(),
      priority: revisionRequest.priority,
      targetDate: revisionRequest.targetDate,
    }).catch((emailErr) => console.warn('[EMAIL] Revision request email dispatch failed:', emailErr?.message));
  }

  return res.json({ ...updated, revisionRequest });
});

// PATCH /api/tasks/:id/approve (CLIENT role only)
tasksRouter.patch('/:id/approve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  if (currentUser.role !== 'CLIENT' && currentUser.role !== 'CLIENT_ADMIN') {
    return res.status(403).json({ message: 'Only clients can approve tasks.' });
  }

  const task = db.getTaskById(id);
  if (!task) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  // Verify the task belongs to a project owned by this client
  const project = db.getProjectById(task.projectId);
  if (!project) {
    return res.status(404).json({ message: 'Associated project not found.' });
  }
  const client = db.getClientById(project.clientId);
  const isClientOwner = Boolean(
    client &&
    ((currentUser.clientId && client.id === currentUser.clientId) ||
      client.email.toLowerCase() === currentUser.email.toLowerCase() ||
      client.id === currentUser.id ||
      project.createdById === currentUser.id)
  );
  if (!isClientOwner) {
    return res.status(403).json({ message: 'Forbidden: This task does not belong to your project.' });
  }

  if (task.status !== 'REVIEW') {
    return res.status(400).json({ message: 'Task must be submitted for review before it can be approved.' });
  }

  if (
    task.progress !== 100 ||
    !task.submittedAt ||
    !task.submissionDescription?.trim() ||
    !task.proofDetails?.trim() ||
    task.clientApprovalStatus !== 'PENDING'
  ) {
    return res.status(400).json({
      message: 'Only submitted tasks at 100% completion with submission description and proof details can be approved.',
    });
  }

  const updated = db.updateTask(id, {
    status: 'COMPLETED',
    clientApprovalStatus: 'APPROVED',
    reviewedById: currentUser.id,
    reviewedAt: new Date().toISOString(),
  });

  // Log activity
  db.logActivity({
    userId: currentUser.id,
    action: 'TASK_APPROVED',
    entityType: 'TASK',
    entityId: id,
    details: `Client approved task "${task.title}"`,
  });

  // Notify assigned team member
  if (task.assignedToId) {
    db.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: task.assignedToId,
      title: 'Task Approved by Client',
      message: `The client has approved your task: "${task.title}"`,
      type: 'TASK_STATUS',
      linkUrl: `/projects/${task.projectId}`,
      isRead: false,
    });

    const assignedUser = db.getUserById(task.assignedToId);
    if (assignedUser?.email) {
      sendApprovalDecisionEmail({
        toEmail: assignedUser.email,
        recipientName: assignedUser.name,
        itemTitle: task.title,
        projectName: project.name,
        decision: 'APPROVED',
        clientName: currentUser.name,
      }).catch((emailErr) => console.warn('[EMAIL] Task approval email dispatch failed:', emailErr?.message));
    }
  }

  const projectTasks = db.getTasks().filter((projectTask) => projectTask.projectId === task.projectId);
  const projectReadyForHandover = projectTasks.length > 0 && projectTasks.every((projectTask) =>
    projectTask.progress === 100 &&
    Boolean(projectTask.submittedAt) &&
    projectTask.clientApprovalStatus === 'APPROVED' &&
    projectTask.status === 'COMPLETED'
  );
  if (projectReadyForHandover && project) {
    db.getUsers()
      .filter((recipient) => ['ADMIN', 'SUPER_ADMIN'].includes(recipient.role) || recipient.id === project.createdById)
      .forEach((recipient) => {
        db.createNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: recipient.id,
          title: 'Project Ready for Handover',
          message: `All tasks for "${project.name}" have been approved by the client.`,
          type: 'APPROVAL_RESOLVED',
          linkUrl: `/projects/${project.id}`,
          isRead: false,
        });
      });
  }

  return res.json(updated);
});

// PATCH /api/tasks/:id/status (Kanban & quick status toggle)
tasksRouter.patch('/:id/status', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;
  const { status } = req.body;

  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    return res.status(403).json({ message: 'Clients cannot change task status.' });
  }

  if (!status || !['TODO', 'IN_PROGRESS', 'REVIEW', 'REVISION_REQUESTED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status value.' });
  }

  const existing = db.getTaskById(id);
  if (!existing) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  if (currentUser.role === 'TEAM_MEMBER') {
    const isAssigned = existing.assignedToId === currentUser.id;
    if (!isAssigned) return res.status(403).json({ message: 'You can only update tasks assigned to you.' });
    if (status === 'COMPLETED') {
      return res.status(400).json({ message: 'Complete the work at 100%, then submit it for client approval.' });
    }
    if (status === 'REVIEW') {
      return res.status(400).json({ message: 'Use Submit for Client Approval after reaching 100% progress.' });
    }
  }

  const updated = db.updateTask(id, { status: status as TaskStatus });
  return res.json(updated);
});

// PATCH /api/tasks/:id/progress
tasksRouter.patch('/:id/progress', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;
  const { progress } = req.body;

  if (currentUser.role === 'CLIENT' || currentUser.role === 'CLIENT_ADMIN') {
    return res.status(403).json({ message: 'Clients cannot modify task progress directly.' });
  }

  if (typeof progress !== 'number' || progress < 0 || progress > 100) {
    return res.status(400).json({ message: 'Progress must be a number between 0 and 100.' });
  }

  const existing = db.getTaskById(id);
  if (!existing) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  if (currentUser.role === 'TEAM_MEMBER' && existing.assignedToId !== currentUser.id) {
    return res.status(403).json({ message: 'You can only update tasks assigned to you.' });
  }

  const updated = db.updateTask(id, { progress: Math.round(progress) });
  return res.json(updated);
});

// POST /api/tasks/:id/submit — assigned team member submits completed work for client review (supports optional file upload to Google Drive)
tasksRouter.post('/:id/submit', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;
  const { submissionDescription, proofDetails, deliverableUrl } = req.body;

  if (currentUser.role !== 'TEAM_MEMBER') {
    return res.status(403).json({ message: 'Only the assigned team member can submit this task.' });
  }
  if (!submissionDescription?.trim() || !proofDetails?.trim()) {
    return res.status(400).json({ message: 'Completion description and proof details are required.' });
  }

  const task = db.getTaskById(id);
  if (!task) return res.status(404).json({ message: 'Task not found.' });
  if (task.assignedToId !== currentUser.id) return res.status(403).json({ message: 'You can only submit tasks assigned to you.' });
  if (task.status === 'REVIEW' && task.clientApprovalStatus === 'PENDING') {
    return res.status(400).json({ message: 'This task is already awaiting client approval.' });
  }
  if (task.clientApprovalStatus === 'APPROVED') {
    return res.status(400).json({ message: 'This task has already been approved.' });
  }

  const project = db.getProjectById(task.projectId);
  const isRevisionSubmission = task.status === 'REVISION_REQUESTED' || Boolean(task.revisionRequest);

  // Handle uploaded file if present
  let driveFileId: string | null = null;
  let driveFileName: string | null = null;
  let driveFileSize: number | null = null;
  let driveFileMimeType: string | null = null;
  let fileDeliverableUrl: string | null = null;

  if (req.file) {
    driveFileName = req.file.originalname;
    driveFileSize = req.file.size;
    driveFileMimeType = req.file.mimetype;

    try {
      if (project) {
        const hierarchy = await ensureProjectFolderStructure({
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          driveFolderId: project.driveFolderId,
        });
        const targetFolderId = isRevisionSubmission
          ? (hierarchy.structure?.subfolders.revisions || hierarchy.structure?.projectFolderId)
          : (hierarchy.structure?.subfolders.proofs || hierarchy.structure?.projectFolderId);

        if (targetFolderId) {
          const uploadResult = await uploadFileToDrive({
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            buffer: req.file.buffer,
            folderId: targetFolderId,
          });
          if (uploadResult.success && uploadResult.fileId) {
            driveFileId = uploadResult.fileId;
            fileDeliverableUrl = `/api/google/files/${uploadResult.fileId}/view`;
          }
        }
      }
    } catch (driveErr: any) {
      console.warn('[DRIVE] Task file upload to Google Drive skipped/failed:', driveErr?.message);
    }
  }

  const submittedAt = new Date().toISOString();
  const updated = db.updateTask(id, {
    status: 'REVIEW',
    progress: 100,
    clientApprovalStatus: 'PENDING',
    submissionDescription: submissionDescription.trim(),
    proofDetails: proofDetails.trim(),
    deliverableUrl: deliverableUrl?.trim() || fileDeliverableUrl || null,
    driveFileId: driveFileId || undefined,
    driveFileName: driveFileName || undefined,
    driveFileSize: driveFileSize || undefined,
    driveFileMimeType: driveFileMimeType || undefined,
    submittedById: currentUser.id,
    submittedAt,
    clientReviewComments: null,
    reviewedById: null,
    reviewedAt: null,
    revisionRequest: null,
  });

  // Log activity to maintain complete history
  db.logActivity({
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: currentUser.id,
    action: isRevisionSubmission ? 'TASK_REVISION_SUBMITTED' : 'TASK_SUBMITTED',
    entityType: 'TASK',
    entityId: id,
    details: isRevisionSubmission
      ? `Submitted revised work for task "${task.title}"`
      : `Submitted task proof for "${task.title}"`,
  });

  if (project) {
    const client = db.getClientById(project.clientId);
    const clientUser = client ? db.getUsers().find((u) => u.clientId === client.id || u.email.toLowerCase() === client.email.toLowerCase()) : null;
    if (clientUser) {
      db.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: clientUser.id,
        title: isRevisionSubmission ? 'Task Revision Submitted for Approval' : 'Task Submitted for Approval',
        message: `Task "${task.title}" has been submitted for review.`,
        type: 'APPROVAL_REQUESTED',
        linkUrl: `/projects/${task.projectId}`,
        isRead: false,
      });

      sendTaskSubmittedForReviewEmail({
        toEmail: clientUser.email,
        clientName: clientUser.name,
        taskTitle: task.title,
        projectName: project.name,
        submissionDescription: submissionDescription.trim(),
        deliverableUrl: deliverableUrl?.trim() || fileDeliverableUrl || null,
      }).catch((emailErr) => console.warn('[EMAIL] Task submission review email dispatch failed:', emailErr?.message));
    }
  }

  return res.json(updated);
});

// DELETE /api/tasks/:id (SUPER_ADMIN and ADMIN)
tasksRouter.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const currentUser = req.user!;
  const { id } = req.params;

  if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Only Admins and Super Admins can delete tasks.' });
  }

  const existing = db.getTaskById(id);
  if (!existing) {
    return res.status(404).json({ message: 'Task not found.' });
  }

  const success = db.deleteTask(id);
  if (!success) {
    return res.status(500).json({ message: 'Failed to delete task.' });
  }

  return res.json({ message: 'Task deleted successfully.', deletedId: id });
});

// POST /api/tasks/:id/time-log - Log time spent on task
tasksRouter.post('/:id/time-log', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { durationMinutes, notes, date } = req.body;
    const currentUser = req.user!;

    if (!durationMinutes || isNaN(Number(durationMinutes))) {
      return res.status(400).json({ message: 'durationMinutes is required and must be a number.' });
    }

    const task = db.getTaskById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const log = db.logTaskTime({
      taskId: id,
      userId: currentUser.id,
      durationMinutes: Number(durationMinutes),
      notes: notes || undefined,
      date: date || undefined,
    });

    return res.status(201).json({ message: 'Time logged successfully.', log });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to log task time.' });
  }
});

// GET /api/tasks/:id/time-logs - Get time logs for a specific task
tasksRouter.get('/:id/time-logs', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const logs = db.getTaskTimeLogs({ taskId: id });
    return res.json(logs);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to get task time logs.' });
  }
});

