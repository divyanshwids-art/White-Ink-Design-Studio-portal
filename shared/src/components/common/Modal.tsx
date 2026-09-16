import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  }[maxWidth];

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-4 md:p-6">
      {/* Backdrop with rich blur */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[6px] transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Card - strictly bounded inside viewport */}
      <div
        className={`relative z-10 w-full ${maxWidthClass} max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-[#EDE7DD] flex flex-col overflow-hidden animate-gold-fade-in`}
      >
        {/* Fixed Header */}
        {title ? (
          <div className="flex items-start justify-between px-5 sm:px-6 py-3.5 border-b border-[#EDE7DD] bg-[#FAF7F2] shrink-0">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1C1917] tracking-tight">{title}</h3>
              {subtitle && <p className="text-xs text-[#78716C] mt-0.5 font-normal">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#EAE0D0]/60 rounded-xl transition-colors cursor-pointer ml-3"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 z-20 p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-full transition-colors cursor-pointer border border-[#EDE7DD]"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Scrollable Body - min-h-0 forces overflow inside flexbox */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto min-h-0 flex-1 overscroll-contain">
          {children}
        </div>

        {/* Fixed Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3 border-t border-[#EDE7DD] bg-[#FAF7F2] shrink-0 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
