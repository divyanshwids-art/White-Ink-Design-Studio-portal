import React, { useState, useEffect } from 'react';
import { Attendance, Break } from '../../types';
import { api } from '../../services/api';
import { triggerLocalNotification, requestPushPermission } from '../../utils/pushNotifications';
import {
  CheckSquare,
  Plus,
  Coffee,
  DoorOpen,
  Bell,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Sparkles,
  Clock,
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
  const [earlyReason, setEarlyReason] = useState('');
  const [officeEndTime, setOfficeEndTime] = useState<string>('18:30');

  // Load scheduled end time
  useEffect(() => {
    const loadScheduleInfo = async () => {
      try {
        const [settingsRes, overrideRes] = await Promise.allSettled([
          api.getSettings(),
          api.getMyScheduleOverride(),
        ]);
        let end = '18:30';
        if (settingsRes.status === 'fulfilled' && settingsRes.value?.officeEndTime) {
          end = settingsRes.value.officeEndTime;
        }
        if (overrideRes.status === 'fulfilled' && overrideRes.value?.override?.customEndTime) {
          end = overrideRes.value.override.customEndTime;
        }
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

  const checkIsEarly = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [endH, endM] = officeEndTime.split(':').map((v) => parseInt(v, 10) || 0);
    const scheduledEndMins = endH * 60 + endM;
    return currentMins < scheduledEndMins;
  };

  // Clock In
  const handleMarkPresent = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockIn();
      showToast('Marked Present! Attendance recorded for today. ✅');
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to mark present.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Lunch Break Toggle
  const handleBreakToggle = async () => {
    if (!isClockedIn) {
      setActionError('Please mark present first before taking a break.');
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
        showToast('Resumed from break! Welcome back. ☕');
      } else {
        await api.startBreak();
        showToast('Lunch break started. Enjoy your break! ☕');
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
    if (checkIsEarly()) {
      setShowEarlyClockOutModal(true);
    } else {
      setShowClockOutModal(true);
    }
  };

  const handleConfirmClockOut = async () => {
    setShowClockOutModal(false);
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockOut();
      showToast('Shift completed and clocked out successfully! 🚪');
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
    if (!trimmed) {
      setActionError('Please provide a reason before clocking out early.');
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockOut({ earlyClockOutReason: trimmed });
      setShowEarlyClockOutModal(false);
      setEarlyReason('');
      showToast('Early exit recorded successfully. Have a good day! 🚪');
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
            showToast('🔔 Browser notification permission was denied or dismissed.');
            return;
          }
        }
        triggerLocalNotification('White Ink Design Studio', {
          body: '🔔 Test Notification: Your studio alerts are working perfectly!',
          icon: '/favicon.ico',
        });
      }
      showToast('🔔 Notification test triggered successfully!');
    } catch (e) {
      showToast('🔔 Notification test completed.');
    }
  };

  // Format today's date matching the reference image: "11 Sept 2026"
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DD] p-6 shadow-xs relative">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-2xl font-serif font-bold text-[#1C1917] tracking-tight">
          Quick Actions
        </h2>
        <p className="text-xs text-[#78716C] font-medium mt-0.5">
          {formattedDate}
        </p>
      </div>

      {/* Toast message inside card */}
      {toastMessage && (
        <div className="mb-4 p-3 rounded-xl bg-[#FAF4EC] border border-[#EAE0D0] text-[#BA954F] text-xs font-semibold flex items-center gap-2 animate-gold-fade-in shadow-2xs">
          <Sparkles className="h-4 w-4 shrink-0 text-[#BA954F]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Error alert inside card */}
      {actionError && (
        <div className="mb-4 p-3 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs font-medium flex items-center justify-between gap-2 animate-gold-fade-in">
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
      <div className="space-y-3">
        {/* 1. Present / Mark Attendance Button */}
        {!isClockedIn ? (
          <button
            type="button"
            id="btn-mark-attendance"
            onClick={handleMarkPresent}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#EAF5EC] hover:bg-[#DDF0E0] border border-[#CDE9D4] text-[#1E7444] font-semibold text-sm transition-all duration-200 flex items-center gap-3 cursor-pointer shadow-2xs hover:shadow-xs group"
          >
            <div className="w-6 h-6 rounded-md bg-[#D2ECD9] text-[#1E7444] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CheckSquare className="h-4 w-4 stroke-[2.2]" />
            </div>
            <span className="flex-1 text-left">
              {isProcessing ? 'Recording Attendance...' : 'Mark Attendance'}
            </span>
            <span className="text-[11px] font-normal text-[#2D6A4F]/80">
              Tap to clock in
            </span>
          </button>
        ) : (
          <div className="w-full py-3.5 px-4 rounded-2xl bg-[#EAF5EC] border border-[#CDE9D4] text-[#1E7444] font-semibold text-sm flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#227547] text-white flex items-center justify-center shrink-0">
                <CheckSquare className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
              <span className="truncate">
                {isClockedOut
                  ? `Present · Shift Ended (${formatShortTime(attendance.clockOut)})`
                  : `Present · Arrived ${formatShortTime(attendance.clockIn)}`}
              </span>
            </div>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#D7EFE0] text-[#196639] font-bold shrink-0">
              {isClockedOut ? 'Done' : 'Active'}
            </span>
          </div>
        )}

        {/* 2. + Add Today's Task */}
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
          className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-[#FAF7F2] border border-[#EDE7DD] hover:border-[#DFD5C6] text-[#1C1917] font-medium text-sm transition-all duration-200 flex items-center gap-3 cursor-pointer shadow-2xs hover:shadow-xs group"
        >
          <span className="text-base font-bold text-[#78716C] group-hover:text-[#BA954F] transition-colors leading-none w-5 text-center">
            +
          </span>
          <span className="flex-1 text-left font-semibold text-[#292524]">
            Add Today's Task
          </span>
        </button>

        {/* 3. Log Lunch Break */}
        <button
          type="button"
          onClick={handleBreakToggle}
          disabled={isProcessing || !isClockedIn || isClockedOut}
          className={`w-full py-3.5 px-4 rounded-2xl border text-sm font-semibold transition-all duration-200 flex items-center gap-3 cursor-pointer shadow-2xs ${
            !isClockedIn || isClockedOut
              ? 'bg-[#FAF7F2]/60 border-[#EDE7DD] text-[#A8A29E] cursor-not-allowed opacity-60'
              : isOnBreak
              ? 'bg-[#FAF4EC] hover:bg-[#F5ECE0] border-[#E8DCC8] text-[#946B2D] animate-pulse'
              : 'bg-white hover:bg-[#FAF7F2] border-[#EDE7DD] hover:border-[#DFD5C6] text-[#292524] hover:shadow-xs'
          }`}
        >
          <span className="text-base leading-none w-5 text-center">
            ☕
          </span>
          <span className="flex-1 text-left">
            {isOnBreak ? 'End Lunch Break & Resume' : 'Log Lunch Break'}
          </span>
          {isOnBreak && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EAE0D0] text-[#7A5620] font-bold">
              On Break
            </span>
          )}
        </button>

        {/* 4. Mark Exit */}
        <button
          type="button"
          onClick={handleInitiateClockOut}
          disabled={isProcessing || !isClockedIn || isClockedOut}
          className={`w-full py-3.5 px-4 rounded-2xl border text-sm font-semibold transition-all duration-200 flex items-center gap-3 cursor-pointer shadow-2xs ${
            !isClockedIn || isClockedOut
              ? 'bg-[#FAF7F2]/60 border-[#EDE7DD] text-[#A8A29E] cursor-not-allowed opacity-60'
              : 'bg-white hover:bg-[#FAF7F2] border-[#EDE7DD] hover:border-[#DFD5C6] text-[#292524] hover:shadow-xs'
          }`}
        >
          <span className="text-base leading-none w-5 text-center">
            🚪
          </span>
          <span className="flex-1 text-left">
            Mark Exit
          </span>
          {isClockedOut && (
            <span className="text-[11px] text-[#78716C] font-normal">
              Clocked Out
            </span>
          )}
        </button>

        {/* 5. Test Notification */}
        <button
          type="button"
          onClick={handleTestNotification}
          className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-[#FAF7F2] border border-[#EDE7DD] hover:border-[#DFD5C6] text-[#1C1917] font-semibold text-sm transition-all duration-200 flex items-center gap-3 cursor-pointer shadow-2xs hover:shadow-xs"
        >
          <span className="text-base leading-none w-5 text-center">
            🔔
          </span>
          <span className="flex-1 text-left text-[#292524]">
            Test Notification
          </span>
        </button>
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
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE7DD]">
              <button
                type="button"
                onClick={() => setShowClockOutModal(false)}
                className="btn-gold-secondary px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClockOut}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9E2A2B] hover:bg-[#831F20] disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
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
                rows={3}
                value={earlyReason}
                onChange={(e) => setEarlyReason(e.target.value)}
                placeholder="e.g., Doctor appointment, approved half-day, emergency personal work..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] resize-none font-medium"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE7DD]">
              <button
                type="button"
                onClick={() => {
                  setShowEarlyClockOutModal(false);
                  setEarlyReason('');
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
                disabled={isProcessing || !earlyReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9E2A2B] hover:bg-[#831F20] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isProcessing ? 'Processing...' : 'Confirm Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
