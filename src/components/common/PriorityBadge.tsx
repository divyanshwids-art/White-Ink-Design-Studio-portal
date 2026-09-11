import React from 'react';
import { ProjectPriority, TaskPriority } from '../../types';
import { AlertCircle, ArrowUp, Minus } from 'lucide-react';

interface PriorityBadgeProps {
  priority: ProjectPriority | TaskPriority | string;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs font-semibold';

  switch (priority) {
    case 'URGENT':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full border border-[#F5C2C0] bg-[#FDF2F0] text-[#B91C1C] font-semibold ${sizeClasses} whitespace-nowrap shadow-2xs`}
        >
          <AlertCircle className="h-3 w-3 text-[#B91C1C] shrink-0" />
          Urgent
        </span>
      );
    case 'HIGH':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full border border-[#EBD6B8] bg-[#FAF2E6] text-[#BA954F] font-semibold ${sizeClasses} whitespace-nowrap shadow-2xs`}
        >
          <ArrowUp className="h-3 w-3 text-[#BA954F] shrink-0" />
          High
        </span>
      );
    case 'MEDIUM':
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full border border-[#EDE7DD] bg-[#FBF9F5] text-[#6B5E4F] font-medium ${sizeClasses} whitespace-nowrap`}
        >
          <Minus className="h-3 w-3 text-[#B58E4E] shrink-0" />
          Medium
        </span>
      );
    case 'LOW':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 rounded-full border border-[#E7E5E4] bg-[#FAFAF9] text-[#78716C] font-medium ${sizeClasses} whitespace-nowrap`}
        >
          <Minus className="h-3 w-3 text-[#A8A29E] shrink-0" />
          Low
        </span>
      );
  }
};
