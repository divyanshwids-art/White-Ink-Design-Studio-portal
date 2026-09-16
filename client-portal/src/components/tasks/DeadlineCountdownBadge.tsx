import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface DeadlineCountdownBadgeProps {
  dueDate?: string | null;
  status?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const DeadlineCountdownBadge: React.FC<DeadlineCountdownBadgeProps> = ({
  dueDate,
  status,
  size = 'sm',
  showIcon = true,
}) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  if (!dueDate) {
    return (
      <span className="text-[11px] text-[#A8A29E] inline-flex items-center gap-1 font-medium">
        {showIcon && <Clock className="h-3 w-3 stroke-[1.75]" />}
        No deadline
      </span>
    );
  }

  if (status === 'COMPLETED') {
    return (
      <span className="text-[11px] text-[#2D6A4F] inline-flex items-center gap-1 font-semibold bg-[#F0F7F2] px-2 py-0.5 rounded-full border border-[#D1E7DD]">
        {showIcon && <CheckCircle2 className="h-3 w-3" />}
        Completed
      </span>
    );
  }

  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const totalHours = Math.floor(absDiff / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));

  let timeText = '';
  if (days > 0) {
    timeText = `${days}d ${hours}h`;
  } else if (hours > 0) {
    timeText = `${hours}h ${minutes}m`;
  } else {
    timeText = `${Math.max(1, minutes)}m`;
  }

  let colorClasses = 'bg-[#FAF7F2] text-[#78716C] border-[#EDE7DD]';
  let badgeLabel = `${timeText} left`;

  if (isOverdue) {
    colorClasses = 'bg-[#FDF2F0] text-[#B91C1C] border-[#F5D5D0] animate-pulse';
    badgeLabel = `Overdue by ${timeText}`;
  } else if (totalHours <= 4) {
    colorClasses = 'bg-[#FEF6EE] text-[#C2410C] border-[#FDBA74] font-bold';
    badgeLabel = `Urgent: ${timeText} left`;
  } else if (totalHours <= 24) {
    colorClasses = 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
    badgeLabel = `${timeText} left`;
  }

  const sizeClasses = size === 'sm' ? 'text-[10px] px-2 py-0.5' : size === 'md' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold tracking-tight shrink-0 shadow-2xs ${sizeClasses} ${colorClasses}`}
      title={`Due: ${due.toLocaleString()}`}
    >
      {showIcon && (
        isOverdue ? (
          <AlertTriangle className="h-3 w-3 shrink-0" />
        ) : (
          <Clock className="h-3 w-3 shrink-0" />
        )
      )}
      {badgeLabel}
    </span>
  );
};
