import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-[1.5px]',
    md: 'h-7 w-7 border-2',
    lg: 'h-10 w-10 border-2',
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div
        className={`${sizeClasses} border-[#EAE0D0] border-t-[#BA954F] rounded-full animate-spin`}
      />
      {message && (
        <p className="mt-3 text-xs font-medium text-[#78716C] animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};
