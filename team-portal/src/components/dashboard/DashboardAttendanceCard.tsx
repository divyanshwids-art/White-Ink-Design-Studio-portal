import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Attendance, Break } from '../../types';
import { api } from '../../services/api';
import { EodReportModal } from '../attendance/EodReportModal';
import {
  Calendar,
  Clock,
  Timer,
  Coffee,
  Hourglass,
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronDown,
} from 'lucide-react';

interface DashboardAttendanceCardProps {
  attendance: Attendance | null;
  onAttendanceChange: () => void;
}

export const DashboardAttendanceCard: React.FC<DashboardAttendanceCardProps> = ({
  attendance,
  onAttendanceChange,
}) => {
  const { user } = useAuth();
  const isSuperAdminOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modals state
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [showEarlyClockOutModal, setShowEarlyClockOutModal] = useState(false);
  const [showClockInReasonModal, setShowClockInReasonModal] = useState(false);
  const [clockInReasonTitle, setClockInReasonTitle] = useState('Late Arrival');
  const [clockInReason, setClockInReason] = useState('');
  const [clockOutReasonTitle, setClockOutReasonTitle] = useState('Early Clock-Out');
  const [earlyReason, setEarlyReason] = useState('');
  const [tomorrowTask, setTomorrowTask] = useState('');
  const [officeStartTime, setOfficeStartTime] = useState<string>('09:00');
  const [officeEndTime, setOfficeEndTime] = useState<string>('18:30');
  const [showEodModalAfterClockOut, setShowEodModalAfterClockOut] = useState(false);

  // Live ticking clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch office shift schedule settings
  useEffect(() => {
    const loadScheduleInfo = async () => {
      try {
        const [settingsRes, overrideRes] = await Promise.allSettled([
          api.getSettings(),
          api.getMyScheduleOverride(),
        ]);
        let start = '09:00';
        let end = '18:30';
        if (settingsRes.status === 'fulfilled' && settingsRes.value) {
          if (settingsRes.value.officeStartTime) start = settingsRes.value.officeStartTime;
          if (settingsRes.value.officeEndTime) end = settingsRes.value.officeEndTime;
        }
        if (overrideRes.status === 'fulfilled' && overrideRes.value?.override) {
          if (overrideRes.value.override.customStartTime) start = overrideRes.value.override.customStartTime;
          if (overrideRes.value.override.customEndTime) end = overrideRes.value.override.customEndTime;
        }
        setOfficeStartTime(start);
        setOfficeEndTime(end);
      } catch {
        // Fallback defaults
      }
    };
    loadScheduleInfo();
  }, []);

  const isClockedIn = !!attendance?.clockIn;
  const isClockedOut = !!attendance?.clockOut;
  const activeBreak = attendance?.breaks?.find((b: Break) => !b.endTime) || null;
  const isOnBreak = !!activeBreak;

  // Calculate live working, break, and effective seconds
  const calculateLiveTimes = () => {
    if (!attendance || !attendance.clockIn) {
      return { totalWorkingSec: 0, totalBreakSec: 0, effectiveWorkingSec: 0 };
    }

    const nowMs = isClockedOut && attendance.clockOut
      ? new Date(attendance.clockOut).getTime()
      : currentTime.getTime();

    const clockInMs = new Date(attendance.clockIn).getTime();
    const totalWorkingSec = Math.max(0, Math.floor((nowMs - clockInMs) / 1000));

    let totalBreakSec = 0;
    if (attendance.breaks && attendance.breaks.length > 0) {
      for (const b of attendance.breaks) {
        const startMs = new Date(b.startTime).getTime();
        const endMs = b.endTime ? new Date(b.endTime).getTime() : nowMs;
        totalBreakSec += Math.max(0, Math.floor((endMs - startMs) / 1000));
      }
    }

    const effectiveWorkingSec = Math.max(0, totalWorkingSec - totalBreakSec);

    return { totalWorkingSec, totalBreakSec, effectiveWorkingSec };
  };

  const { totalWorkingSec, totalBreakSec, effectiveWorkingSec } = calculateLiveTimes();

  const formatHMS = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const formatShortTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const checkClockInStatus = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = officeStartTime.split(':').map((v) => parseInt(v, 10) || 0);
    const scheduledStartMins = startH * 60 + startM;
    const lateThresholdMins = scheduledStartMins + 15;
    const earlyArrivalThresholdMins = scheduledStartMins - 30;

    if (currentMins > lateThresholdMins) {
      return { isSpecial: true, title: 'Late Arrival Reason' };
    }
    if (currentMins < earlyArrivalThresholdMins) {
      return { isSpecial: true, title: 'Early Arrival Reason' };
    }
    return { isSpecial: false, title: '' };
  };

  const checkClockOutStatus = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [endH, endM] = officeEndTime.split(':').map((v) => parseInt(v, 10) || 0);
    const scheduledEndMins = endH * 60 + endM;
    const lateOvertimeMins = scheduledEndMins + 60;

    if (currentMins < scheduledEndMins) {
      return { isSpecial: true, title: 'Early Clock-Out Reason', isEarly: true };
    }
    if (currentMins > lateOvertimeMins) {
      return { isSpecial: true, title: 'Late / Overtime Clock-Out Reason', isEarly: false };
    }
    return { isSpecial: false, title: 'Standard Clock-Out', isEarly: false };
  };

  const handleInitiateClockIn = () => {
    setActionError(null);
    setClockInReason('');
    const status = checkClockInStatus();
    if (status.isSpecial) {
      setClockInReasonTitle(status.title);
      setShowClockInReasonModal(true);
    } else {
      executeClockIn();
    }
  };

  const executeClockIn = async (reason?: string) => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockIn({ clockInReason: reason });
      setShowClockInReasonModal(false);
      setClockInReason('');
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to clock in.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInitiateClockOut = () => {
    setActionError(null);
    setEarlyReason('');
    setTomorrowTask('');
    const status = checkClockOutStatus();
    if (status.isSpecial) {
      setClockOutReasonTitle(status.title);
      setShowEarlyClockOutModal(true);
    } else {
      setShowClockOutModal(true);
    }
  };

  const handleClockOut = async () => {
    const trimmedTask = tomorrowTask.trim();
    if (!trimmedTask) {
      setActionError('Please specify your planned task for tomorrow before clocking out.');
      return;
    }
    setShowClockOutModal(false);
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockOut({ tomorrowTask: trimmedTask });
      setTomorrowTask('');
      onAttendanceChange();
      setShowEodModalAfterClockOut(true);
    } catch (err: any) {
      setActionError(err.message || 'Failed to clock out.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEarlyClockOut = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedReason = earlyReason.trim();
    const trimmedTask = tomorrowTask.trim();
    if (!trimmedReason) {
      setActionError('Please provide a reason before proceeding with clock out.');
      return;
    }
    if (!trimmedTask) {
      setActionError('Please specify your planned task for tomorrow before clocking out.');
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockOut({
        earlyClockOutReason: trimmedReason,
        clockOutReason: trimmedReason,
        tomorrowTask: trimmedTask,
      });
      setShowEarlyClockOutModal(false);
      setEarlyReason('');
      setTomorrowTask('');
      onAttendanceChange();
      setShowEodModalAfterClockOut(true);
    } catch (err: any) {
      setActionError(err.message || 'Failed to clock out.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartBreak = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.startBreak();
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to start break.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndBreak = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.endBreak();
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to end break.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
      {/* Attendance Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
            <Calendar className="h-4 w-4 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[#1C1917] tracking-tight">Attendance</h2>
            <p className="text-[11px] text-[#78716C]">Your work hours at a glance</p>
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {actionError && (
        <div className="p-2.5 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs flex items-center justify-between gap-2 font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-[11px] underline font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Current Time Banner Box */}
      <div className="bg-[#FAF7F2] rounded-xl border border-[#EDE7DD] p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white border border-[#EDE7DD] flex items-center justify-center text-[#BA954F] shrink-0 shadow-2xs">
            <Clock className="h-4 w-4 stroke-[1.75]" />
          </div>
          <div>
            <div className="text-[10px] font-medium text-[#78716C]">Current Time</div>
            <div className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight font-mono">
              {currentTime.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
              })}
            </div>
            <div className="text-[11px] text-[#78716C]">
              Scheduled Shift: End Time {officeEndTime}
            </div>
          </div>
        </div>

        {/* Status Pill on Right */}
        <div className="self-start sm:self-center">
          {!isClockedIn ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white text-[#78716C] border border-[#EDE7DD] shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-[#BA954F]" />
              Not Clocked In
            </span>
          ) : isClockedOut ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD] shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#2D6A4F]" />
              Shift Completed
            </span>
          ) : isOnBreak ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FDF6E9] text-[#B45309] border border-[#F9E2AF] shadow-2xs animate-pulse">
              <Coffee className="h-3.5 w-3.5 text-[#B45309]" />
              On Break
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] shadow-2xs animate-pulse">
              <Play className="h-3.5 w-3.5 text-[#BA954F] fill-current" />
              Actively Working
            </span>
          )}
        </div>
      </div>

      {/* 3 Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Total Working Duration */}
        <div className="p-2.5 rounded-xl border border-[#EDE7DD] bg-white flex flex-col justify-between shadow-2xs">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="p-1 rounded-lg bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
              <Timer className="h-3 w-3 stroke-[2]" />
            </div>
            <span className="text-[10px] font-semibold text-[#78716C] truncate">
              Working Duration
            </span>
          </div>
          <div>
            <div className="text-lg font-bold font-mono tracking-tight text-[#1C1917]">
              {isClockedIn ? formatHMS(totalWorkingSec) : '00:00:00'}
            </div>
            <div className="text-[9px] text-[#78716C] mt-0.5 flex items-center justify-between font-medium">
              <span>In: {formatShortTime(attendance?.clockIn)}</span>
              <span>Out: {formatShortTime(attendance?.clockOut)}</span>
            </div>
          </div>
        </div>

        {/* Total Break Duration */}
        <div className="p-2.5 rounded-xl border border-[#EDE7DD] bg-white flex flex-col justify-between shadow-2xs">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="p-1 rounded-lg bg-[#F0FDF4] text-[#15803D] border border-[#DCFCE7]">
              <Coffee className="h-3 w-3 stroke-[2]" />
            </div>
            <span className="text-[10px] font-semibold text-[#78716C] truncate">
              Break Duration
            </span>
          </div>
          <div>
            <div className="text-lg font-bold font-mono tracking-tight text-[#1C1917]">
              {isClockedIn ? formatHMS(totalBreakSec) : '00:00:00'}
            </div>
            <div className="text-[9px] text-[#78716C] mt-0.5 font-medium">
              {attendance?.breaks?.length || 0} session(s)
            </div>
          </div>
        </div>

        {/* Effective Working Duration */}
        <div className="p-2.5 rounded-xl border border-[#EDE7DD] bg-white flex flex-col justify-between shadow-2xs">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="p-1 rounded-lg bg-[#FAF5FF] text-[#7E22CE] border border-[#F3E8FF]">
              <Hourglass className="h-3 w-3 stroke-[2]" />
            </div>
            <span className="text-[10px] font-semibold text-[#78716C] truncate">
              Effective Working
            </span>
          </div>
          <div>
            <div className="text-lg font-bold font-mono tracking-tight text-[#1C1917]">
              {isClockedIn ? formatHMS(effectiveWorkingSec) : '00:00:00'}
            </div>
            <div className="text-[9px] text-[#78716C] mt-0.5 font-medium">
              Working minus breaks
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Action Buttons Strip */}
      <div>
        {!isClockedIn ? (
          <button
            type="button"
            onClick={handleInitiateClockIn}
            disabled={isProcessing}
            className="w-full py-2 px-3 bg-[#BA954F] hover:bg-[#A17B2F] text-white font-semibold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer btn-hover-lift disabled:opacity-50"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>{isProcessing ? 'Clocking In...' : 'Clock In Now'}</span>
          </button>
        ) : isClockedOut ? (
          <div className="flex items-center justify-between gap-2 p-2.5 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2D6A4F]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Shift finalized{isSuperAdminOrAdmin ? '' : ' for today'}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowEodModalAfterClockOut(true)}
              className="px-2.5 py-1 text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] bg-white hover:bg-[#FAF4EC] border border-[#EDE3D4] rounded-lg transition-all cursor-pointer shadow-2xs"
            >
              View / Edit EOD Report
            </button>
          </div>
        ) : isOnBreak ? (
          <button
            type="button"
            onClick={handleEndBreak}
            disabled={isProcessing}
            className="w-full py-2 px-3 bg-[#BA954F] hover:bg-[#A17B2F] text-white font-semibold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer btn-hover-lift disabled:opacity-50"
          >
            <Play className="h-3 w-3 fill-current" />
            <span>{isProcessing ? 'Ending Break...' : 'End Break & Resume Work'}</span>
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleStartBreak}
              disabled={isProcessing}
              className="py-2 px-2.5 bg-white hover:bg-[#FAF7F2] text-[#443B30] border border-[#DFD5C6] font-semibold text-xs rounded-xl transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <Coffee className="h-3 w-3 text-[#BA954F]" />
              <span>{isProcessing ? 'Starting...' : 'Start Studio Break'}</span>
            </button>
            <button
              type="button"
              onClick={handleInitiateClockOut}
              disabled={isProcessing}
              className="py-2 px-2.5 bg-[#9E2A2B] hover:bg-[#831F20] text-white font-semibold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Square className="h-3 w-3 fill-current" />
              <span>{isProcessing ? 'Clocking Out...' : 'Clock Out for Day'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Sync Footer Note */}
      <div className="flex items-center gap-1.5 text-[10px] text-[#78716C] pt-0.5">
        <Info className="h-3 w-3 text-[#78716C] shrink-0" />
        <span>Your attendance will be synced with Google Sheets at the end of the day.</span>
      </div>

      {/* Clock In Reason Modal (Late or Early) */}
      {showClockInReasonModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-gold-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EDE7DD] space-y-4">
            <div className="flex items-center gap-3 text-[#BA954F]">
              <div className="p-2.5 bg-[#FAF4EC] rounded-xl border border-[#EDE3D4]">
                <Clock className="h-6 w-6 text-[#BA954F]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">{clockInReasonTitle}</h3>
                <p className="text-xs text-[#78716C]">Scheduled Start Time: {officeStartTime}</p>
              </div>
            </div>

            <div className="p-3 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl text-xs text-[#57534E]">
              Please enter a brief remark/reason for your {clockInReasonTitle.toLowerCase()} to submit to Admin.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#1C1917]">
                Reason / Remark <span className="text-[#9E2A2B]">*</span>
              </label>
              <textarea
                rows={3}
                value={clockInReason}
                onChange={(e) => setClockInReason(e.target.value)}
                placeholder="e.g., Heavy traffic delay, Metro delay, early client call..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] resize-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE7DD]">
              <button
                type="button"
                onClick={() => {
                  setShowClockInReasonModal(false);
                  setClockInReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-[#443B30] bg-white border border-[#DFD5C6] rounded-xl hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeClockIn(clockInReason)}
                disabled={isProcessing || !clockInReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] disabled:opacity-40 rounded-xl transition-colors cursor-pointer shadow-xs btn-hover-lift"
              >
                {isProcessing ? 'Clocking In...' : 'Submit & Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Normal Clock Out Confirmation Modal */}
      {showClockOutModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EDE7DD] space-y-4">
            <div className="flex items-center gap-3 text-[#9E2A2B]">
              <div className="p-2.5 bg-[#FDF2F0] rounded-xl border border-[#F5D5D0]">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-[#1C1917]">Confirm Clock Out</h3>
            </div>
            <p className="text-xs text-[#78716C] leading-relaxed">
              Are you sure you want to clock out for today? This will finalize your shift record with{' '}
              <strong className="font-bold text-[#1C1917]">
                {Math.floor(effectiveWorkingSec / 3600)}h {Math.floor((effectiveWorkingSec % 3600) / 60)}m
              </strong>{' '}
              of effective working hours.
            </p>

            <div className="space-y-1.5 p-3.5 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl">
              <label htmlFor="normal-clockout-tomorrow-task" className="block text-xs font-bold text-[#1C1917]">
                Tomorrow's Planned Task / To-Do <span className="text-[#9E2A2B]">*</span>
              </label>
              <p className="text-[11px] text-[#78716C]">
                Please write your planned task for tomorrow before completing your exit.
              </p>
              <input
                id="normal-clockout-tomorrow-task"
                type="text"
                required
                value={tomorrowTask}
                onChange={(e) => setTomorrowTask(e.target.value)}
                placeholder="e.g., Finalize floor plan CAD, review client comments..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-white text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE7DD]">
              <button
                type="button"
                onClick={() => {
                  setShowClockOutModal(false);
                  setTomorrowTask('');
                }}
                className="px-4 py-2 text-xs font-semibold text-[#443B30] bg-white border border-[#DFD5C6] rounded-xl hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClockOut}
                disabled={isProcessing || !tomorrowTask.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9E2A2B] hover:bg-[#831F20] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
              >
                {isProcessing ? 'Processing...' : 'Yes, Clock Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early / Late Clock Out Reason Modal */}
      {showEarlyClockOutModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EDE7DD] space-y-4">
            <div className="flex items-center gap-3 text-[#B45309]">
              <div className="p-2.5 bg-[#FDF6E9] rounded-xl border border-[#F9E2AF]">
                <AlertTriangle className="h-6 w-6 text-[#B45309]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1917]">{clockOutReasonTitle}</h3>
                <p className="text-xs text-[#78716C]">Scheduled Shift End: {officeEndTime}</p>
              </div>
            </div>

            <div className="p-3 bg-[#FDF6E9] border border-[#F9E2AF] rounded-xl text-xs text-[#92400E]">
              You are clocking out outside your regular shift hours. Please provide a reason.
            </div>

            <div className="space-y-1.5">
              <label htmlFor="early-clockout-reason-input" className="block text-xs font-semibold text-[#1C1917]">
                Reason for Clock Out <span className="text-[#9E2A2B]">*</span>
              </label>
              <textarea
                id="early-clockout-reason-input"
                rows={2}
                value={earlyReason}
                onChange={(e) => setEarlyReason(e.target.value)}
                placeholder="e.g., Doctor appointment, emergency personal work, approved early leave..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] resize-none"
                required
              />
            </div>

            <div className="space-y-1.5 p-3.5 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl">
              <label htmlFor="early-clockout-tomorrow-task" className="block text-xs font-bold text-[#1C1917]">
                Tomorrow's Planned Task / To-Do <span className="text-[#9E2A2B]">*</span>
              </label>
              <p className="text-[11px] text-[#78716C]">
                Please write your planned task for tomorrow before completing your exit.
              </p>
              <input
                id="early-clockout-tomorrow-task"
                type="text"
                required
                value={tomorrowTask}
                onChange={(e) => setTomorrowTask(e.target.value)}
                placeholder="e.g., Complete material schedule and 3D elevation renders..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-white text-[#1C1917] placeholder:text-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE7DD]">
              <button
                type="button"
                onClick={() => {
                  setShowEarlyClockOutModal(false);
                  setEarlyReason('');
                  setTomorrowTask('');
                  setActionError(null);
                }}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-[#443B30] bg-white border border-[#DFD5C6] rounded-xl hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-early-clockout"
                onClick={() => handleEarlyClockOut()}
                disabled={isProcessing || !earlyReason.trim() || !tomorrowTask.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9E2A2B] hover:bg-[#831F20] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isProcessing ? 'Processing...' : 'Confirm Clock Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EOD Report Modal (auto-opens on clock-out or when user clicks View/Edit) */}
      <EodReportModal
        isOpen={showEodModalAfterClockOut}
        onClose={() => setShowEodModalAfterClockOut(false)}
        onSuccess={() => {
          setShowEodModalAfterClockOut(false);
          onAttendanceChange();
        }}
      />
    </div>
  );
};

