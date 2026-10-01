import { Router, Response } from 'express';
import { db } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../auth.ts';
import { ensureRootPortalFolder } from '../services/google/drive.ts';

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

// GET / - Get global policy and attendance settings
settingsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = db.getSettings();
    return res.status(200).json(settings);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch settings.' });
  }
});

// PUT / - Update system settings (Super Admin / Admin only)
settingsRouter.put('/', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      officeStartTime,
      officeEndTime,
      lateThresholdMinutes,
      maxBreakMinutes,
      defaultLeaveAllowance,
      taskRules,
      reasonsList,
      meetingLink,
      companyDriveUrl,
    } = req.body;

    const settings = db.updateSettings(
      {
        ...(officeStartTime !== undefined && { officeStartTime }),
        ...(officeEndTime !== undefined && { officeEndTime }),
        ...(lateThresholdMinutes !== undefined && { lateThresholdMinutes: Number(lateThresholdMinutes) }),
        ...(maxBreakMinutes !== undefined && { maxBreakMinutes: Number(maxBreakMinutes) }),
        ...(defaultLeaveAllowance !== undefined && { defaultLeaveAllowance: Number(defaultLeaveAllowance) }),
        ...(taskRules !== undefined && { taskRules: typeof taskRules === 'string' ? taskRules : JSON.stringify(taskRules) }),
        ...(reasonsList !== undefined && { reasonsList: typeof reasonsList === 'string' ? reasonsList : JSON.stringify(reasonsList) }),
        ...(meetingLink !== undefined && { meetingLink: meetingLink || null }),
        ...(companyDriveUrl !== undefined && { companyDriveUrl: companyDriveUrl || null }),
      },
      req.user!.id
    );

    return res.status(200).json({ message: 'Settings saved successfully.', settings });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to update settings.' });
  }
});

// GET /overrides - Get all employee schedule overrides (Admin only)
settingsRouter.get('/overrides', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const overrides = db.getScheduleOverrides();
    return res.status(200).json(overrides);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch overrides.' });
  }
});

// GET /overrides/mine - Get current user's schedule override if any
settingsRouter.get('/overrides/mine', (req: AuthenticatedRequest, res: Response) => {
  try {
    const override = db.getScheduleOverrideByUserId(req.user!.id);
    return res.status(200).json({ override });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch user schedule override.' });
  }
});

// POST /overrides - Set employee schedule override
settingsRouter.post('/overrides', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, customStartTime, customEndTime, notes } = req.body;
    if (!userId || !customStartTime || !customEndTime) {
      return res.status(400).json({ message: 'userId, customStartTime, and customEndTime are required.' });
    }

    const override = db.setScheduleOverride({ userId, customStartTime, customEndTime, notes }, req.user!.id);
    return res.status(200).json({ message: 'Employee schedule override saved.', override });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to set override.' });
  }
});

// DELETE /overrides/:userId - Remove employee schedule override
settingsRouter.delete('/overrides/:userId', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = db.deleteScheduleOverride(req.params.userId, req.user!.id);
    if (!success) {
      return res.status(404).json({ message: 'Schedule override not found.' });
    }
    return res.status(200).json({ message: 'Schedule override removed.' });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to delete override.' });
  }
});

// GET /company-drive - Quick access to company drive URL for all company staff & members
settingsRouter.get('/company-drive', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const google = db.getGoogleIntegration();
    if (google?.isConnected) {
      // Auto-heal if folder was deleted or missing in Google Drive
      await ensureRootPortalFolder().catch((err) => {
        console.warn('Auto-heal root folder check failed:', err?.message || err);
      });
    }

    const driveUrl = db.getCompanyDriveUrl();
    const settings = db.getSettings();
    const updatedGoogle = db.getGoogleIntegration();
    return res.status(200).json({
      driveUrl,
      configuredUrl: settings?.companyDriveUrl || null,
      driveRootFolderId: updatedGoogle?.driveRootFolderId || null,
      isGoogleConnected: Boolean(updatedGoogle?.isConnected),
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch company drive' });
  }
});

