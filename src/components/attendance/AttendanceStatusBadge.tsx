import React from 'react';
import { AttendanceStatus } from '../../types';
import { CheckCircle2, Clock, AlertCircle, CalendarX, Coffee, PlayCircle } from 'lucide-react';

interface AttendanceStatusBadgeProps {
  status: AttendanceStatus | 'WORKING' | 'ON_BREAK';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const AttendanceStatusBadge: React.FC<AttendanceStatusBadgeProps> = ({
  status,
  size = 'sm',
  showIcon = true,
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'PRESENT':
        return {
          label: 'Present',
          bg: 'bg-[#EBF3ED] text-[#2D6A4F] border-[#D1E7D8] font-semibold',
          Icon: CheckCircle2,
        };
      case 'LATE':
        return {
          label: 'Late',
          bg: 'bg-[#FDF6E9] text-[#B45309] border-[#F9E2AF] font-semibold',
          Icon: Clock,
        };
      case 'HALF_DAY':
        return {
          label: 'Half Day',
          bg: 'bg-[#FAF7F2] text-[#BA954F] border-[#EDE7DD] font-medium',
          Icon: AlertCircle,
        };
      case 'ON_LEAVE':
        return {
          label: 'On Leave',
          bg: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] font-medium',
          Icon: CalendarX,
        };
      case 'ABSENT':
        return {
          label: 'Absent',
          bg: 'bg-[#FDF0ED] text-[#9E2A2B] border-[#F5D0C5] font-medium',
          Icon: AlertCircle,
        };
      case 'WORKING':
        return {
          label: 'Working Now',
          bg: 'bg-[#FAF7F2] text-[#BA954F] border-[#BA954F]/40 font-bold animate-pulse',
          Icon: PlayCircle,
        };
      case 'ON_BREAK':
        return {
          label: 'On Break',
          bg: 'bg-[#FDF6E9] text-[#B45309] border-[#F9E2AF] font-bold animate-pulse',
          Icon: Coffee,
        };
      default:
        return {
          label: status,
          bg: 'bg-[#FAF7F2] text-neutral-700 border-[#EDE7DD] font-medium',
          Icon: CheckCircle2,
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.Icon;

  const sizeClasses = {
    xs: 'text-[10px] px-2 py-0.5 gap-1',
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    xs: 'h-2.5 w-2.5',
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${config.bg} ${sizeClasses[size]} whitespace-nowrap shadow-xs`}
    >
      {showIcon && <Icon className={`${iconSizes[size]} shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
};

