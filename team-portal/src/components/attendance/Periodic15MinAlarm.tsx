import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTimer } from '../../context/TimerContext';
import { Clock } from 'lucide-react';

interface Periodic15MinAlarmProps {
  isClockedIn?: boolean;
  isOnBreak?: boolean;
}

export const Periodic15MinAlarm: React.FC<Periodic15MinAlarmProps> = ({
  isClockedIn = false,
  isOnBreak = false,
}) => {
  const { user } = useAuth();
  const { periodicSecondsLeft, setAttendanceActiveState } = useTimer();

  const isTeamMember = user?.role === 'TEAM_MEMBER';

  useEffect(() => {
    if (isTeamMember) {
      setAttendanceActiveState(isClockedIn, isOnBreak);
    }
  }, [isTeamMember, isClockedIn, isOnBreak, setAttendanceActiveState]);

  const formatMinSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  if (!isTeamMember || !isClockedIn || isOnBreak) return null;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF4EC] border border-[#EDE3D4] text-[#BA954F] text-xs font-semibold shadow-2xs">
      <Clock className="h-3.5 w-3.5 stroke-[2]" />
      <span>
        15m Focus Check: <strong className="font-mono text-[#1C1917]">{formatMinSec(periodicSecondsLeft)}</strong>
      </span>
    </div>
  );
};
