import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDangerous = true,
  isLoading = false,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isDangerous
                ? 'bg-[#FDF2F0] text-[#B91C1C] border border-[#F5D5D0]'
                : 'bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]'
            }`}
          >
            <AlertTriangle className="h-5 w-5 shrink-0" />
          </div>
          <p className="text-sm text-[#292524] leading-relaxed pt-0.5 font-normal">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EDE7DD]">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] rounded-xl border border-[#DFD5C6] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-xl transition-all duration-150 disabled:opacity-50 shadow-xs cursor-pointer btn-hover-lift ${
              isDangerous
                ? 'bg-[#B91C1C] hover:bg-[#991B1B]'
                : 'bg-[#BA954F] hover:bg-[#A17B2F]'
            }`}
          >
            {isLoading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};
