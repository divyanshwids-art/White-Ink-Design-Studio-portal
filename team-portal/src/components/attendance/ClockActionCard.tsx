import React, { useState, useEffect } from 'react';
import { Attendance, Break } from '../../types';
import { api } from '../../services/api';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { Periodic15MinAlarm } from './Periodic15MinAlarm';
import { EodReportModal } from './EodReportModal';
import {
  Clock,
  Play,
  Square,
  Coffee,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Timer,
  Hourglass,
  Sparkles,
  FileText,
  UtensilsCrossed,
  Moon,
  PlusCircle,
  StopCircle,
} from 'lucide-react';

interface ClockActionCardProps {
  attendance: Attendance | null;
  onAttendanceChange: () => void;
}

export const ClockActionCard: React.FC<ClockActionCardProps> = ({
  attendance,
  onAttendanceChange,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [showEarlyClockOutModal, setShowEarlyClockOutModal] = useState(false);
  const [showClockInReasonModal, setShowClockInReasonModal] = useState(false);
  const [clockInReasonTitle, setClockInReasonTitle] = useState('Late Arrival');
  const [clockInReason, setClockInReason] = useState('');
  const [clockOutReasonTitle, setClockOutReasonTitle] = useState('Early Clock-Out');
  const [earlyReason, setEarlyReason] = useState('');
  const [tomorrowTask, setTomorrowTask] = useState('');
  const [officeStartTime, setOfficeStartTime] = useState<string>('09:00');
  const [officeEndTime, setOfficeEndTime] = useState<string>('18:00');
  const [showEodModalAfterClockOut, setShowEodModalAfterClockOut] = useState(false);

  // Overtime / Work From Home States
  const [showStartOvertimeModal, setShowStartOvertimeModal] = useState(false);
  const [showEndOvertimeModal, setShowEndOvertimeModal] = useState(false);
  const [showManualOvertimeModal, setShowManualOvertimeModal] = useState(false);
  const [overtimeReason, setOvertimeReason] = useState('');
  const [overtimeTaskId, setOvertimeTaskId] = useState('');
  const [manualDuration, setManualDuration] = useState('60');
  const [manualReason, setManualReason] = useState('');
  const [manualTaskId, setManualTaskId] = useState('');
  const [userTasks, setUserTasks] = useState<{ id: string; title: string }[]>([]);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch configured office start & end time
  useEffect(() => {
    const loadScheduleInfo = async () => {
      try {
        const [settingsRes, overrideRes] = await Promise.allSettled([
          api.getSettings(),
          api.getMyScheduleOverride(),
        ]);
        let start = '09:00';
        let end = '18:00';
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
        // Fallback
      }
    };
    loadScheduleInfo();

    // Load user active tasks for overtime linking
    api.getTasks({ status: 'IN_PROGRESS' })
      .then((res: any) => {
        if (Array.isArray(res)) {
          setUserTasks(res.map((t: any) => ({ id: t.id, title: t.title })));
        }
      })
      .catch(() => {});
  }, []);

  const isClockedIn = !!attendance?.clockIn;
  const isClockedOut = !!attendance?.clockOut;
  const activeBreak = attendance?.breaks?.find((b: Break) => !b.endTime) || null;
  const isOnBreak = !!activeBreak;
  const isLunchBreakActive = isOnBreak && activeBreak?.breakType === 'LUNCH';

  const currentHours = currentTime.getHours();
  const currentMins = currentTime.getMinutes();
  const isLunchTimeNow = (currentHours === 13 && currentMins >= 15) || (currentHours === 14 && currentMins === 0);

  // Calculate live elapsed times
  const calculateLiveTimes = () => {
    if (!attendance || !attendance.clockIn) {
      return {
        totalWorkingSec: 0,
        totalBreakSec: 0,
        effectiveWorkingSec: 0,
        totalOvertimeSec: 0,
        activeOvertimeSec: 0,
        activeOvertime: null,
        isOvertimeActive: false,
      };
    }

    const nowMs = isClockedOut && attendance.clockOut
      ? new Date(attendance.clockOut).getTime()
      : currentTime.getTime();

    const clockInMs = new Date(attendance.clockIn).getTime();
    const totalWorkingSec = Math.max(0, Math.floor((nowMs - clockInMs) / 1000));

    // Calculate break seconds
    let totalBreakSec = 0;
    if (attendance.breaks && attendance.breaks.length > 0) {
      for (const b of attendance.breaks) {
        const startMs = new Date(b.startTime).getTime();
        const endMs = b.endTime ? new Date(b.endTime).getTime() : nowMs;
        totalBreakSec += Math.max(0, Math.floor((endMs - startMs) / 1000));
      }
    }

    // Calculate overtime seconds
    const activeOvertime = attendance.overtimeSessions?.find((s: any) => !s.endTime) || null;
    const isOvertimeActive = !!activeOvertime;

    let totalOvertimeSec = 0;
    let activeOvertimeSec = 0;
    if (attendance.overtimeSessions && attendance.overtimeSessions.length > 0) {
      for (const s of attendance.overtimeSessions) {
        const startMs = new Date(s.startTime).getTime();
        const endMs = s.endTime ? new Date(s.endTime).getTime() : currentTime.getTime();
        const durSec = Math.max(0, Math.floor((endMs - startMs) / 1000));
        totalOvertimeSec += durSec;
        if (!s.endTime) {
          activeOvertimeSec = durSec;
        }
      }
    }

    const effectiveWorkingSec = Math.max(0, totalWorkingSec - totalBreakSec + totalOvertimeSec);

    return {
      totalWorkingSec,
      totalBreakSec,
      effectiveWorkingSec,
      totalOvertimeSec,
      activeOvertimeSec,
      activeOvertime,
      isOvertimeActive,
    };
  };

  const {
    totalWorkingSec,
    totalBreakSec,
    effectiveWorkingSec,
    totalOvertimeSec,
    activeOvertimeSec,
    activeOvertime,
    isOvertimeActive,
  } = calculateLiveTimes();

  const isCurrentlyWorking = (isClockedIn && !isClockedOut && !isOnBreak) || isOvertimeActive;

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
    const scheduledStartMins = startH * 60 + startM; // e.g. 09:00 = 540
    const lateThresholdMins = scheduledStartMins + 15; // 09:15
    const earlyArrivalThresholdMins = scheduledStartMins - 30; // 08:30

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
    const scheduledEndMins = endH * 60 + endM; // e.g. 18:00 = 1080
    const lateOvertimeMins = scheduledEndMins + 60; // 19:00

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

  const handleStartBreak = async (breakType: 'LUNCH' | 'REGULAR' = 'REGULAR') => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.startBreak({ breakType });
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

  const handleStartOvertime = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessing(true);
    setActionError(null);
    try {
      const selectedTask = userTasks.find((t) => t.id === overtimeTaskId);
      await api.startOvertime({
        reason: overtimeReason.trim() || 'Work from home / Late night work',
        taskId: overtimeTaskId || undefined,
        taskTitle: selectedTask?.title || undefined,
      });
      setShowStartOvertimeModal(false);
      setOvertimeReason('');
      setOvertimeTaskId('');
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to start overtime session.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndOvertime = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.endOvertime({
        reason: overtimeReason.trim() || undefined,
      });
      setShowEndOvertimeModal(false);
      setOvertimeReason('');
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to end overtime session.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualOvertime = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const duration = parseInt(manualDuration, 10);
    if (!duration || duration <= 0) {
      setActionError('Please enter a valid duration in minutes.');
      return;
    }
    if (!manualReason.trim()) {
      setActionError('Please enter a reason or task note for this overtime work.');
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      const selectedTask = userTasks.find((t) => t.id === manualTaskId);
      await api.logManualOvertime({
        durationMinutes: duration,
        reason: manualReason.trim(),
        taskId: manualTaskId || undefined,
        taskTitle: selectedTask?.title || undefined,
      });
      setShowManualOvertimeModal(false);
      setManualDuration('60');
      setManualReason('');
      setManualTaskId('');
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to log manual overtime.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* Top Banner / Time Info - Warm Ivory & Studio Gold Header */}
      <div className="p-6 bg-[#FAF7F2] flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-[#EDE7DD]">
        <div>
          <div className="flex items-center gap-2 text-[#BA954F] text-xs font-semibold uppercase tracking-wider mb-1">
            <Calendar className="h-3.5 w-3.5 text-[#BA954F]" />
            <span>
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight font-serif text-neutral-900">
            {currentTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </div>
          <div className="text-xs text-neutral-500 font-medium mt-1">
            Scheduled Shift: End Time {officeEndTime}
          </div>
        </div>

        {/* Current State Status Pill */}
        <div className="flex flex-col md:items-end gap-2">
          <div className="text-xs text-neutral-500 font-medium">Current Status</div>
          <div>
            {!isClockedIn ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white text-neutral-700 border border-[#EDE7DD] shadow-xs">
                <Clock className="h-3.5 w-3.5 text-[#BA954F]" />
                Not Clocked In Today
              </span>
            ) : isClockedOut ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EBF3ED] text-[#2D6A4F] border border-[#D1E7D8] shadow-xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#2D6A4F]" />
                Shift Completed
              </span>
            ) : isOnBreak ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDF6E9] text-[#B45309] border border-[#F9E2AF] shadow-xs animate-pulse">
                {isLunchBreakActive ? (
                  <UtensilsCrossed className="h-3.5 w-3.5 text-[#B45309]" />
                ) : (
                  <Coffee className="h-3.5 w-3.5 text-[#B45309]" />
                )}
                {isLunchBreakActive ? 'On Lunch Break 🍱' : 'On Break (Taking a breather)'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FAF7F2] text-[#BA954F] border border-[#BA954F]/30 shadow-xs animate-pulse">
                <Play className="h-3.5 w-3.5 text-[#BA954F] fill-current" />
                Actively Working
              </span>
            )}
          </div>
          {attendance?.status && (
            <div className="mt-0.5">
              <AttendanceStatusBadge status={attendance.status} size="xs" />
            </div>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {actionError && (
        <div className="m-6 p-4 rounded-xl bg-[#FDF0ED] border border-[#F5D0C5] text-[#9E2A2B] text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-5 w-5 shrink-0 text-[#9E2A2B]" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-semibold underline text-[#9E2A2B] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Punch & Metrics Body */}
      <div className="p-6 space-y-6">
        {/* Working Duration Metrics Strip */}
        <div className={`grid grid-cols-1 ${totalOvertimeSec > 0 || isOvertimeActive ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
          {/* Total Working Time */}
          <div className="p-4 rounded-xl border border-[#EDE7DD] bg-[#FAF7F2] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-2">
              <span>Standard Shift Time</span>
              <Timer className="h-4 w-4 text-[#BA954F]" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900">
                {isClockedIn ? formatHMS(totalWorkingSec) : '00:00:00'}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium mt-1 flex items-center justify-between">
                <span>In: {formatShortTime(attendance?.clockIn)}</span>
                <span>Out: {formatShortTime(attendance?.clockOut)}</span>
              </div>
            </div>
          </div>

          {/* Break Duration */}
          <div className="p-4 rounded-xl border border-[#EDE7DD] bg-[#FAF7F2] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-2">
              <span>Total Break Duration</span>
              <Coffee className="h-4 w-4 text-[#BA954F]" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900">
                {isClockedIn ? formatHMS(totalBreakSec) : '00:00:00'}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium mt-1">
                {attendance?.breaks?.length || 0} break session(s) logged
              </div>
            </div>
          </div>

          {/* Overtime Duration Card (if active or logged) */}
          {(totalOvertimeSec > 0 || isOvertimeActive) && (
            <div className={`p-4 rounded-xl border ${isOvertimeActive ? 'border-amber-300 bg-amber-50/80 shadow-xs' : 'border-[#EDE7DD] bg-[#FAF7F2]'} flex flex-col justify-between`}>
              <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-2">
                <span className="flex items-center gap-1.5 font-bold text-amber-900">
                  <Moon className="h-3.5 w-3.5 text-amber-600" />
                  Overtime / WFH
                </span>
                {isOvertimeActive && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <div>
                <div className="text-2xl font-bold font-mono tracking-tight text-amber-950">
                  {formatHMS(totalOvertimeSec)}
                </div>
                <div className="text-[11px] text-amber-800 font-medium mt-1">
                  {attendance?.overtimeSessions?.length || 0} extra session(s)
                </div>
              </div>
            </div>
          )}

          {/* Effective Working Time */}
          <div className="p-4 rounded-xl border border-[#EDE7DD] bg-white flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-2">
              <span>Total Effective Duration</span>
              <Hourglass className="h-4 w-4 text-[#BA954F]" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900">
                {isClockedIn ? formatHMS(effectiveWorkingSec) : '00:00:00'}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium mt-1">
                Shift + Overtime minus break
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Action Buttons Section */}
        <div className="pt-2">
          {!isClockedIn ? (
            <div className="bg-[#FAF7F2] border border-[#EDE7DD] rounded-2xl p-6 sm:p-8 text-center space-y-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-neutral-900">Ready to start your studio workday?</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Click the button below to register your daily arrival and begin tracking your active studio hours.
                </p>
              </div>
              <button
                type="button"
                id="btn-clock-in"
                onClick={handleInitiateClockIn}
                disabled={isProcessing}
                className="btn-gold-primary px-8 py-3.5 text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-3 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{isProcessing ? 'Clocking In...' : 'Clock In Now'}</span>
              </button>
            </div>
          ) : isClockedOut ? (
            isOvertimeActive ? (
              /* LIVE OVERTIME SESSION IN PROGRESS */
              <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-slate-700 rounded-2xl p-6 sm:p-8 text-center text-white space-y-5 shadow-lg">
                <div className="inline-flex p-3 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full shadow-inner animate-pulse">
                  <Moon className="h-7 w-7" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-xs font-semibold mb-3">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    Overtime / Work From Home Session Active
                  </div>
                  <h3 className="font-serif text-3xl font-bold text-white tracking-wide font-mono">
                    {formatHMS(activeOvertimeSec)}
                  </h3>
                  <div className="text-xs text-slate-300 mt-2 space-y-0.5 max-w-md mx-auto">
                    <p>Started at <span className="font-semibold text-white">{formatShortTime(activeOvertime?.startTime)}</span></p>
                    {activeOvertime?.taskTitle && (
                      <p className="text-amber-300 font-medium">
                        Task: {activeOvertime.taskTitle}
                      </p>
                    )}
                    {activeOvertime?.reason && (
                      <p className="text-slate-400 italic">
                        "{activeOvertime.reason}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOvertimeReason(activeOvertime?.reason || '');
                      setShowEndOvertimeModal(true);
                    }}
                    disabled={isProcessing}
                    className="px-6 py-3 text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <StopCircle className="h-4 w-4" />
                    <span>{isProcessing ? 'Ending Session...' : 'End Overtime Session'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEodModalAfterClockOut(true)}
                    className="px-4 py-3 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="h-4 w-4" />
                    EOD Report
                  </button>
                </div>
              </div>
            ) : (
              /* SHIFT COMPLETE + OVERTIME ACTION CENTER */
              <div className="bg-[#FAF7F2] border border-[#EDE7DD] rounded-2xl p-6 sm:p-8 space-y-5">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 bg-white text-[#2D6A4F] border border-[#D1E7D8] rounded-full mb-1 shadow-xs">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-neutral-900">
                    You have completed your shift for today!
                  </h3>
                  <p className="text-xs text-neutral-600 leading-relaxed max-w-md mx-auto">
                    Your standard office shift is closed. Total effective time logged today:{' '}
                    <strong className="font-bold text-neutral-900">
                      {Math.floor(effectiveWorkingSec / 3600)}h {Math.floor((effectiveWorkingSec % 3600) / 60)}m
                    </strong>
                    {totalOvertimeSec > 0 && (
                      <span className="text-amber-800 font-semibold"> (includes {Math.floor(totalOvertimeSec / 60)}m overtime)</span>
                    )}
                    .
                  </p>
                  {(attendance.clockInReason || attendance.earlyClockOutReason || attendance.clockOutReason) && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 text-left max-w-md mx-auto space-y-1">
                      {attendance.clockInReason && (
                        <div>
                          <span className="font-semibold text-amber-800">Clock-In Note: </span>
                          <span className="italic">{attendance.clockInReason}</span>
                        </div>
                      )}
                      {(attendance.earlyClockOutReason || attendance.clockOutReason) && (
                        <div>
                          <span className="font-semibold text-amber-800">Clock-Out Reason: </span>
                          <span className="italic">{attendance.earlyClockOutReason || attendance.clockOutReason}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Overtime / Remote Work Box */}
                <div className="p-4 bg-white border border-[#EDE7DD] rounded-xl shadow-2xs max-w-lg mx-auto space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-neutral-900">
                      <Moon className="h-4 w-4 text-[#BA954F]" />
                      <span>Late Night / Work From Home?</span>
                    </div>
                    <span className="text-[11px] text-neutral-500 font-medium">Track your extra hours</span>
                  </div>
                  <p className="text-[11px] text-neutral-600 leading-normal">
                    Agar aap ghar se extra kaam shuru kar rahe hain, to live overtime timer start karein ya completed hours log karein:
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowStartOvertimeModal(true)}
                      className="btn-gold-primary px-4 py-2.5 text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs flex-1 justify-center"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Start Overtime Timer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualOvertimeModal(true)}
                      className="btn-gold-secondary px-4 py-2.5 text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer flex-1 justify-center"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      <span>Log Past Hours</span>
                    </button>
                  </div>
                </div>

                {/* Display Today's Overtime Sessions if any */}
                {attendance.overtimeSessions && attendance.overtimeSessions.length > 0 && (
                  <div className="max-w-lg mx-auto bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <Moon className="h-3.5 w-3.5 text-amber-600" />
                        Today's Overtime Sessions ({attendance.overtimeSessions.length})
                      </span>
                      <span className="text-amber-800 font-mono">
                        +{Math.floor(totalOvertimeSec / 60)} mins
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {attendance.overtimeSessions.map((s, idx) => (
                        <div key={s.id || idx} className="text-[11px] bg-white p-2.5 rounded-lg border border-amber-100 flex items-center justify-between text-neutral-700">
                          <div>
                            <span className="font-semibold text-neutral-900">{formatShortTime(s.startTime)} - {s.endTime ? formatShortTime(s.endTime) : 'Running'}</span>
                            {s.taskTitle && <span className="ml-2 text-amber-700 font-medium">({s.taskTitle})</span>}
                            {s.reason && <p className="text-neutral-500 italic mt-0.5">{s.reason}</p>}
                          </div>
                          <span className="font-bold font-mono text-amber-800 shrink-0 ml-2">
                            {s.durationMinutes || Math.floor((new Date(s.endTime || currentTime).getTime() - new Date(s.startTime).getTime()) / 60000)}m
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => setShowEodModalAfterClockOut(true)}
                    className="px-4 py-2 text-xs font-bold text-[#BA954F] hover:text-[#A17B2F] bg-white hover:bg-[#FAF4EC] border border-[#EDE3D4] rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <FileText className="h-4 w-4" />
                    View / Edit Today's EOD Report
                  </button>
                </div>
              </div>
            )
          ) : isOnBreak ? (
            <div className="bg-[#FAF7F2] border border-[#EDE7DD] rounded-2xl p-6 sm:p-8 text-center space-y-4">
              <div>
                <div className="inline-flex p-3 bg-white text-[#BA954F] border border-[#EDE7DD] rounded-full mb-1 shadow-xs animate-bounce">
                  {isLunchBreakActive ? <UtensilsCrossed className="h-6 w-6" /> : <Coffee className="h-6 w-6" />}
                </div>
                <h3 className="font-serif text-lg font-bold text-neutral-900">
                  {isLunchBreakActive ? '🍱 Lunch Break in Progress' : 'Break in Progress'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {isLunchBreakActive
                    ? `Started at ${formatShortTime(activeBreak?.startTime)}. Scheduled until 2:00 PM. Click below when ready to resume work.`
                    : `Started at ${formatShortTime(activeBreak?.startTime)}. Click the button below when you are ready to resume work.`}
                </p>
              </div>
              <button
                type="button"
                id="btn-end-break"
                onClick={handleEndBreak}
                disabled={isProcessing}
                className="btn-gold-primary px-8 py-3.5 text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-3 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{isProcessing ? 'Ending Break...' : 'End Break & Resume Work'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dedicated Lunch Break Schedule & Quick Action Strip */}
              <div className="p-4 rounded-2xl bg-[#FAF4EC] border border-[#EDE3D4] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white rounded-xl border border-[#EDE3D4] text-[#BA954F] shadow-2xs shrink-0">
                    <UtensilsCrossed className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#1C1917]">Scheduled Lunch Break</span>
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-[#EDE3D4] text-[#BA954F]">
                        1:15 PM – 2:00 PM
                      </span>
                      {isLunchTimeNow && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#2D6A4F] text-white shadow-2xs animate-pulse">
                          Active Lunch Window
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#78716C] mt-0.5">
                      Audio chime rings at 1:15 PM and 2:00 PM. Timer never auto-switches to break.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-start-lunch-break"
                  onClick={() => handleStartBreak('LUNCH')}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#BA954F] hover:bg-[#A17B2F] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-2xs transition-all inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  <span>{isProcessing ? 'Starting...' : 'Start Lunch Break'}</span>
                </button>
              </div>

              {/* Action Buttons: Short Break & Clock Out */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* START REGULAR BREAK Button */}
                <button
                  type="button"
                  id="btn-start-break"
                  onClick={() => handleStartBreak('REGULAR')}
                  disabled={isProcessing}
                  className="btn-gold-secondary py-3.5 px-6 text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Coffee className="h-4 w-4 text-[#BA954F]" />
                  <span>{isProcessing ? 'Starting Break...' : 'Start Short Break'}</span>
                </button>

                {/* CLOCK OUT Button */}
                <button
                  type="button"
                  id="btn-clock-out"
                  onClick={handleInitiateClockOut}
                  disabled={isProcessing}
                  className="py-3.5 px-6 bg-[#9E2A2B] hover:bg-[#831F20] disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Square className="h-4 w-4 fill-current" />
                  <span>{isProcessing ? 'Clocking Out...' : 'Clock Out for Day'}</span>
                </button>
              </div>

              {/* 15-min focus alarm ticker */}
              <div className="flex justify-center">
                <Periodic15MinAlarm isClockedIn={isClockedIn} isOnBreak={isOnBreak} />
              </div>
            </div>
          )}
        </div>

        {/* Today's Breaks Breakdown (if any exist) */}
        {attendance?.breaks && attendance.breaks.length > 0 && (
          <div className="border-t border-[#EDE7DD] pt-4">
            <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Coffee className="h-3.5 w-3.5 text-[#BA954F]" />
              Today's Break Sessions ({attendance.breaks.length})
            </h4>
            <div className="divide-y divide-[#EDE7DD] border border-[#EDE7DD] rounded-xl overflow-hidden text-xs">
              {attendance.breaks.map((b, idx) => (
                <div key={b.id || idx} className="p-3 bg-[#FAF7F2]/40 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white text-[#BA954F] border border-[#EDE7DD] font-bold flex items-center justify-center text-[10px] shadow-2xs">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-neutral-800">
                      {formatShortTime(b.startTime)} — {b.endTime ? formatShortTime(b.endTime) : 'In progress'}
                    </span>
                    {b.breakType === 'LUNCH' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
                        🍱 Lunch Break
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-neutral-900">
                    {b.endTime ? `${b.durationMinutes} min` : 'Active'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clock In Reason Modal (Late or Early) */}
      {showClockInReasonModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-gold-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EDE7DD] space-y-4">
            <div className="flex items-center gap-3 text-[#BA954F]">
              <div className="p-2.5 bg-[#FAF4EC] rounded-xl">
                <Clock className="h-6 w-6 text-[#BA954F]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-neutral-900">{clockInReasonTitle}</h3>
                <p className="text-xs text-neutral-500 font-medium">Regular Office Start: {officeStartTime} AM</p>
              </div>
            </div>

            <div className="p-3 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl text-xs text-neutral-700 font-medium">
              Please enter a brief remark/reason for your {clockInReasonTitle.toLowerCase()} to submit to Admin.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                Reason / Remark <span className="text-[#9E2A2B]">*</span>
              </label>
              <textarea
                rows={3}
                value={clockInReason}
                onChange={(e) => setClockInReason(e.target.value)}
                placeholder="e.g., Heavy traffic delay, Metro delay, early client call..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] resize-none font-medium"
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
                className="btn-gold-secondary px-4 py-2 text-xs font-semibold"
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
              <div className="p-2.5 bg-[#FDF0ED] rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-neutral-900">Confirm Clock Out</h3>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Are you sure you want to clock out for today? This will finalize your shift record with{' '}
              <strong className="font-bold text-neutral-900">
                {Math.floor(effectiveWorkingSec / 3600)}h {Math.floor((effectiveWorkingSec % 3600) / 60)}m
              </strong>{' '}
              of effective working hours.
            </p>

            <div className="space-y-1.5 p-3.5 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl">
              <label htmlFor="normal-clockout-tomorrow-task" className="block text-xs font-bold text-neutral-800">
                Tomorrow's Planned Task / To-Do <span className="text-[#9E2A2B]">*</span>
              </label>
              <p className="text-[11px] text-neutral-500">
                Kal ka planned task daalna zaroori hai. Auto-reminder notification will be scheduled for tomorrow.
              </p>
              <input
                id="normal-clockout-tomorrow-task"
                type="text"
                required
                value={tomorrowTask}
                onChange={(e) => setTomorrowTask(e.target.value)}
                placeholder="e.g., Finalize floor plan CAD, review client comments..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE7DD]">
              <button
                type="button"
                onClick={() => {
                  setShowClockOutModal(false);
                  setTomorrowTask('');
                }}
                className="btn-gold-secondary px-4 py-2 text-xs font-semibold"
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
              <div className="p-2.5 bg-[#FDF6E9] rounded-xl">
                <AlertTriangle className="h-6 w-6 text-[#B45309]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-neutral-900">{clockOutReasonTitle}</h3>
                <p className="text-xs text-neutral-500 font-medium">Scheduled Shift End: {officeEndTime}</p>
              </div>
            </div>

            <div className="p-3 bg-[#FDF6E9] border border-[#F9E2AF] rounded-xl text-xs text-amber-900 font-medium">
              You are clocking out outside your regular 6:00 PM shift time. Please provide a reason.
            </div>

            <div className="space-y-1.5">
              <label htmlFor="early-clockout-reason-input" className="block text-xs font-semibold text-neutral-700">
                Reason for Clock Out <span className="text-[#9E2A2B]">*</span>
              </label>
              <textarea
                id="early-clockout-reason-input"
                rows={2}
                value={earlyReason}
                onChange={(e) => setEarlyReason(e.target.value)}
                placeholder="e.g., Doctor appointment, emergency personal work, approved early leave, overtime completed..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] resize-none font-medium"
                required
              />
            </div>

            <div className="space-y-1.5 p-3.5 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl">
              <label htmlFor="early-clockout-tomorrow-task" className="block text-xs font-bold text-neutral-800">
                Tomorrow's Planned Task / To-Do <span className="text-[#9E2A2B]">*</span>
              </label>
              <p className="text-[11px] text-neutral-500">
                Kal ka task daalna zaroori hai to complete exit. A reminder notification will be sent.
              </p>
              <input
                id="early-clockout-tomorrow-task"
                type="text"
                required
                value={tomorrowTask}
                onChange={(e) => setTomorrowTask(e.target.value)}
                placeholder="e.g., Complete material schedule and 3D elevation renders..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
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
                className="btn-gold-secondary px-4 py-2 text-xs font-semibold"
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

      {/* START OVERTIME MODAL */}
      {showStartOvertimeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl">
                <Moon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-neutral-900">
                  Start Overtime / WFH Session
                </h3>
                <p className="text-xs text-neutral-500">
                  Track extra evening or late night work from home
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  What are you working on? <span className="text-neutral-400 font-normal">(Optional note)</span>
                </label>
                <input
                  type="text"
                  value={overtimeReason}
                  onChange={(e) => setOvertimeReason(e.target.value)}
                  placeholder="e.g., Client revision, urgent 3D elevation renders..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
                />
              </div>

              {userTasks.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Link with Active Task <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={overtimeTaskId}
                    onChange={(e) => setOvertimeTaskId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
                  >
                    <option value="">-- No specific task (General Overtime) --</option>
                    {userTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EDE7DD]">
              <button
                type="button"
                onClick={() => {
                  setShowStartOvertimeModal(false);
                  setOvertimeReason('');
                  setOvertimeTaskId('');
                }}
                disabled={isProcessing}
                className="btn-gold-secondary px-4 py-2 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStartOvertime()}
                disabled={isProcessing}
                className="btn-gold-primary px-5 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>{isProcessing ? 'Starting...' : 'Start Session'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* END OVERTIME MODAL */}
      {showEndOvertimeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl">
                <StopCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-neutral-900">
                  End Overtime Session
                </h3>
                <p className="text-xs text-neutral-500">
                  Session duration: {formatHMS(activeOvertimeSec)}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1">
                Work Summary / Accomplished <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={overtimeReason}
                onChange={(e) => setOvertimeReason(e.target.value)}
                placeholder="e.g., Completed all pending floor plan revisions..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EDE7DD]">
              <button
                type="button"
                onClick={() => setShowEndOvertimeModal(false)}
                disabled={isProcessing}
                className="btn-gold-secondary px-4 py-2 text-xs font-semibold rounded-xl"
              >
                Keep Working
              </button>
              <button
                type="button"
                onClick={() => handleEndOvertime()}
                disabled={isProcessing}
                className="px-5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isProcessing ? 'Saving...' : 'Finish Overtime'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOG PAST / MANUAL OVERTIME MODAL */}
      {showManualOvertimeModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl">
                <PlusCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-base font-bold text-neutral-900">
                  Log Past Overtime Hours
                </h3>
                <p className="text-xs text-neutral-500">
                  Did you work offline or forget to start the live timer?
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Duration (in Minutes) <span className="text-[#9E2A2B]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={manualDuration}
                    onChange={(e) => setManualDuration(e.target.value)}
                    placeholder="e.g. 60 or 90"
                    className="w-32 px-3 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
                  />
                  <span className="text-xs text-neutral-500">
                    minutes ({Math.floor((Number(manualDuration) || 0) / 60)}h {(Number(manualDuration) || 0) % 60}m)
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Reason / Work Description <span className="text-[#9E2A2B]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="e.g., Client requested urgent revisions at 11 PM"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-white text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
                />
              </div>

              {userTasks.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Related Task <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={manualTaskId}
                    onChange={(e) => setManualTaskId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-white text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
                  >
                    <option value="">-- No specific task --</option>
                    {userTasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EDE7DD]">
              <button
                type="button"
                onClick={() => {
                  setShowManualOvertimeModal(false);
                  setManualReason('');
                  setManualTaskId('');
                }}
                disabled={isProcessing}
                className="btn-gold-secondary px-4 py-2 text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleManualOvertime()}
                disabled={isProcessing || !manualReason.trim() || !Number(manualDuration)}
                className="btn-gold-primary px-5 py-2 text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isProcessing ? 'Logging...' : 'Save Overtime'}</span>
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


