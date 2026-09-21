import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Task, PersonalTodo } from '../types';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import { soundAlerts } from '../utils/soundAlerts';
import { triggerLocalNotification } from '../utils/pushNotifications';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Bell,
  BellOff,
  BellRing,
  CheckCircle,
  CheckCircle2,
  X,
  Volume2,
  Maximize2,
  UtensilsCrossed,
  Coffee,
} from 'lucide-react';

interface PersistedFocusState {
  task: Task | PersonalTodo;
  targetEndTs: number | null; // null if paused
  totalSeconds: number;
  secondsRemaining: number;
  isActive: boolean;
  notes: string;
  isAlarmRinging: boolean;
}

interface TimerContextType {
  // 15-Minute Attendance Check-in
  periodicSecondsLeft: number;
  isPeriodicAlarmActive: boolean;
  isPeriodicRunning: boolean;
  dismissPeriodicAlarm: () => void;
  resetPeriodicTimer: () => void;
  setAttendanceActiveState: (isClockedIn: boolean, isOnBreak: boolean) => void;
  formatMinSec: (s: number) => string;

  // Task Focus Timer
  activeFocusTask: Task | PersonalTodo | null;
  focusTotalSeconds: number;
  focusSecondsRemaining: number;
  isFocusTimerActive: boolean;
  isFocusAlarmRinging: boolean;
  focusNotes: string;
  isFocusModalOpen: boolean;
  startFocusTimer: (task: Task | PersonalTodo, minutes?: number) => void;
  pauseFocusTimer: () => void;
  resumeFocusTimer: () => void;
  resetFocusTimer: (minutes?: number) => void;
  setFocusMinutes: (minutes: number) => void;
  setFocusNotes: (notes: string) => void;
  stopFocusAlarm: () => void;
  snoozeFocusTimer: (minutes?: number) => void;
  logAndCloseFocusTimer: (customNotes?: string) => Promise<void>;
  openFocusModal: (task?: Task | PersonalTodo | null) => void;
  closeFocusModal: () => void;
  cancelFocusTimer: () => void;

  // Lunch Break Audio Alarm (1:15 PM & 2:00 PM)
  isLunchStartAlarmActive: boolean;
  isLunchEndAlarmActive: boolean;
  dismissLunchAlarm: () => void;
  triggerTestLunchAlarm: (type?: 'start' | 'end') => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

const PERIODIC_CHECKIN_STORAGE_KEY = 'white_ink_periodic_checkin_target_ts';
const FOCUS_TIMER_STORAGE_KEY = 'white_ink_focus_timer_state';
const PERIODIC_CYCLE_SECONDS = 15 * 60; // 15 minutes = 900 seconds

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const isTeamMember = user?.role === 'TEAM_MEMBER';

  // Attendance states for 15-minute check-in
  const [isClockedIn, setIsClockedIn] = useState<boolean>(false);
  const [isOnBreak, setIsOnBreak] = useState<boolean>(false);
  const [periodicSecondsLeft, setPeriodicSecondsLeft] = useState<number>(PERIODIC_CYCLE_SECONDS);
  const [isPeriodicAlarmActive, setIsPeriodicAlarmActive] = useState<boolean>(false);

  // Focus Timer states
  const [activeFocusTask, setActiveFocusTask] = useState<Task | PersonalTodo | null>(null);
  const [focusTotalSeconds, setFocusTotalSeconds] = useState<number>(25 * 60);
  const [focusSecondsRemaining, setFocusSecondsRemaining] = useState<number>(25 * 60);
  const [isFocusTimerActive, setIsFocusTimerActive] = useState<boolean>(false);
  const [isFocusAlarmRinging, setIsFocusAlarmRinging] = useState<boolean>(false);
  const [focusNotes, setFocusNotes] = useState<string>('');
  const [isFocusModalOpen, setIsFocusModalOpen] = useState<boolean>(false);
  const [isLoggingFocus, setIsLoggingFocus] = useState<boolean>(false);

