import React, { useState, useEffect } from 'react';
import { Attendance, Break } from '../../types';
import { api } from '../../services/api';
import { triggerLocalNotification, requestPushPermission } from '../../utils/pushNotifications';
import {
  CheckSquare,
  Plus,
  Coffee,
  LogOut,
  Bell,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';

interface QuickActionsCardProps {
  attendance: Attendance | null;
  onAttendanceChange: () => void;
  onOpenNewTask: () => void;
  onOpenNewTodo?: () => void;
  isAdmin?: boolean;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  attendance,
  onAttendanceChange,
  onOpenNewTask,
  onOpenNewTodo,
  isAdmin = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClockOutModal, setShowClockOutModal] = useState(false);
  const [showEarlyClockOutModal, setShowEarlyClockOutModal] = useState(false);
  const [showClockInReasonModal, setShowClockInReasonModal] = useState(false);
  const [clockInReasonTitle, setClockInReasonTitle] = useState('Late Arrival');
  const [clockInReason, setClockInReason] = useState('');
  const [earlyReason, setEarlyReason] = useState('');
  const [tomorrowTask, setTomorrowTask] = useState('');
  const [officeStartTime, setOfficeStartTime] = useState<string>('09:00');
  const [officeEndTime, setOfficeEndTime] = useState<string>('18:00');

  // Load scheduled start and end time
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
        // Fallback default
      }
    };
    loadScheduleInfo();
  }, []);

  const isClockedIn = !!attendance?.clockIn;
  const isClockedOut = !!attendance?.clockOut;
  const activeBreak = attendance?.breaks?.find((b: Break) => !b.endTime) || null;
  const isOnBreak = !!activeBreak;

  const formatShortTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const checkClockInStatus = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = officeStartTime.split(':').map((v) => parseInt(v, 10) || 0);
    const scheduledStartMins = startH * 60 + startM; // 09:00 = 540
    const lateThresholdMins = scheduledStartMins + 15; // 09:15
    const earlyThresholdMins = scheduledStartMins - 30; // 08:30

    if (currentMins > lateThresholdMins) {
      return { isSpecial: true, title: 'Late Arrival Reason' };
    }
    if (currentMins < earlyThresholdMins) {
      return { isSpecial: true, title: 'Early Arrival Reason' };
    }
    return { isSpecial: false, title: '' };
  };

  const checkIsEarly = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [endH, endM] = officeEndTime.split(':').map((v) => parseInt(v, 10) || 0);
    const scheduledEndMins = endH * 60 + endM;
    return currentMins < scheduledEndMins;
  };

  // Clock In Initiator
  const handleMarkPresent = async () => {
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
      showToast('Attendance recorded for today.');
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to record attendance.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Lunch Break Toggle
  const handleBreakToggle = async () => {
    if (!isClockedIn) {
      setActionError('Please record attendance before taking a break.');
      return;
    }
    if (isClockedOut) {
      setActionError('Shift has already been completed today.');
      return;
    }

    setIsProcessing(true);
    setActionError(null);
    try {
      if (isOnBreak) {
        await api.endBreak();
        showToast('Resumed from break.');
      } else {
        await api.startBreak();
        showToast('Lunch break recorded.');
      }
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update break status.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Clock Out
  const handleInitiateClockOut = () => {
    if (!isClockedIn) {
      setActionError('You have not marked attendance yet today.');
      return;
    }
    if (isClockedOut) {
      setActionError('You have already clocked out for today.');
      return;
    }

    setActionError(null);
    setEarlyReason('');
    setTomorrowTask('');
    if (checkIsEarly()) {
      setShowEarlyClockOutModal(true);
    } else {
      setShowClockOutModal(true);
    }
  };

  const handleConfirmClockOut = async () => {
    const trimmedTask = tomorrowTask.trim();
    if (!trimmedTask) {
      setActionError('Please specify your planned task for tomorrow before marking exit.');
      return;
    }
    setShowClockOutModal(false);
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockOut({ tomorrowTask: trimmedTask });
      setTomorrowTask('');
      showToast('Shift completed and tomorrow\'s task scheduled.');
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to clock out.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmEarlyClockOut = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = earlyReason.trim();
    const trimmedTask = tomorrowTask.trim();
    if (!trimmed) {
      setActionError('Please provide a reason before clocking out early.');
      return;
    }
    if (!trimmedTask) {
      setActionError('Please specify your planned task for tomorrow before marking exit.');
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockOut({
        earlyClockOutReason: trimmed,
        clockOutReason: trimmed,
        tomorrowTask: trimmedTask,
      });
      setShowEarlyClockOutModal(false);
      setEarlyReason('');
      setTomorrowTask('');
      showToast('Early exit recorded and tomorrow\'s task scheduled.');
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to clock out.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Test Notification
  const handleTestNotification = async () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission !== 'granted') {
          const granted = await requestPushPermission();
          if (!granted) {
            showToast('Browser notification permission was not granted.');
            return;
          }
        }
        triggerLocalNotification('White Ink Design Studio', {
          body: 'System Notification Test: Alerts are functioning properly.',
          icon: '/favicon.ico',
        });
      }
      showToast('Notification test triggered successfully.');
    } catch (e) {
      showToast('Notification test completed.');
    }
  };

  // Format today's date: "11 Sept 2026"
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DD] p-6 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header - Styled consistently with Dashboard Cards */}
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#EDE7DD]">
          <div className="p-2.5 bg-[#FAF4EC] text-[#BA954F] rounded-xl border border-[#EDE3D4] shadow-2xs shrink-0">
            <Zap className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div>
            <h3 className="text-base font-serif font-bold text-[#1C1917]">
              Quick Actions
            </h3>
            <p className="text-xs text-[#78716C] font-normal mt-0.5">
              {formattedDate}
            </p>
          </div>
        </div>

        {/* Toast message inside card */}
        {toastMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#FAF4EC] border border-[#EAE0D0] text-[#BA954F] text-xs font-medium flex items-center gap-2 animate-gold-fade-in shadow-2xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#BA954F]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Error alert inside card */}
        {actionError && (
          <div className="mb-3 p-2.5 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs font-medium flex items-center justify-between gap-2 animate-gold-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
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

        {/* Stacked Quick Action Buttons */}
        <div className="space-y-2.5">
          {/* 1. Mark Attendance / Present Button */}
          {!isClockedIn ? (
            <button
              type="button"
              id="btn-mark-attendance"
              onClick={handleMarkPresent}
              disabled={isProcessing}
              className="w-full py-3 px-3.5 rounded-xl bg-[#EAF5EC] hover:bg-[#DDF0E0] border border-[#CDE9D4] text-[#1E7444] text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer shadow-2xs hover:shadow-xs group"
            >
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <CheckSquare className="h-4 w-4 stroke-[2] text-[#1E7444]" />
              </span>
              <span className="flex-1 text-left">
                {isProcessing ? 'Recording Attendance...' : 'Mark Attendance'}
              </span>
            </button>
          ) : (
            <div className="w-full py-3 px-3.5 rounded-xl bg-[#EAF5EC] border border-[#CDE9D4] text-[#1E7444] text-xs font-semibold flex items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                  <CheckSquare className="h-4 w-4 stroke-[2] text-[#1E7444]" />
                </span>
                <span className="truncate">
                  {isClockedOut
                    ? `Present · Shift Ended (${formatShortTime(attendance.clockOut)})`
                    : `Present · Arrived ${formatShortTime(attendance.clockIn)}`}
                </span>
              </div>
            </div>
          )}

          {/* 2. Add Today's Task */}
          <button
            type="button"
            onClick={() => {
              if (isAdmin) {
                onOpenNewTask();
              } else if (onOpenNewTodo) {
                onOpenNewTodo();
              } else {
                onOpenNewTask();
              }
            }}
            className="w-full py-3 px-3.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#EDE7DD] hover:border-[#DFD5C6] text-xs font-semibold text-[#1C1917] transition-all flex items-center gap-2.5 cursor-pointer shadow-2xs hover:shadow-xs group"
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#78716C] group-hover:text-[#BA954F] transition-colors">
              <Plus className="h-4 w-4 stroke-[2]" />
            </span>
            <span className="flex-1 text-left">
              Add Today's Task
            </span>
          </button>

          {/* 3. Log Lunch Break */}
          <button
            type="button"
            onClick={handleBreakToggle}
            disabled={isProcessing || !isClockedIn || isClockedOut}
            className={`w-full py-3 px-3.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer shadow-2xs ${
              !isClockedIn || isClockedOut
                ? 'bg-[#FAF7F2]/60 border-[#EDE7DD] text-[#A8A29E] cursor-not-allowed opacity-60'
                : isOnBreak
                ? 'bg-[#FAF4EC] hover:bg-[#F5ECE0] border-[#E8DCC8] text-[#946B2D]'
                : 'bg-white hover:bg-[#FAF7F2] border-[#EDE7DD] hover:border-[#DFD5C6] text-[#1C1917] hover:shadow-xs'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              <Coffee className={`h-4 w-4 stroke-[1.75] ${
                !isClockedIn || isClockedOut ? 'text-[#A8A29E]' : isOnBreak ? 'text-[#946B2D]' : 'text-[#78716C]'
              }`} />
            </span>
            <span className={`flex-1 text-left ${
              !isClockedIn || isClockedOut
                ? 'text-[#A8A29E]'
                : isOnBreak
                ? 'text-[#946B2D]'
                : 'text-[#1C1917]'
            }`}>
              {isOnBreak ? 'End Lunch Break' : 'Log Lunch Break'}
            </span>
          </button>

          {/* 4. Mark Exit */}
          <button
            type="button"
            onClick={handleInitiateClockOut}
            disabled={isProcessing || !isClockedIn || isClockedOut}
            className={`w-full py-3 px-3.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-2.5 cursor-pointer shadow-2xs ${
              !isClockedIn || isClockedOut
                ? 'bg-[#FAF7F2]/60 border-[#EDE7DD] text-[#A8A29E] cursor-not-allowed opacity-60'
                : 'bg-white hover:bg-[#FAF7F2] border-[#EDE7DD] hover:border-[#DFD5C6] text-[#1C1917] hover:shadow-xs'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              <LogOut className={`h-4 w-4 stroke-[1.75] ${
                !isClockedIn || isClockedOut ? 'text-[#A8A29E]' : 'text-[#78716C]'
              }`} />
            </span>
            <span className={`flex-1 text-left ${
              !isClockedIn || isClockedOut ? 'text-[#A8A29E]' : 'text-[#1C1917]'
            }`}>
              Mark Exit
            </span>
          </button>

          {/* 5. Test Notification */}
          <button
            type="button"
            onClick={handleTestNotification}
            className="w-full py-3 px-3.5 rounded-xl bg-white hover:bg-[#FAF7F2] border border-[#EDE7DD] hover:border-[#DFD5C6] text-xs font-semibold text-[#1C1917] transition-all flex items-center gap-2.5 cursor-pointer shadow-2xs hover:shadow-xs group"
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0 text-[#78716C] group-hover:text-[#BA954F] transition-colors">
              <Bell className="h-4 w-4 stroke-[1.75]" />
            </span>
            <span className="flex-1 text-left">
              Test Notification
            </span>
          </button>
        </div>
      </div>

      {/* Normal Clock Out Confirmation Modal */}
      {showClockOutModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EDE7DD] space-y-4">
            <div className="flex items-center gap-3 text-[#9E2A2B]">
              <div className="p-2.5 bg-[#FDF0ED] rounded-xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-neutral-900">
                Confirm Mark Exit
              </h3>
            </div>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Are you sure you want to mark your exit for today? This will finalize your shift record for the studio.
            </p>

            <div className="space-y-1.5 p-3.5 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl">
              <label htmlFor="dashboard-normal-tomorrow-task" className="block text-xs font-bold text-neutral-800">
                Tomorrow's Planned Task / To-Do <span className="text-[#9E2A2B]">*</span>
              </label>
              <p className="text-[11px] text-neutral-500">
                Kal ka task daalna zaroori hai. A reminder notification will be scheduled for tomorrow.
              </p>
              <input
                id="dashboard-normal-tomorrow-task"
                type="text"
                required
                value={tomorrowTask}
                onChange={(e) => setTomorrowTask(e.target.value)}
                placeholder="e.g., Finalize drawings, client presentation..."
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
                onClick={handleConfirmClockOut}
                disabled={isProcessing || !tomorrowTask.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9E2A2B] hover:bg-[#831F20] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer"
              >
                {isProcessing ? 'Processing...' : 'Yes, Mark Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Early Clock Out Reason Modal */}
      {showEarlyClockOutModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EDE7DD] space-y-4">
            <div className="flex items-center gap-3 text-[#B45309]">
              <div className="p-2.5 bg-[#FDF6E9] rounded-xl">
                <AlertTriangle className="h-6 w-6 text-[#B45309]" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-neutral-900">
                  Early Exit Reason
                </h3>
                <p className="text-xs text-neutral-500 font-medium">
                  Scheduled Shift End: {officeEndTime}
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#FDF6E9] border border-[#F9E2AF] rounded-xl text-xs text-amber-900 font-medium">
              You are clocking out before your scheduled shift end ({officeEndTime}). Please provide a reason.
            </div>

            <div className="space-y-1.5">
              <label htmlFor="dashboard-early-exit-reason" className="block text-xs font-semibold text-neutral-700">
                Reason for Early Exit <span className="text-[#9E2A2B]">*</span>
              </label>
              <textarea
                id="dashboard-early-exit-reason"
                rows={2}
                value={earlyReason}
                onChange={(e) => setEarlyReason(e.target.value)}
                placeholder="e.g., Doctor appointment, approved half-day, emergency personal work..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] resize-none font-medium"
                required
              />
            </div>

            <div className="space-y-1.5 p-3.5 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl">
              <label htmlFor="dashboard-early-tomorrow-task" className="block text-xs font-bold text-neutral-800">
                Tomorrow's Planned Task / To-Do <span className="text-[#9E2A2B]">*</span>
              </label>
              <p className="text-[11px] text-neutral-500">
                Kal ka task daalna zaroori hai. A reminder notification will be scheduled for tomorrow.
              </p>
              <input
                id="dashboard-early-tomorrow-task"
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
                onClick={() => handleConfirmEarlyClockOut()}
                disabled={isProcessing || !earlyReason.trim() || !tomorrowTask.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9E2A2B] hover:bg-[#831F20] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isProcessing ? 'Processing...' : 'Confirm Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

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
              Please provide a remark for your {clockInReasonTitle.toLowerCase()} for studio records.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                Reason / Remark <span className="text-[#9E2A2B]">*</span>
              </label>
              <textarea
                rows={3}
                value={clockInReason}
                onChange={(e) => setClockInReason(e.target.value)}
                placeholder="e.g., Transit delay, medical appointment, morning client call..."
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
                {isProcessing ? 'Recording...' : 'Submit & Clock In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

