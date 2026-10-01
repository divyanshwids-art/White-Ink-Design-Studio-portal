import { Router, Response } from 'express';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../auth.ts';
import {
  getGoogleAuthUrl,
  handleOAuthCallback,
  disconnectGoogle,
  getSafeGoogleStatus,
} from '../services/google/auth.ts';
import { getDriveFileStream, getDriveFileMetadata, ensureRootPortalFolder } from '../services/google/drive.ts';
import { syncAllAttendancesToSheets } from '../services/google/sheets.ts';
import { sanitizeErrorMessage } from '../services/google/crypto.ts';
import { db } from '../db.ts';

export const googleRouter = Router();

/**
 * GET /api/google/status — Safe status of the singleton Google integration
 * Accessible only by Super Admin.
 */
googleRouter.get('/status', requireAuth, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = getSafeGoogleStatus();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(err) || 'Failed to fetch Google status' });
  }
});

/**
 * GET /api/google/connect — Generate Google OAuth consent URL
 * Accessible only by Super Admin.
 */
googleRouter.get('/connect', requireAuth, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const authUrl = getGoogleAuthUrl(req.user!.id);
    return res.json({ authUrl, url: authUrl });
  } catch (err: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(err) || 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/google/callback — OAuth 2.0 callback endpoint invoked by Google.
 * Validates security state, exchanges authorization code, saves encrypted refresh token, and redirects back to Settings.
 */
googleRouter.get('/callback', async (req: AuthenticatedRequest, res: Response) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const state = req.query.state as string;

  if (error) {
    console.error('Google OAuth denied or failed:', error);
    return res.redirect(`/settings?google_error=${encodeURIComponent(sanitizeErrorMessage(error))}`);
  }

  if (!code || !state) {
    return res.redirect(
      `/settings?google_error=${encodeURIComponent('Missing OAuth authorization code or security state parameter.')}`
    );
  }

  const result = await handleOAuthCallback(code, state);
  if (!result.success) {
    return res.redirect(`/settings?google_error=${encodeURIComponent(sanitizeErrorMessage(result.error || 'Failed to complete Google link'))}`);
  }

  return res.redirect('/settings?google=connected');
});

/**
 * POST /api/google/disconnect — Disconnects the Super Admin Google account.
 * Accessible only by Super Admin.
 */
googleRouter.post('/disconnect', requireAuth, requireRoles(['SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await disconnectGoogle();
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(err) || 'Failed to disconnect Google account' });
  }
});

/**
 * PUT /api/google/settings — Update integration configuration (spreadsheet ID, calendar ID, etc.)
 * Accessible only by Super Admin.
 */
googleRouter.put('/settings', requireAuth, requireRoles(['SUPER_ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sheetsAttendanceSpreadsheetId, sheetsAttendanceSheetName, calendarId, driveRootFolderId } = req.body;

    db.updateGoogleIntegration({
      ...(sheetsAttendanceSpreadsheetId !== undefined && { sheetsAttendanceSpreadsheetId: sheetsAttendanceSpreadsheetId?.trim() || null }),
      ...(sheetsAttendanceSheetName !== undefined && { sheetsAttendanceSheetName: sheetsAttendanceSheetName?.trim() || 'Attendance_Log' }),
      ...(calendarId !== undefined && { calendarId: calendarId?.trim() || 'primary' }),
      ...(driveRootFolderId !== undefined && { driveRootFolderId: driveRootFolderId?.trim() || null }),
    });

    return res.json({ message: 'Google settings updated.', settings: getSafeGoogleStatus() });
  } catch (err: any) {
    return res.status(400).json({ message: sanitizeErrorMessage(err) || 'Failed to update Google settings' });
  }
});

/**
 * POST /api/google/recreate-folder — Recreates or repairs the Google Drive root folder if deleted in Drive.
 * Accessible only by Super Admin.
 */