  // Lunch Break audio alarms (1:15 PM Start & 2:00 PM End)
  const [isLunchStartAlarmActive, setIsLunchStartAlarmActive] = useState<boolean>(false);
  const [isLunchEndAlarmActive, setIsLunchEndAlarmActive] = useState<boolean>(false);

  const targetEndTsRef = useRef<number | null>(null);

  const dismissLunchAlarm = useCallback(() => {
    setIsLunchStartAlarmActive(false);
    setIsLunchEndAlarmActive(false);
    soundAlerts.stopAlarm();
  }, []);

  const triggerTestLunchAlarm = useCallback((type: 'start' | 'end' = 'start') => {
    if (type === 'start') {
      setIsLunchStartAlarmActive(true);
      setIsLunchEndAlarmActive(false);
    } else {
      setIsLunchEndAlarmActive(true);
      setIsLunchStartAlarmActive(false);
    }
    soundAlerts.startContinuousAlarm('lunch');
  }, []);

  const handleStartLunchBreakFromAlarm = useCallback(async () => {
    dismissLunchAlarm();
    try {
      await api.startBreak({ breakType: 'LUNCH' });
      setIsOnBreak(true);
    } catch (e) {
      console.warn('Failed to start lunch break:', e);
    }
  }, [dismissLunchAlarm]);

  const handleEndLunchBreakFromAlarm = useCallback(async () => {
    dismissLunchAlarm();
    try {
      await api.endBreak();
      setIsOnBreak(false);
    } catch (e) {
      console.warn('Failed to end break:', e);
    }
  }, [dismissLunchAlarm]);

  // Load initial attendance state
  const refreshAttendanceStatus = useCallback(async () => {
    if (!isTeamMember) return;
    try {
      const res = await api.getTodayAttendance();
      const att = res.attendance;
      if (att && att.clockIn && !att.clockOut) {
        setIsClockedIn(true);
        const activeBrk = att.breaks?.find((b: any) => !b.endTime);
        setIsOnBreak(!!activeBrk);
      } else {
        setIsClockedIn(false);
        setIsOnBreak(false);
      }
    } catch {
      // ignore
    }
  }, [isTeamMember]);

  useEffect(() => {
    refreshAttendanceStatus();
  }, [refreshAttendanceStatus]);

  // Restore Focus Timer state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FOCUS_TIMER_STORAGE_KEY);
      if (saved) {
        const parsed: PersistedFocusState = JSON.parse(saved);
        if (parsed && parsed.task) {
          setActiveFocusTask(parsed.task);
          setFocusTotalSeconds(parsed.totalSeconds || 25 * 60);
          setFocusNotes(parsed.notes || '');

          if (parsed.isActive && parsed.targetEndTs) {
            const now = Date.now();
            targetEndTsRef.current = parsed.targetEndTs;
            const remaining = Math.max(0, Math.ceil((parsed.targetEndTs - now) / 1000));
            setFocusSecondsRemaining(remaining);
            if (remaining <= 0) {
              setIsFocusTimerActive(false);
              setIsFocusAlarmRinging(true);
              soundAlerts.startContinuousAlarm('timer');
            } else {
              setIsFocusTimerActive(true);
              setIsFocusAlarmRinging(false);
            }
          } else {
            targetEndTsRef.current = null;
            setIsFocusTimerActive(false);
            setFocusSecondsRemaining(parsed.secondsRemaining || parsed.totalSeconds || 25 * 60);
            setIsFocusAlarmRinging(parsed.isAlarmRinging || false);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to restore focus timer state:', e);
    }
  }, []);

