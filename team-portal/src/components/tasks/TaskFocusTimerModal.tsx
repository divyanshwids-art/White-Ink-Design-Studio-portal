import React, { useState, useEffect } from 'react';
import { Task, PersonalTodo } from '../../types';
import { useTimer } from '../../context/TimerContext';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Bell,
  BellOff,
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react';

interface TaskFocusTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | PersonalTodo | null;
  onTimeLogged?: () => void;
}

export const TaskFocusTimerModal: React.FC<TaskFocusTimerModalProps> = ({
  isOpen,
  onClose,
  task,
  onTimeLogged,
}) => {
  const {
    activeFocusTask,
    focusTotalSeconds,
    focusSecondsRemaining,
    isFocusTimerActive,
    isFocusAlarmRinging,
    focusNotes,
    startFocusTimer,
    pauseFocusTimer,
    resumeFocusTimer,
    resetFocusTimer,
    setFocusMinutes,
    setFocusNotes,
    stopFocusAlarm,
    logAndCloseFocusTimer,
  } = useTimer();

  const [customInput, setCustomInput] = useState<string>('');
  const [isLogging, setIsLogging] = useState<boolean>(false);

  // When modal is opened with a specific task, if there's no active session or it's a different task, start it
  useEffect(() => {
    if (isOpen && task) {
      if (!activeFocusTask || activeFocusTask.id !== task.id) {
        startFocusTimer(task, 25);
      }
    }
  }, [isOpen, task, activeFocusTask, startFocusTimer]);

  if (!isOpen || !task) return null;

  const handleSelectPreset = (mins: number) => {
    setFocusMinutes(mins);
    setCustomInput('');
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customInput, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 240) {
      handleSelectPreset(parsed);
    }
  };

  const handleSaveAndLog = async () => {
    setIsLogging(true);
    try {
      await logAndCloseFocusTimer();
      if (onTimeLogged) onTimeLogged();
      onClose();
    } catch (err) {
      onClose();
    } finally {
      setIsLogging(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent =
    focusTotalSeconds > 0
      ? ((focusTotalSeconds - focusSecondsRemaining) / focusTotalSeconds) * 100
      : 0;

  const isTaskObj = 'projectId' in task;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-gold-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#EDE7DD] shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div
          className={`p-5 flex items-center justify-between border-b transition-colors ${
            isFocusAlarmRinging
              ? 'bg-[#FDF2F0] border-[#F5D5D0] animate-pulse'
              : 'bg-[#FAF7F2] border-[#EDE7DD]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isFocusAlarmRinging
                  ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                  : 'bg-[#FAF4EC] text-[#BA954F] border-[#EDE3D4]'
              }`}
            >
              {isFocusAlarmRinging ? (
                <Bell className="h-5 w-5 animate-bounce" />
              ) : (
                <Timer className="h-5 w-5 stroke-[2]" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1917]">
                {isFocusAlarmRinging ? '⏰ Focus Time Expired!' : 'Task Focus Timer'}
              </h2>
              <p className="text-xs text-[#78716C] truncate max-w-[280px]">{task.title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Preset Buttons */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#78716C]">Session Target:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[15, 25, 45, 60].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleSelectPreset(mins)}
                  disabled={isFocusTimerActive}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    focusTotalSeconds === mins * 60 && !customInput
                      ? 'bg-[#BA954F] text-white shadow-xs'
                      : 'bg-[#FAF7F2] text-[#57534E] hover:bg-[#F5EFE6] border border-[#EDE7DD]'
                  } disabled:opacity-50`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>

          {/* Big Circular / Timer Display */}
          <div
            className={`relative py-8 px-6 rounded-2xl border text-center transition-all ${
              isFocusAlarmRinging
                ? 'bg-[#FDF2F0] border-[#B91C1C] shadow-lg shadow-[#B91C1C]/10'
                : isFocusTimerActive
                ? 'bg-[#FAF4EC]/60 border-[#BA954F]/40 shadow-md'
                : 'bg-[#FAF7F2] border-[#EDE7DD]'
            }`}
          >
            {/* Alarm Sounding Banner */}
            {isFocusAlarmRinging && (
              <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#B91C1C] text-white text-xs font-bold animate-bounce shadow-md">
                <Volume2 className="h-4 w-4" />
                Alarm Ringing! Click Stop to dismiss
              </div>
            )}

            <div
              className={`font-mono text-5xl sm:text-6xl font-extrabold tracking-tight ${
                isFocusAlarmRinging
                  ? 'text-[#B91C1C]'
                  : isFocusTimerActive
                  ? 'text-[#1C1917]'
                  : 'text-[#443B30]'
              }`}
            >
              {formatTime(focusSecondsRemaining)}
            </div>

            <p className="text-xs text-[#78716C] mt-2 font-medium">
              {isFocusTimerActive
                ? '⚡ Focus in progress · Timer continues even when switching tabs!'
                : focusSecondsRemaining === 0
                ? 'Goal completed!'
                : 'Ready to start'}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-[#EDE7DD] h-2 rounded-full mt-5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isFocusAlarmRinging ? 'bg-[#B91C1C]' : 'bg-[#BA954F]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3">
            {isFocusAlarmRinging ? (
              <button
                type="button"
                onClick={stopFocusAlarm}
                className="px-6 py-3 rounded-2xl bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer animate-pulse"
              >
                <BellOff className="h-5 w-5" />
                Stop Alarm
              </button>
            ) : !isFocusTimerActive ? (
              <button
                type="button"
                onClick={resumeFocusTimer}
                className="px-6 py-3 rounded-2xl bg-[#BA954F] hover:bg-[#A17B2F] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer btn-hover-lift"
              >
                <Play className="h-5 w-5 fill-current" />
                {focusSecondsRemaining < focusTotalSeconds && focusSecondsRemaining > 0
                  ? 'Resume'
                  : 'Start Focus'}
              </button>
            ) : (
              <button
                type="button"
                onClick={pauseFocusTimer}
                className="px-6 py-3 rounded-2xl bg-[#443B30] hover:bg-[#2C241B] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Pause className="h-5 w-5 fill-current" />
                Pause
              </button>
            )}

            <button
              type="button"
              onClick={() => resetFocusTimer()}
              className="p-3 rounded-2xl bg-white hover:bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917] border border-[#EDE7DD] transition-colors cursor-pointer"
              title="Reset Timer"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>

          {/* Notes Input for Time Log */}
          {isTaskObj && (
            <div className="space-y-2 pt-2 border-t border-[#EDE7DD]">
              <label className="text-xs font-semibold text-[#443B30]">
                Work Session Notes (Optional):
              </label>
              <input
                type="text"
                value={focusNotes}
                onChange={(e) => setFocusNotes(e.target.value)}
                placeholder="e.g., Designed responsive layout..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
              />
            </div>
          )}

          {/* Footer Save / Log Time */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-[#78716C]">
              Elapsed:{' '}
              {Math.max(1, Math.round((focusTotalSeconds - focusSecondsRemaining) / 60))} min
            </span>
            <button
              type="button"
              onClick={handleSaveAndLog}
              disabled={isLogging}
              className="px-4 py-2 text-xs font-bold text-white bg-[#2D6A4F] hover:bg-[#22543D] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isLogging ? 'Logging...' : 'Save & Log Time'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