googleRouter.post('/recreate-folder', requireAuth, requireRoles(['SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Clear out stale folder ID so ensureRootPortalFolder creates a fresh one
    db.updateGoogleIntegration({ driveRootFolderId: null });
    const result = await ensureRootPortalFolder();
    if (!result.success) {
      return res.status(500).json({ message: result.error || 'Failed to create root folder in Google Drive' });
    }
    return res.json({
      success: true,
      driveRootFolderId: result.rootFolderId,
      driveUrl: `https://drive.google.com/drive/folders/${result.rootFolderId}`,
      message: 'New White Ink Portal root folder created and linked successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(err) || 'Failed to recreate Google Drive folder' });
  }
});

/**
 * POST /api/google/sync-attendance — Super Admin triggers manual bulk attendance synchronization
 */
googleRouter.post('/sync-attendance', requireAuth, requireRoles(['SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await syncAllAttendancesToSheets();
    return res.json({
      success: result.success,
      syncedCount: result.synced,
      failedCount: result.errors,
      total: result.total,
      message: result.errors === 0
        ? `Successfully synced ${result.synced} attendance records to Google Sheets.`
        : `Synced ${result.synced} records with ${result.errors} issues. Check Google Sheets configuration.`,
    });
  } catch (err: any) {
    return res.status(500).json({ message: sanitizeErrorMessage(err) || 'Attendance sync failed' });
  }
});

/**
 * Helper to check whether the current user is authorized to access a given Drive file ID.
 * Strict IDOR defense: validates fileId format and ensures the file is associated with a resource
 * (task, approval, handover doc) belonging to a project the user has legitimate permission to access.
 */
function isUserAuthorizedForFile(userId: string, role: string, fileId: string): boolean {
  if (!fileId || typeof fileId !== 'string' || !/^[a-zA-Z0-9_-]{5,}$/.test(fileId.trim())) {
    return false;
  }

  const cleanFileId = fileId.trim();

  // Super Admin & Admin have full operational access to portal files
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;

  const user = db.getUserById(userId);
  if (!user) return false;

  // 1. Check Tasks (driveFileId, deliverableUrl, or revisionRequest containing fileId)
  const matchingTasks = db.getTasks().filter(
    (t) =>
      t.driveFileId === cleanFileId ||
      (t.deliverableUrl && t.deliverableUrl.includes(cleanFileId)) ||
      (t.revisionRequest && t.revisionRequest.includes(cleanFileId))
  );

  for (const task of matchingTasks) {
    const project = db.getProjectById(task.projectId);
    if (!project) continue;

    // Team Member: must be assigned, submitter, or project member
    if (role === 'TEAM_MEMBER') {
      if (
        task.assignedToId === userId ||
        task.submittedById === userId ||
        db.getProjectMembers(project.id).some((pm) => pm.userId === userId)
      ) {
        return true;
      }
    }

    // Client: project's client must match the current user
    if (role === 'CLIENT' || role === 'CLIENT_ADMIN') {
      const client = db.getClientById(project.clientId);
      if (
        (user.clientId && client && user.clientId === client.id) ||
        (client && client.email.toLowerCase() === user.email.toLowerCase()) ||
        project.clientId === user.id ||
        project.createdById === user.id
      ) {
        return true;
      }
    }
  }

  // 2. Check Client Approvals (deliverableUrl containing fileId)
  const matchingApprovals = db.getApprovals().filter(
    (a) => a.deliverableUrl && a.deliverableUrl.includes(cleanFileId)
  );

  for (const approval of matchingApprovals) {
    const project = db.getProjectById(approval.projectId);
    if (!project) continue;

    if (role === 'TEAM_MEMBER') {
      if (
        approval.requestedById === userId ||
        db.getProjectMembers(project.id).some((pm) => pm.userId === userId) ||
        project.createdById === userId
      ) {
        return true;
      }
    }

    if (role === 'CLIENT' || role === 'CLIENT_ADMIN') {
      const client = db.getClientById(project.clientId);
      if (
        (user.clientId && client && user.clientId === client.id) ||
        (client && client.email.toLowerCase() === user.email.toLowerCase()) ||
        project.clientId === user.id ||
        project.createdById === user.id
      ) {
        return true;
      }
    }
  }

  // 3. Check Project Handover Documents
  for (const proj of db.getProjects()) {
    if (proj.handoverDocs && proj.handoverDocs.includes(cleanFileId)) {
      if (role === 'TEAM_MEMBER') {
        if (
          db.getProjectMembers(proj.id).some((pm) => pm.userId === userId) ||
          proj.createdById === userId
        ) {
          return true;
        }
      }

      if (role === 'CLIENT' || role === 'CLIENT_ADMIN') {
        const client = db.getClientById(proj.clientId);
        if (
          (user.clientId && client && user.clientId === client.id) ||
          (client && client.email.toLowerCase() === user.email.toLowerCase()) ||
          proj.clientId === user.id ||
          proj.createdById === user.id
        ) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * GET /api/google/files/:fileId/metadata — Safely retrieves sanitized metadata for an authorized Drive file.
 */
googleRouter.get('/files/:fileId/metadata', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const user = req.user!;

  if (!isUserAuthorizedForFile(user.id, user.role, fileId)) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to access this file.' });
  }

  const metaRes = await getDriveFileMetadata(fileId);
  if (!metaRes.success || !metaRes.file) {
    return res.status(404).json({ message: metaRes.error || 'File not found in Google Drive.' });
  }

  return res.json({ file: metaRes.file });
});

/**
 * GET /api/google/files/:fileId/download — Authenticated portal proxy file download from private Drive.
 */
googleRouter.get('/files/:fileId/download', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const user = req.user!;

  if (!isUserAuthorizedForFile(user.id, user.role, fileId)) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to access this file.' });
  }

  const streamRes = await getDriveFileStream(fileId);
  if (!streamRes.success || !streamRes.stream) {
    return res.status(404).json({ message: streamRes.error || 'File not found in Google Drive.' });
  }

  res.setHeader('Content-Type', streamRes.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(streamRes.filename || 'download')}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-transform, max-age=3600');
  if (streamRes.size) {
    res.setHeader('Content-Length', streamRes.size);
  }

  req.on('close', () => {
    if (streamRes.stream?.destroy) {
      streamRes.stream.destroy();
    }
  });

  streamRes.stream.on('error', (streamErr: any) => {
    console.error('[DRIVE STREAM ERROR]:', sanitizeErrorMessage(streamErr));
    if (!res.headersSent) {
      return res.status(502).json({ message: 'Error streaming file from Google Drive.' });
    }
    res.end();
  });

  streamRes.stream.pipe(res);
});

/**
 * GET /api/google/files/:fileId/view — Authenticated portal proxy file viewing (inline) from private Drive.
 */
googleRouter.get('/files/:fileId/view', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { fileId } = req.params;
  const user = req.user!;

  if (!isUserAuthorizedForFile(user.id, user.role, fileId)) {
    return res.status(403).json({ message: 'Forbidden: You do not have permission to access this file.' });
  }

  const streamRes = await getDriveFileStream(fileId);
  if (!streamRes.success || !streamRes.stream) {
    return res.status(404).json({ message: streamRes.error || 'File not found in Google Drive.' });
  }

  res.setHeader('Content-Type', streamRes.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(streamRes.filename || 'view')}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-transform, max-age=3600');
  if (streamRes.size) {
    res.setHeader('Content-Length', streamRes.size);
  }

  req.on('close', () => {
    if (streamRes.stream?.destroy) {
      streamRes.stream.destroy();
    }
  });

  streamRes.stream.on('error', (streamErr: any) => {
    console.error('[DRIVE STREAM ERROR]:', sanitizeErrorMessage(streamErr));
    if (!res.headersSent) {
      return res.status(502).json({ message: 'Error streaming file from Google Drive.' });
    }
    res.end();
  });

  streamRes.stream.pipe(res);
});
