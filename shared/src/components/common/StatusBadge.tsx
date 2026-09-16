import React from 'react';
import { ProjectStatus, TaskStatus } from '../../types';

interface StatusBadgeProps {
  status: ProjectStatus | TaskStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : 'px-2.5 py-1 text-xs font-semibold';

  const configMap: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    // Project statuses
    PENDING: {
      bg: 'bg-[#FAF4EC] border-[#EBE1D0]',
      text: 'text-[#BA954F] font-semibold',
      dot: 'bg-[#BA954F] animate-pulse',
      label: 'Pending Setup',
    },
    PLANNING: {
      bg: 'bg-[#F7F4EE] border-[#E5DDD0]',
      text: 'text-[#6B5E4F] font-semibold',
      dot: 'bg-[#B58E4E]',
      label: 'Planning',
    },
    ACTIVE: {
      bg: 'bg-[#F0F7F2] border-[#D1E7DD]',
      text: 'text-[#2D6A4F] font-semibold',
      dot: 'bg-[#2D6A4F]',
      label: 'Active',
    },
    ON_HOLD: {
      bg: 'bg-[#F5F5F4] border-[#E7E5E4]',
      text: 'text-[#78716C] font-medium',
      dot: 'bg-[#A8A29E]',
      label: 'On Hold',
    },
    COMPLETED: {
      bg: 'bg-[#F0F7F2] border-[#D1E7DD]',
      text: 'text-[#2D6A4F] font-semibold',
      dot: 'bg-[#2D6A4F]',
      label: 'Completed',
    },
    CANCELLED: {
      bg: 'bg-[#FDF2F0] border-[#F5D5D0]',
      text: 'text-[#991B1B] font-medium',
      dot: 'bg-[#DC2626]',
      label: 'Cancelled',
    },
    // Task statuses
    TODO: {
      bg: 'bg-[#FAF7F2] border-[#E5DDD0]',
      text: 'text-[#78716C] font-medium',
      dot: 'bg-[#A8A29E]',
      label: 'To Do',
    },
    IN_PROGRESS: {
      bg: 'bg-[#FAF4EC] border-[#EBE1D0]',
      text: 'text-[#BA954F] font-semibold',
      dot: 'bg-[#BA954F]',
      label: 'In Progress',
    },
    REVIEW: {
      bg: 'bg-[#FAF2E6] border-[#E8DCC8]',
      text: 'text-[#946B2D] font-semibold',
      dot: 'bg-[#946B2D] animate-pulse',
      label: 'In Review',
    },
    REVISION_REQUESTED: {
      bg: 'bg-[#FDF2F0] border-[#F5D5D0]',
      text: 'text-[#B91C1C] font-semibold',
      dot: 'bg-[#DC2626] animate-pulse',
      label: 'Changes Requested',
    },
  };

  const current = configMap[status] || {
    bg: 'bg-[#FAF7F2] border-[#E5DDD0]',
    text: 'text-[#57534E] font-medium',
    dot: 'bg-[#BA954F]',
    label: status.replace(/_/g, ' '),
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${current.bg} ${current.text} ${sizeClasses} whitespace-nowrap transition-colors shadow-2xs`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot} shrink-0`} />
      <span>{current.label}</span>
    </span>
  );
};
