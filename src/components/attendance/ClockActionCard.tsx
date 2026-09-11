import React, { useState, useEffect } from 'react';
import { Attendance, Break } from '../../types';
import { api } from '../../services/api';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
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
  const [earlyReason, setEarlyReason] = useState('');
  const [officeEndTime, setOfficeEndTime] = useState<string>('18:30');

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch configured office end time and employee schedule override
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
        // Default to 18:30 if fetch fails
      }
    };
    loadScheduleInfo();
  }, []);

  const isClockedIn = !!attendance?.clockIn;
  const isClockedOut = !!attendance?.clockOut;
  const activeBreak = attendance?.breaks?.find((b: Break) => !b.endTime) || null;
  const isOnBreak = !!activeBreak;
  const isCurrentlyWorking = isClockedIn && !isClockedOut && !isOnBreak;

  // Calculate live elapsed times
  const calculateLiveTimes = () => {
    if (!attendance || !attendance.clockIn) {
      return { totalWorkingSec: 0, totalBreakSec: 0, effectiveWorkingSec: 0 };
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

  const checkIsEarly = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [endH, endM] = officeEndTime.split(':').map((v) => parseInt(v, 10) || 0);
    const scheduledEndMins = endH * 60 + endM;
    return currentMins < scheduledEndMins;
  };

  const handleInitiateClockOut = () => {
    setActionError(null);
    setEarlyReason('');
    if (checkIsEarly()) {
      setShowEarlyClockOutModal(true);
    } else {
      setShowClockOutModal(true);
    }
  };

  const handleClockIn = async () => {
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockIn();
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to clock in.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClockOut = async () => {
    setShowClockOutModal(false);
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockOut();
      onAttendanceChange();
    } catch (err: any) {
      setActionError(err.message || 'Failed to clock out.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEarlyClockOut = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedReason = earlyReason.trim();
    if (!trimmedReason) {
      setActionError('Please provide a reason before clocking out early.');
      return;
    }
    setIsProcessing(true);
    setActionError(null);
    try {
      await api.clockOut({ earlyClockOutReason: trimmedReason });
      setShowEarlyClockOutModal(false);
      setEarlyReason('');
      onAttendanceChange();
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
                <Coffee className="h-3.5 w-3.5 text-[#B45309]" />
                On Break (Taking a breather)
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Working Time */}
          <div className="p-4 rounded-xl border border-[#EDE7DD] bg-[#FAF7F2] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-2">
              <span>Total Working Duration</span>
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

          {/* Effective Working Time */}
          <div className="p-4 rounded-xl border border-[#EDE7DD] bg-white flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-2">
              <span>Effective Working Duration</span>
              <Hourglass className="h-4 w-4 text-[#BA954F]" />
            </div>
            <div>
              <div className="text-2xl font-bold font-mono tracking-tight text-neutral-900">
                {isClockedIn ? formatHMS(effectiveWorkingSec) : '00:00:00'}
              </div>
              <div className="text-[11px] text-neutral-500 font-medium mt-1">
                Total duration minus break time
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
                onClick={handleClockIn}
                disabled={isProcessing}
                className="btn-gold-primary px-8 py-3.5 text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-3 cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{isProcessing ? 'Clocking In...' : 'Clock In Now'}</span>
              </button>
            </div>
          ) : isClockedOut ? (
            <div className="bg-[#FAF7F2] border border-[#EDE7DD] rounded-2xl p-6 sm:p-8 text-center space-y-2">
              <div className="inline-flex p-3 bg-white text-[#2D6A4F] border border-[#D1E7D8] rounded-full mb-1 shadow-xs">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-neutral-900">
                You have completed your shift for today!
              </h3>
              <p className="text-xs text-neutral-600 leading-relaxed max-w-md mx-auto">
                Your attendance record for today has been stored. You logged{' '}
                <strong className="font-bold text-neutral-900">
                  {Math.floor(effectiveWorkingSec / 3600)}h {Math.floor((effectiveWorkingSec % 3600) / 60)}m
                </strong>{' '}
                of effective working time with status{' '}
                <strong className="font-bold text-neutral-900">{attendance.status}</strong>.
              </p>
              {attendance.earlyClockOutReason && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 text-left max-w-md mx-auto">
                  <div className="font-semibold mb-0.5 flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="h-3.5 w-3.5" /> Early Clock-Out Reason:
                  </div>
                  <div className="italic text-amber-950">&ldquo;{attendance.earlyClockOutReason}&rdquo;</div>
                </div>
              )}
            </div>
          ) : isOnBreak ? (
            <div className="bg-[#FAF7F2] border border-[#EDE7DD] rounded-2xl p-6 sm:p-8 text-center space-y-4">
              <div>
                <div className="inline-flex p-3 bg-white text-[#BA954F] border border-[#EDE7DD] rounded-full mb-1 shadow-xs animate-bounce">
                  <Coffee className="h-6 w-6" />
                </div>
                <h3 className="font-serif text-lg font-bold text-neutral-900">Break in Progress</h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Started at {formatShortTime(activeBreak?.startTime)}. Click the button below when you are ready to resume work.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* START BREAK Button */}
              <button
                type="button"
                id="btn-start-break"
                onClick={handleStartBreak}
                disabled={isProcessing}
                className="btn-gold-secondary py-3.5 px-6 text-sm font-semibold rounded-xl inline-flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <Coffee className="h-4 w-4 text-[#BA954F]" />
                <span>{isProcessing ? 'Starting Break...' : 'Start Studio Break'}</span>
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
                onClick={handleClockOut}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9E2A2B] hover:bg-[#831F20] disabled:opacity-50 rounded-xl transition-colors cursor-pointer"
              >
                {isProcessing ? 'Processing...' : 'Yes, Clock Out'}
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
                <h3 className="font-serif text-lg font-bold text-neutral-900">Early Clock-Out</h3>
                <p className="text-xs text-neutral-500 font-medium">Scheduled Shift End: {officeEndTime}</p>
              </div>
            </div>

            <div className="p-3 bg-[#FDF6E9] border border-[#F9E2AF] rounded-xl text-xs text-amber-900 font-medium">
              You are clocking out before your regular working time. Please provide a reason.
            </div>

            <div className="space-y-1.5">
              <label htmlFor="early-clockout-reason-input" className="block text-xs font-semibold text-neutral-700">
                Reason for Early Clock Out <span className="text-[#9E2A2B]">*</span>
              </label>
              <textarea
                id="early-clockout-reason-input"
                rows={3}
                value={earlyReason}
                onChange={(e) => setEarlyReason(e.target.value)}
                placeholder="e.g., Doctor appointment, emergency personal work, approved half-day..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] resize-none font-medium"
                required
              />
              <div className="text-[11px] text-neutral-400 text-right">
                {earlyReason.trim().length === 0 ? 'Reason required to proceed' : `${earlyReason.trim().length} characters entered`}
              </div>
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
                id="btn-confirm-early-clockout"
                onClick={() => handleEarlyClockOut()}
                disabled={isProcessing || !earlyReason.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#9E2A2B] hover:bg-[#831F20] disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                {isProcessing ? 'Processing...' : 'Confirm Clock Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

