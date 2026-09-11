import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { PersonalTodo } from '../../types';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface TodoDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  todo: PersonalTodo | null;
}

export const TodoDeleteDialog: React.FC<TodoDeleteDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  todo,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!todo) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Todo"
      subtitle="Confirm permanent removal"
      maxWidth="sm"
    >
      <div className="space-y-4">
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs text-black/80">
            <p className="font-bold text-black mb-1">
              Are you sure you want to delete this Todo?
            </p>
            <p className="text-black/70 italic">"{todo.title}"</p>
            <p className="mt-2 text-red-700 font-semibold">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gold-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-1.5 text-xs font-bold text-black bg-white hover:bg-gold-100 border border-gold-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
