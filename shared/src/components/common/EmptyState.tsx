import React from 'react';
import { FolderKanban, LucideIcon, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = FolderKanban,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-[#DFD5C6] rounded-2xl bg-white/80 backdrop-blur-xs shadow-xs">
      <div className="p-3.5 bg-[#FAF4EC] border border-[#EDE3D4] rounded-2xl text-[#BA954F] mb-4 shadow-2xs">
        <Icon className="h-6 w-6 stroke-[1.75]" />
      </div>
      <h3 className="text-base font-serif font-bold text-[#1C1917] mb-1.5">{title}</h3>
      <p className="text-sm text-[#78716C] max-w-sm mb-5 leading-relaxed font-normal">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs font-semibold rounded-xl shadow-xs transition-all duration-150 cursor-pointer btn-hover-lift"
        >
          <Plus className="h-4 w-4 stroke-[2]" />
          {actionLabel}
        </button>
      )}
    </div>
  );
};
