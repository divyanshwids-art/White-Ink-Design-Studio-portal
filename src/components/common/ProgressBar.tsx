import React from 'react';

interface ProgressBarProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  colorScheme?: 'indigo' | 'emerald' | 'amber' | 'dynamic';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  size = 'md',
  showLabel = true,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress || 0)));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-2.5',
  }[size];

  return (
    <div className="w-full flex items-center gap-2.5">
      <div
        className={`w-full bg-[#F5EFE6] rounded-full overflow-hidden ${heightClasses} border border-[#EDE7DD]`}
      >
        <div
          className={`${heightClasses} rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-[#B58E4E] to-[#BA954F]`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-[#1C1917] min-w-[2.25rem] text-right font-mono">
          {clampedProgress}%
        </span>
      )}
    </div>
  );
};
