import { Router, Response } from 'express';
import { db, AttendanceStatus, getTodayDateString } from '../db.ts';
import { requireAuth, requireRoles, AuthenticatedRequest } from '../auth.ts';
import { syncAttendanceToSheet } from '../services/google/sheets.ts';

export const attendanceRouter = Router();

// Global rule: All attendance endpoints require authentication and CLIENT and CLIENT_ADMIN roles are strictly forbidden
attendanceRouter.use(requireAuth);
attendanceRouter.use((req: AuthenticatedRequest, res: Response, next) => {
  if (req.user?.role === 'CLIENT' || req.user?.role === 'CLIENT_ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Clients do not have access to attendance management.' });
  }
  next();
});

// POST /clock-in - Clock in for the current user
attendanceRouter.post('/clock-in', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { timestamp } = req.body || {};
    const attendance = db.clockIn(userId, timestamp);
    // Background Google Sheets sync (non-blocking)
    syncAttendanceToSheet(attendance.id).catch((err) => console.warn('[SHEETS] Sync on clock-in skipped/failed:', err?.message));
    return res.status(200).json({
      message: 'Clocked in successfully.',
      attendance,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to clock in.' });
  }
});

// POST /clock-out - Clock out for the current user
attendanceRouter.post('/clock-out', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { timestamp, earlyClockOutReason } = req.body || {};
    const attendance = db.clockOut(userId, timestamp, earlyClockOutReason);
    // Background Google Sheets sync (non-blocking)
    syncAttendanceToSheet(attendance.id).catch((err) => console.warn('[SHEETS] Sync on clock-out skipped/failed:', err?.message));
    return res.status(200).json({
      message: 'Clocked out successfully.',
      attendance,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to clock out.' });
  }
});

// POST /break/start - Start a break
attendanceRouter.post('/break/start', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { timestamp } = req.body || {};
    const attendance = db.startBreak(userId, timestamp);
    return res.status(200).json({
      message: 'Break started.',
      attendance,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to start break.' });
  }
});

// POST /break/end - End active break
attendanceRouter.post('/break/end', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { timestamp } = req.body || {};
    const attendance = db.endBreak(userId, timestamp);
    // Background Google Sheets sync (non-blocking)
    syncAttendanceToSheet(attendance.id).catch((err) => console.warn('[SHEETS] Sync on break-end skipped/failed:', err?.message));
    return res.status(200).json({
      message: 'Break ended.',
      attendance,
    });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to end break.' });
  }
});

// GET /today - Today's attendance status and active state for current user
attendanceRouter.get('/today', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const dateStr = (req.query.date as string) || undefined;
    const attendance = db.getTodayAttendance(userId, dateStr);
    return res.status(200).json({ attendance });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch today attendance.' });
  }
});

// GET /history - Attendance history for user (or filtered if admin)
attendanceRouter.get('/history', (req: AuthenticatedRequest, res: Response) => {
  try {
    const isSuperAdminOrAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';
    let targetUserId = req.user!.id;

    // If an admin requests a specific user's history, honor it; otherwise TEAM_MEMBER always gets own history
    if (isSuperAdminOrAdmin && req.query.userId) {
      targetUserId = req.query.userId as string;
    }

    const filters = {
      userId: targetUserId,
      date: req.query.date as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      status: req.query.status as AttendanceStatus,
    };

    const history = db.getAttendances(filters);
    return res.status(200).json(history);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch attendance history.' });
  }
});

// GET /team - Team Attendance (Admin / Super Admin only)
attendanceRouter.get('/team', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { range, startDate, endDate, employeeId, status, search } = req.query;

    let computedStartDate = startDate as string | undefined;
    let computedEndDate = endDate as string | undefined;

    const today = new Date();
    const todayStr = getTodayDateString(today);

    if (range === 'today') {
      computedStartDate = todayStr;
      computedEndDate = todayStr;
    } else if (range === 'week') {
      const weekStart = new Date(today);
      const day = weekStart.getDay();
      const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday
      weekStart.setDate(diff);
      computedStartDate = getTodayDateString(weekStart);
      computedEndDate = todayStr;
    } else if (range === 'month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      computedStartDate = getTodayDateString(monthStart);
      computedEndDate = todayStr;
    }

    const filters = {
      userId: employeeId ? (employeeId as string) : undefined,
      startDate: computedStartDate,
      endDate: computedEndDate,
      status: status ? (status as AttendanceStatus) : undefined,
      search: search ? (search as string) : undefined,
    };

    const records = db.getAttendances(filters);
    return res.status(200).json(records);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch team attendance.' });
  }
});

// GET /stats - Attendance overview statistics
attendanceRouter.get('/stats', (req: AuthenticatedRequest, res: Response) => {
  try {
    const dateStr = req.query.date as string | undefined;
    const stats = db.getAttendanceStats(dateStr);
    return res.status(200).json(stats);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch attendance stats.' });
  }
});

// GET /:id - Single attendance record by ID
attendanceRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const record = db.getAttendanceById(id);
    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }

    // Check ownership or admin rights
    const isOwner = record.userId === req.user!.id;
    const isAdmin = req.user!.role === 'SUPER_ADMIN' || req.user!.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden: You cannot view attendance of other users.' });
    }

    return res.status(200).json(record);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Failed to fetch attendance record.' });
  }
});

// PUT /:id - Admin adjust attendance record
attendanceRouter.put('/:id', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const updated = db.adminUpdateAttendance(id, updates, req.user!.id);
    if (!updated) {
      return res.status(404).json({ message: 'Attendance record not found.' });
    }
    // Background Google Sheets sync (non-blocking)
    syncAttendanceToSheet(updated.id).catch((err) => console.warn('[SHEETS] Sync on admin update skipped/failed:', err?.message));
    return res.status(200).json({ message: 'Attendance record updated.', attendance: updated });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to update attendance record.' });
  }
});

// POST /admin-create - Admin manually create attendance record
attendanceRouter.post('/admin-create', requireRoles(['SUPER_ADMIN', 'ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, date, clockIn, clockOut, status, totalWorkingMinutes, totalBreakMinutes, effectiveWorkingMinutes } = req.body;
    if (!userId || !date) {
      return res.status(400).json({ message: 'userId and date are required.' });
    }

    const created = db.adminCreateAttendance({
      userId,
      date,
      clockIn: clockIn || null,
      clockOut: clockOut || null,
      status: status || 'PRESENT',
      totalWorkingMinutes: totalWorkingMinutes || 0,
      totalBreakMinutes: totalBreakMinutes || 0,
      effectiveWorkingMinutes: effectiveWorkingMinutes || 0,
    }, req.user!.id);

    // Background Google Sheets sync (non-blocking)
    syncAttendanceToSheet(created.id).catch((err) => console.warn('[SHEETS] Sync on admin create skipped/failed:', err?.message));
    return res.status(201).json({ message: 'Attendance record created.', attendance: created });
  } catch (err: any) {
    return res.status(400).json({ message: err.message || 'Failed to create attendance record.' });
  }
});