  // Save Focus Timer state to localStorage whenever it changes
  const saveFocusState = useCallback((
    task: Task | PersonalTodo | null,
    targetEndTs: number | null,
    totalSec: number,
    remainingSec: number,
    active: boolean,
    notesStr: string,
    alarmRinging: boolean
  ) => {
    if (!task) {
      localStorage.removeItem(FOCUS_TIMER_STORAGE_KEY);
      return;
    }
    const state: PersistedFocusState = {
      task,
      targetEndTs,
      totalSeconds: totalSec,
      secondsRemaining: remainingSec,
      isActive: active,
      notes: notesStr,
      isAlarmRinging: alarmRinging,
    };
    try {
      localStorage.setItem(FOCUS_TIMER_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore storage errors
    }
  }, []);

  const shouldRunPeriodic = isTeamMember && isClockedIn && !isOnBreak;

  // Initialize or maintain 15-min periodic checkin target
  useEffect(() => {
    if (!shouldRunPeriodic) {
      if (isPeriodicAlarmActive) {
        setIsPeriodicAlarmActive(false);
        soundAlerts.stopAlarm();
      }
      return;
    }

    const savedTarget = localStorage.getItem(PERIODIC_CHECKIN_STORAGE_KEY);
    const now = Date.now();
    let target = savedTarget ? parseInt(savedTarget, 10) : 0;

    if (!target || isNaN(target) || target < now - 60000) {
      target = now + PERIODIC_CYCLE_SECONDS * 1000;
      localStorage.setItem(PERIODIC_CHECKIN_STORAGE_KEY, String(target));
    }
  }, [shouldRunPeriodic, isPeriodicAlarmActive]);

  // Recalculate function that immediately updates timers from real clock timestamps
  const recalculateTimers = useCallback(() => {
    const now = Date.now();

    // 1. Tick 15-min Periodic Alarm
    if (shouldRunPeriodic) {
      const savedTarget = localStorage.getItem(PERIODIC_CHECKIN_STORAGE_KEY);
      if (savedTarget) {
        const target = parseInt(savedTarget, 10);
        const diffSec = Math.max(0, Math.ceil((target - now) / 1000));
        setPeriodicSecondsLeft(diffSec);

        if (diffSec <= 0 && !isPeriodicAlarmActive) {
          setIsPeriodicAlarmActive(true);
          soundAlerts.startContinuousAlarm('checkin');
          triggerLocalNotification('White Ink Design Studio', {
            body: '⏰ 15-Minute Focus Check-in: Please confirm your active work status.',
            icon: '/white-ink-logo.png',
          });
        }
      }
    }

    // 2. Tick Task Focus Timer
    if (isFocusTimerActive && targetEndTsRef.current) {
      const remaining = Math.max(0, Math.ceil((targetEndTsRef.current - now) / 1000));
      setFocusSecondsRemaining(remaining);

      if (remaining <= 0) {
        setIsFocusTimerActive(false);
        setIsFocusAlarmRinging(true);
        targetEndTsRef.current = null;
        soundAlerts.startContinuousAlarm('timer');
        triggerLocalNotification('White Ink Design Studio', {
          body: `⏰ Focus Time Expired for: ${activeFocusTask?.title || 'Task'}`,
          icon: '/white-ink-logo.png',
        });
        if (activeFocusTask) {
          saveFocusState(
            activeFocusTask,
            null,
            focusTotalSeconds,
            0,
            false,
            focusNotes,
            true
          );
        }
      }
    }

    // 3. Tick Daily Lunch Break Alarms (1:15 PM Start & 2:00 PM End)
    if (isTeamMember && isClockedIn) {
      const nowObj = new Date();
      const hours = nowObj.getHours();
      const minutes = nowObj.getMinutes();
      const todayDateStr = `${nowObj.getFullYear()}-${String(nowObj.getMonth() + 1).padStart(2, '0')}-${String(nowObj.getDate()).padStart(2, '0')}`;

      // 1:15 PM = 13:15
      const lunchStartStorageKey = `white_ink_lunch_start_alert_${todayDateStr}`;
      if (hours === 13 && minutes >= 15 && minutes < 30) {
        if (!localStorage.getItem(lunchStartStorageKey) && !isLunchStartAlarmActive) {
          localStorage.setItem(lunchStartStorageKey, 'true');
          setIsLunchStartAlarmActive(true);
          soundAlerts.startContinuousAlarm('lunch');
          triggerLocalNotification('White Ink Design Studio', {
            body: '🍱 Lunch Break Time (1:15 PM – 2:00 PM)! Take a break and recharge.',
            icon: '/white-ink-logo.png',
          });
        }
      }

      // 2:00 PM = 14:00
      const lunchEndStorageKey = `white_ink_lunch_end_alert_${todayDateStr}`;
      if (hours === 14 && minutes >= 0 && minutes < 15) {
        if (!localStorage.getItem(lunchEndStorageKey) && !isLunchEndAlarmActive) {
          localStorage.setItem(lunchEndStorageKey, 'true');
          setIsLunchEndAlarmActive(true);
          soundAlerts.startContinuousAlarm('lunch');
          triggerLocalNotification('White Ink Design Studio', {
            body: '🍱 Lunch Break Over (2:00 PM)! Time to resume studio work.',
            icon: '/white-ink-logo.png',
          });
        }
      }
    }
  }, [
    shouldRunPeriodic,
    isPeriodicAlarmActive,
    isFocusTimerActive,
    activeFocusTask,
    focusTotalSeconds,
    focusNotes,
    saveFocusState,
    isTeamMember,
    isClockedIn,
    isLunchStartAlarmActive,
    isLunchEndAlarmActive,
  ]);

  // Web Worker for background ticking (Chrome minimizes / background tabs do NOT throttle Web Workers!)
  useEffect(() => {
    let worker: Worker | null = null;
    let fallbackInterval: any = null;

    try {
      const workerBlob = new Blob([
        `let timer = null;
         self.onmessage = function(e) {
           if (e.data === 'start') {
             if (timer) clearInterval(timer);
             timer = setInterval(function() {
               self.postMessage('tick');
             }, 1000);
           } else if (e.data === 'stop') {
             if (timer) clearInterval(timer);
             timer = null;
           }
         };`
      ], { type: 'application/javascript' });

      const workerUrl = URL.createObjectURL(workerBlob);
      worker = new Worker(workerUrl);
      worker.onmessage = () => {
        recalculateTimers();
      };
      worker.postMessage('start');
    } catch (e) {
      // Fallback standard setInterval if Web Worker is restricted
      fallbackInterval = setInterval(() => {
        recalculateTimers();
      }, 1000);
    }

    // Also listen to tab visibility & window focus for instantaneous sync
    const handleVisibilityOrFocus = () => {
      recalculateTimers();
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      if (worker) {
        worker.postMessage('stop');
        worker.terminate();
      }
      if (fallbackInterval) clearInterval(fallbackInterval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [recalculateTimers]);

  // Periodic Check-in handlers
  const dismissPeriodicAlarm = useCallback(() => {
    setIsPeriodicAlarmActive(false);
    soundAlerts.stopAlarm();
    const nextTarget = Date.now() + PERIODIC_CYCLE_SECONDS * 1000;
    localStorage.setItem(PERIODIC_CHECKIN_STORAGE_KEY, String(nextTarget));
    setPeriodicSecondsLeft(PERIODIC_CYCLE_SECONDS);
  }, []);

  const resetPeriodicTimer = useCallback(() => {
    const nextTarget = Date.now() + PERIODIC_CYCLE_SECONDS * 1000;
    localStorage.setItem(PERIODIC_CHECKIN_STORAGE_KEY, String(nextTarget));
    setPeriodicSecondsLeft(PERIODIC_CYCLE_SECONDS);
    if (isPeriodicAlarmActive) {
      setIsPeriodicAlarmActive(false);
      soundAlerts.stopAlarm();
    }
  }, [isPeriodicAlarmActive]);

  const setAttendanceActiveState = useCallback((clockedIn: boolean, onBrk: boolean) => {
    setIsClockedIn(clockedIn);
    setIsOnBreak(onBrk);
    if (!clockedIn || onBrk) {
      if (isPeriodicAlarmActive) {
        setIsPeriodicAlarmActive(false);
        soundAlerts.stopAlarm();
      }
    } else {
      // Started shift or returned from break
      const nextTarget = Date.now() + PERIODIC_CYCLE_SECONDS * 1000;
      localStorage.setItem(PERIODIC_CHECKIN_STORAGE_KEY, String(nextTarget));
      setPeriodicSecondsLeft(PERIODIC_CYCLE_SECONDS);
    }
  }, [isPeriodicAlarmActive]);

  // Focus Timer handlers
  const startFocusTimer = useCallback((task: Task | PersonalTodo, minutes?: number) => {
    const taskAllocated =
      'allocatedMinutes' in task && typeof task.allocatedMinutes === 'number' && task.allocatedMinutes > 0
        ? task.allocatedMinutes
        : null;
    const initialMins = minutes !== undefined ? minutes : (taskAllocated || 25);
    const totalSec = initialMins * 60;
    const targetEnd = Date.now() + totalSec * 1000;
    targetEndTsRef.current = targetEnd;

    setActiveFocusTask(task);
    setFocusTotalSeconds(totalSec);
    setFocusSecondsRemaining(totalSec);
    setIsFocusTimerActive(true);
    setIsFocusAlarmRinging(false);
    setIsFocusModalOpen(true);
    soundAlerts.stopAlarm();
    soundAlerts.playBeep(440, 'sine', 0.1, 0.1);

    saveFocusState(task, targetEnd, totalSec, totalSec, true, focusNotes, false);
  }, [focusNotes, saveFocusState]);

  const pauseFocusTimer = useCallback(() => {
    if (!activeFocusTask) return;
    setIsFocusTimerActive(false);
    targetEndTsRef.current = null;
    saveFocusState(
      activeFocusTask,
      null,
      focusTotalSeconds,
      focusSecondsRemaining,
      false,
      focusNotes,
      isFocusAlarmRinging
    );
  }, [activeFocusTask, focusTotalSeconds, focusSecondsRemaining, focusNotes, isFocusAlarmRinging, saveFocusState]);

  const resumeFocusTimer = useCallback(() => {
    if (!activeFocusTask) return;
    soundAlerts.playBeep(440, 'sine', 0.1, 0.1);
    const targetEnd = Date.now() + focusSecondsRemaining * 1000;
    targetEndTsRef.current = targetEnd;
    setIsFocusTimerActive(true);
    setIsFocusAlarmRinging(false);
    soundAlerts.stopAlarm();
    saveFocusState(
      activeFocusTask,
      targetEnd,
      focusTotalSeconds,
      focusSecondsRemaining,
      true,
      focusNotes,
      false
    );
  }, [activeFocusTask, focusSecondsRemaining, focusTotalSeconds, focusNotes, saveFocusState]);

  const resetFocusTimer = useCallback((minutes?: number) => {
    if (!activeFocusTask) return;
    const mins = minutes || Math.round(focusTotalSeconds / 60) || 25;
    const totalSec = mins * 60;
    setIsFocusTimerActive(false);
    setIsFocusAlarmRinging(false);
    targetEndTsRef.current = null;
    soundAlerts.stopAlarm();

    setFocusTotalSeconds(totalSec);
    setFocusSecondsRemaining(totalSec);

    saveFocusState(
      activeFocusTask,
      null,
      totalSec,
      totalSec,
      false,
      focusNotes,
      false
    );
  }, [activeFocusTask, focusTotalSeconds, focusNotes, saveFocusState]);

  const setFocusMinutes = useCallback((mins: number) => {
    if (!activeFocusTask) return;
    const totalSec = mins * 60;
    setIsFocusTimerActive(false);
    setIsFocusAlarmRinging(false);
    targetEndTsRef.current = null;
    soundAlerts.stopAlarm();

    setFocusTotalSeconds(totalSec);
    setFocusSecondsRemaining(totalSec);

    saveFocusState(
      activeFocusTask,
      null,
      totalSec,
      totalSec,
      false,
      focusNotes,
      false
    );
  }, [activeFocusTask, focusNotes, saveFocusState]);

  const stopFocusAlarm = useCallback(() => {
    setIsFocusAlarmRinging(false);
    soundAlerts.stopAlarm();
    if (activeFocusTask) {
      saveFocusState(
        activeFocusTask,
        null,
        focusTotalSeconds,
        0,
        false,
        focusNotes,
        false
      );
    }
  }, [activeFocusTask, focusTotalSeconds, focusNotes, saveFocusState]);

  const snoozeFocusTimer = useCallback((minutes = 15) => {
    if (!activeFocusTask) return;
    soundAlerts.stopAlarm();
    setIsFocusAlarmRinging(false);
    const totalSec = minutes * 60;
    const targetEnd = Date.now() + totalSec * 1000;
    targetEndTsRef.current = targetEnd;
    setFocusTotalSeconds(totalSec);
    setFocusSecondsRemaining(totalSec);
    setIsFocusTimerActive(true);
    soundAlerts.playBeep(440, 'sine', 0.1, 0.1);
    saveFocusState(activeFocusTask, targetEnd, totalSec, totalSec, true, focusNotes, false);
  }, [activeFocusTask, focusNotes, saveFocusState]);

  const cancelFocusTimer = useCallback(() => {
    setIsFocusTimerActive(false);
    setIsFocusAlarmRinging(false);
    targetEndTsRef.current = null;
    soundAlerts.stopAlarm();
    setActiveFocusTask(null);
    setIsFocusModalOpen(false);
    localStorage.removeItem(FOCUS_TIMER_STORAGE_KEY);
  }, []);

  const logAndCloseFocusTimer = useCallback(async (customNotes?: string) => {
    if (!activeFocusTask) return;
    stopFocusAlarm();
    setIsLoggingFocus(true);
    try {
      const elapsedSeconds = focusTotalSeconds - focusSecondsRemaining;
      const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      const finalNotes = (customNotes !== undefined ? customNotes : focusNotes).trim();

      if ('projectId' in activeFocusTask) {
        await api.logTaskTime(activeFocusTask.id, {
          durationMinutes: elapsedMinutes,
          notes: finalNotes || `Focus Session (${Math.round(focusTotalSeconds / 60)}m target)`,
        });
      }

      cancelFocusTimer();
    } catch (err) {
      console.error('Failed to log focus time:', err);
      cancelFocusTimer();
    } finally {
      setIsLoggingFocus(false);
    }
  }, [activeFocusTask, focusTotalSeconds, focusSecondsRemaining, focusNotes, stopFocusAlarm, cancelFocusTimer]);

  const openFocusModal = useCallback((task?: Task | PersonalTodo | null) => {
    if (task && (!activeFocusTask || activeFocusTask.id !== task.id)) {
      startFocusTimer(task, 25);
    } else {
      setIsFocusModalOpen(true);
    }
  }, [activeFocusTask, startFocusTimer]);

  const closeFocusModal = useCallback(() => {
    setIsFocusModalOpen(false);
  }, []);

  const formatMinSec = useCallback((s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }, []);

  const progressPercent =
    focusTotalSeconds > 0
      ? ((focusTotalSeconds - focusSecondsRemaining) / focusTotalSeconds) * 100
      : 0;

  return (
    <TimerContext.Provider
      value={{
        periodicSecondsLeft,
        isPeriodicAlarmActive,
        isPeriodicRunning: shouldRunPeriodic,
        dismissPeriodicAlarm,
        resetPeriodicTimer,
        setAttendanceActiveState,
        formatMinSec,

        activeFocusTask,
        focusTotalSeconds,
        focusSecondsRemaining,
        isFocusTimerActive,
        isFocusAlarmRinging,
        focusNotes,
        isFocusModalOpen,
        startFocusTimer,
        pauseFocusTimer,
        resumeFocusTimer,
        resetFocusTimer,
        setFocusMinutes,
        setFocusNotes,
        stopFocusAlarm,
        snoozeFocusTimer,
        logAndCloseFocusTimer,
        openFocusModal,
        closeFocusModal,
        cancelFocusTimer,

        isLunchStartAlarmActive,
        isLunchEndAlarmActive,
        dismissLunchAlarm,
        triggerTestLunchAlarm,
      }}
    >
      {children}

      {/* ========================================================================= */}
      {/* 0. GLOBAL LUNCH BREAK ALARM MODAL (1:15 PM Start & 2:00 PM End) */}
      {/* ========================================================================= */}
      {(isLunchStartAlarmActive || isLunchEndAlarmActive) && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-gold-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl border-2 border-[#BA954F] shadow-2xl p-6 text-center space-y-5 animate-pulse">
            <div className="mx-auto h-20 w-20 rounded-full bg-[#FAF4EC] border-2 border-[#BA954F] flex items-center justify-center text-[#BA954F]">
              <UtensilsCrossed className="h-10 w-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#BA954F] text-white text-xs font-bold shadow-xs">
                <Volume2 className="h-3.5 w-3.5" />
                {isLunchStartAlarmActive ? '🍱 Lunch Break Time (1:15 PM – 2:00 PM)' : '🍱 Lunch Break Complete (2:00 PM)'}
              </div>
              <h2 className="text-xl font-bold text-[#1C1917]">
                {isLunchStartAlarmActive ? 'Studio Lunch Break Time!' : 'Lunch Break is Over!'}
              </h2>
              <p className="text-xs text-[#78716C] leading-relaxed">
                {isLunchStartAlarmActive
                  ? 'It is 1:15 PM. Studio lunch hours are 1:15 PM to 2:00 PM. Please take your lunch break, rest, and refresh.'
                  : 'It is 2:00 PM. Studio lunch hours are complete. Time to resume your afternoon design work.'}
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={dismissLunchAlarm}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#BA954F] hover:bg-[#A17B2F] text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer btn-hover-lift"
              >
                <CheckCircle className="h-5 w-5" />
                Dismiss Alarm · Silence Sound
              </button>

              {isLunchStartAlarmActive && !isOnBreak && (
                <button
                  type="button"
                  onClick={handleStartLunchBreakFromAlarm}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#FAF4EC] text-[#BA954F] font-semibold text-xs border border-[#EDE3D4] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Coffee className="h-4 w-4" />
                  Log Lunch Break in Attendance (Optional)
                </button>
              )}

              {isLunchEndAlarmActive && isOnBreak && (
                <button
                  type="button"
                  onClick={handleEndLunchBreakFromAlarm}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#FAF7F2] hover:bg-[#FAF4EC] text-[#2D6A4F] font-semibold text-xs border border-[#D1E7D8] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  End Break & Resume Work
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. GLOBAL 15-MINUTE ATTENDANCE CHECK-IN ALARM MODAL */}
      {/* ========================================================================= */}
      {isPeriodicAlarmActive && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-gold-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl border-2 border-[#B91C1C] shadow-2xl p-6 text-center space-y-5 animate-pulse">
            <div className="mx-auto h-20 w-20 rounded-full bg-[#FDF2F0] border-2 border-[#B91C1C] flex items-center justify-center text-[#B91C1C]">
              <BellRing className="h-10 w-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B91C1C] text-white text-xs font-bold shadow-xs">
                <Volume2 className="h-3.5 w-3.5" />
                15-Minute Focus Check-in Alarm
              </div>
              <h2 className="text-xl font-bold text-[#1C1917]">
                15-Minute Focus Check-in!
              </h2>
              <p className="text-xs text-[#78716C] leading-relaxed">
                Stay on track with your goals and tasks. This alarm will keep ringing until you confirm your active work status.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={dismissPeriodicAlarm}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#BA954F] hover:bg-[#A17B2F] text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer btn-hover-lift"
              >
                <CheckCircle className="h-5 w-5" />
                I am Working · Dismiss Alarm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FLOATING MINI FOCUS TIMER WIDGET (Visible on any page when active) */}
      {/* ========================================================================= */}
      {activeFocusTask && !isFocusModalOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 bg-white/95 backdrop-blur-md border border-[#EDE7DD] shadow-xl rounded-2xl p-3 flex items-center gap-3 animate-gold-fade-in card-hover-lift">
          <div
            onClick={() => setIsFocusModalOpen(true)}
            className={`p-2 rounded-xl cursor-pointer ${
              isFocusAlarmRinging
                ? 'bg-[#B91C1C] text-white animate-bounce'
                : isFocusTimerActive
                ? 'bg-[#FAF4EC] text-[#BA954F]'
                : 'bg-[#FAF7F2] text-[#78716C]'
            }`}
          >
            {isFocusAlarmRinging ? <Bell className="h-4 w-4" /> : <Timer className="h-4 w-4" />}
          </div>

          <div
            onClick={() => setIsFocusModalOpen(true)}
            className="cursor-pointer min-w-0 max-w-[140px] sm:max-w-[180px]"
          >
            <p className="text-xs font-bold text-[#1C1917] truncate">{activeFocusTask.title}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`font-mono text-xs font-bold ${
                  isFocusAlarmRinging ? 'text-[#B91C1C]' : 'text-[#BA954F]'
                }`}
              >
                {formatMinSec(focusSecondsRemaining)}
              </span>
              <span className="text-[10px] text-[#78716C]">
                {isFocusAlarmRinging ? '· Expired!' : isFocusTimerActive ? '· Focus' : '· Paused'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {isFocusAlarmRinging ? (
              <button
                type="button"
                onClick={stopFocusAlarm}
                className="p-1.5 bg-[#B91C1C] text-white rounded-lg hover:bg-[#991B1B] cursor-pointer"
                title="Stop Alarm"
              >
                <BellOff className="h-3.5 w-3.5" />
              </button>
            ) : isFocusTimerActive ? (
              <button
                type="button"
                onClick={pauseFocusTimer}
                className="p-1.5 bg-[#FAF7F2] hover:bg-[#FAF4EC] text-[#443B30] rounded-lg border border-[#EDE7DD] cursor-pointer"
                title="Pause Timer"
              >
                <Pause className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeFocusTimer}
                className="p-1.5 bg-[#BA954F] hover:bg-[#A17B2F] text-white rounded-lg cursor-pointer"
                title="Resume Timer"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsFocusModalOpen(true)}
              className="p-1.5 bg-[#FAF7F2] hover:bg-[#FAF4EC] text-[#78716C] rounded-lg border border-[#EDE7DD] cursor-pointer"
              title="Expand Timer Modal"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FULL TASK FOCUS TIMER MODAL (Global across all screens) */}
      {/* ========================================================================= */}
      {isFocusModalOpen && activeFocusTask && (
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
                  <p className="text-xs text-[#78716C] truncate max-w-[280px]">
                    {activeFocusTask.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFocusModalOpen(false)}
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
                      onClick={() => setFocusMinutes(mins)}
                      disabled={isFocusTimerActive}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        focusTotalSeconds === mins * 60
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
                  {formatMinSec(focusSecondsRemaining)}
                </div>

                <p className="text-xs text-[#78716C] mt-2 font-medium">
                  {isFocusTimerActive
                    ? '⚡ Focus in progress · Timer continues even when switching tabs or minimizing!'
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
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={stopFocusAlarm}
                      className="px-5 py-3 rounded-2xl bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer animate-pulse"
                    >
                      <BellOff className="h-5 w-5" />
                      Stop Alarm
                    </button>
                    {isTeamMember && (
                      <button
                        type="button"
                        onClick={() => snoozeFocusTimer(15)}
                        className="px-5 py-3 rounded-2xl bg-[#BA954F] hover:bg-[#A17B2F] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer btn-hover-lift"
                      >
                        <Timer className="h-5 w-5" />
                        Snooze 15m
                      </button>
                    )}
                  </div>
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
              {'projectId' in activeFocusTask && (
                <div className="space-y-2 pt-2 border-t border-[#EDE7DD]">
                  <label className="text-xs font-semibold text-[#443B30]">
                    Work Session Notes (Optional):
                  </label>
                  <input
                    type="text"
                    value={focusNotes}
                    onChange={(e) => setFocusNotes(e.target.value)}
                    placeholder="e.g., Working on drawings and deliverables..."
                    className="w-full px-3.5 py-2 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                  />
                </div>
              )}

              {/* Footer Save / Log Time */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={cancelFocusTimer}
                  className="text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
                >
                  Cancel Session
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#78716C]">
                    Elapsed:{' '}
                    {Math.max(1, Math.round((focusTotalSeconds - focusSecondsRemaining) / 60))} min
                  </span>
                  <button
                    type="button"
                    onClick={() => logAndCloseFocusTimer()}
                    disabled={isLoggingFocus}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#2D6A4F] hover:bg-[#22543D] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isLoggingFocus ? 'Logging...' : 'Save & Log Time'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </TimerContext.Provider>
  );
};

export function useTimer(): TimerContextType {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}
