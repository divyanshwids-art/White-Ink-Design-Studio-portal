import React, { useState, useEffect, useRef } from 'react';
import { Task, PersonalTodo } from '../../types';
import { api } from '../../services/api';
import { soundAlerts } from '../../utils/soundAlerts';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Bell,
  BellOff,
  CheckCircle2,
  X,
  Zap,
  Clock,
  Sparkles,
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
  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [customInput, setCustomInput] = useState<string>('');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isAlarmRinging, setIsAlarmRinging] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [hasCompleted, setHasCompleted] = useState<boolean>(false);

  const timerRef = useRef<any>(null);

  // Initialize or reset when task or selected minutes change
  useEffect(() => {
    if (isOpen) {
      const initialSec = selectedMinutes * 60;
      setSecondsRemaining(initialSec);
      setTotalSeconds(initialSec);
      setIsActive(false);
      setIsAlarmRinging(false);
      setHasCompleted(false);
      soundAlerts.stopAlarm();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      soundAlerts.stopAlarm();
    };
  }, [isOpen, selectedMinutes, task?.id]);

  // Countdown timer ticker
  useEffect(() => {
    if (isActive && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsActive(false);
            setIsAlarmRinging(true);
            setHasCompleted(true);
            soundAlerts.startContinuousAlarm('timer');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, secondsRemaining]);

  if (!isOpen || !task) return null;

  const handleStart = () => {
    // Resume audio context on user interaction
    soundAlerts.playBeep(440, 'sine', 0.1, 0.1);
    setIsActive(true);
    setIsAlarmRinging(false);
    soundAlerts.stopAlarm();
  };

  const handlePause = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsAlarmRinging(false);
    setHasCompleted(false);
    soundAlerts.stopAlarm();
    const initialSec = selectedMinutes * 60;
    setSecondsRemaining(initialSec);
    setTotalSeconds(initialSec);
  };

  const handleSelectPreset = (mins: number) => {
    setSelectedMinutes(mins);
    setCustomInput('');
    setIsActive(false);
    setIsAlarmRinging(false);
    setHasCompleted(false);
    soundAlerts.stopAlarm();
    const s = mins * 60;
    setSecondsRemaining(s);
    setTotalSeconds(s);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customInput, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 240) {
      handleSelectPreset(parsed);
    }
  };

  const handleStopAlarmOnly = () => {
    setIsAlarmRinging(false);
    soundAlerts.stopAlarm();
  };

  const handleLogTimeAndClose = async () => {
    handleStopAlarmOnly();
    setIsLogging(true);
    try {
      const elapsedSeconds = totalSeconds - secondsRemaining;
      const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      
      // If it's a regular Task, log to task API
      if ('projectId' in task) {
        await api.logTaskTime(task.id, {
          durationMinutes: elapsedMinutes,
          notes: notes.trim() || `Focus Session (${selectedMinutes} min target)`,
        });
      }

      if (onTimeLogged) onTimeLogged();
      onClose();
    } catch (err) {
      console.error('Failed to log focus timer time:', err);
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

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;
  const isTaskObj = 'projectId' in task;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-gold-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#EDE7DD] shadow-2xl overflow-hidden">
        
        {/* Top Header */}
        <div className={`p-5 flex items-center justify-between border-b transition-colors ${
          isAlarmRinging ? 'bg-[#FDF2F0] border-[#F5D5D0] animate-pulse' : 'bg-[#FAF7F2] border-[#EDE7DD]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isAlarmRinging ? 'bg-[#B91C1C] text-white border-[#B91C1C]' : 'bg-[#FAF4EC] text-[#BA954F] border-[#EDE3D4]'
            }`}>
              {isAlarmRinging ? <Bell className="h-5 w-5 animate-bounce" /> : <Timer className="h-5 w-5 stroke-[2]" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1917]">
                {isAlarmRinging ? '⏰ Focus Time Expired!' : 'Task Focus Timer'}
              </h2>
              <p className="text-xs text-[#78716C] truncate max-w-[280px]">
                {task.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              handleStopAlarmOnly();
              onClose();
            }}
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
                  disabled={isActive}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    selectedMinutes === mins && !customInput
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
          <div className={`relative py-8 px-6 rounded-2xl border text-center transition-all ${
            isAlarmRinging
              ? 'bg-[#FDF2F0] border-[#B91C1C] shadow-lg shadow-[#B91C1C]/10'
              : isActive
              ? 'bg-[#FAF4EC]/60 border-[#BA954F]/40 shadow-md'
              : 'bg-[#FAF7F2] border-[#EDE7DD]'
          }`}>
            
            {/* Alarm Sounding Banner */}
            {isAlarmRinging && (
              <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#B91C1C] text-white text-xs font-bold animate-bounce shadow-md">
                <Volume2 className="h-4 w-4" />
                Alarm Ringing! Click Stop to dismiss
              </div>
            )}

            <div className={`font-mono text-5xl sm:text-6xl font-extrabold tracking-tight ${
              isAlarmRinging ? 'text-[#B91C1C]' : isActive ? 'text-[#1C1917]' : 'text-[#443B30]'
            }`}>
              {formatTime(secondsRemaining)}
            </div>

            <p className="text-xs text-[#78716C] mt-2 font-medium">
              {isActive
                ? '⚡ Focus in progress · Stay on task!'
                : secondsRemaining === 0
                ? 'Goal completed!'
                : 'Ready to start'}
            </p>

            {/* Progress Bar */}
            <div className="w-full bg-[#EDE7DD] h-2 rounded-full mt-5 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isAlarmRinging ? 'bg-[#B91C1C]' : 'bg-[#BA954F]'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3">
            {isAlarmRinging ? (
              <button
                type="button"
                onClick={handleStopAlarmOnly}
                className="px-6 py-3 rounded-2xl bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer animate-pulse"
              >
                <BellOff className="h-5 w-5" />
                Stop Alarm
              </button>
            ) : !isActive ? (
              <button
                type="button"
                onClick={handleStart}
                className="px-6 py-3 rounded-2xl bg-[#BA954F] hover:bg-[#A17B2F] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer btn-hover-lift"
              >
                <Play className="h-5 w-5 fill-current" />
                {secondsRemaining < totalSeconds && secondsRemaining > 0 ? 'Resume' : 'Start Focus'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePause}
                className="px-6 py-3 rounded-2xl bg-[#443B30] hover:bg-[#2C241B] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Pause className="h-5 w-5 fill-current" />
                Pause
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
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
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Designed responsive navbar layout..."
                className="w-full px-3.5 py-2 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
              />
            </div>
          )}

          {/* Footer Save / Log Time */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <span className="text-[11px] text-[#78716C]">
              Elapsed: {Math.max(1, Math.round((totalSeconds - secondsRemaining) / 60))} min
            </span>
            <button
              type="button"
              onClick={handleLogTimeAndClose}
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
