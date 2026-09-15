import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { soundAlerts } from '../../utils/soundAlerts';
import {
  Bell,
  BellRing,
  CheckCircle,
  AlertCircle,
  Clock,
  Sparkles,
  Volume2,
} from 'lucide-react';

interface Periodic15MinAlarmProps {
  isClockedIn?: boolean;
  isOnBreak?: boolean;
}

export const Periodic15MinAlarm: React.FC<Periodic15MinAlarmProps> = ({
  isClockedIn = false,
  isOnBreak = false,
}) => {
  const { user } = useAuth();
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60); // 15 mins = 900s
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [acknowledgedCount, setAcknowledgedCount] = useState<number>(0);
  const [enabled, setEnabled] = useState<boolean>(true);

  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const shouldRun = isTeamMember && isClockedIn && !isOnBreak && enabled;

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!shouldRun) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (isAlarmActive) {
        setIsAlarmActive(false);
        soundAlerts.stopAlarm();
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          // Trigger persistent alarm!
          setIsAlarmActive(true);
          soundAlerts.startContinuousAlarm('checkin');
          return 15 * 60; // reset for next cycle
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [shouldRun, isAlarmActive]);

  const handleAcknowledge = () => {
    setIsAlarmActive(false);
    soundAlerts.stopAlarm();
    setAcknowledgedCount((prev) => prev + 1);
    setSecondsLeft(15 * 60);
  };

  const formatMinSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isTeamMember) return null;

  return (
    <>
      {/* Mini status indicator in dashboard / page */}
      {isClockedIn && !isOnBreak && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF4EC] border border-[#EDE3D4] text-[#BA954F] text-xs font-semibold shadow-2xs">
          <Clock className="h-3.5 w-3.5 stroke-[2]" />
          <span>15m Focus Check: <strong className="font-mono text-[#1C1917]">{formatMinSec(secondsLeft)}</strong></span>
        </div>
      )}

      {/* Persistent Alarm Full Modal (Will NOT close until user acknowledges!) */}
      {isAlarmActive && (
        <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-gold-fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl border-2 border-[#B91C1C] shadow-2xl p-6 text-center space-y-5 animate-pulse">
            
            <div className="mx-auto h-20 w-20 rounded-full bg-[#FDF2F0] border-2 border-[#B91C1C] flex items-center justify-center text-[#B91C1C]">
              <BellRing className="h-10 w-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B91C1C] text-white text-xs font-bold shadow-xs">
                <Volume2 className="h-3.5 w-3.5" />
                Continuous 15-Minute Alarm Ringing
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
                onClick={handleAcknowledge}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#BA954F] hover:bg-[#A17B2F] text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer btn-hover-lift"
              >
                <CheckCircle className="h-5 w-5" />
                I am Working · Dismiss Alarm
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
