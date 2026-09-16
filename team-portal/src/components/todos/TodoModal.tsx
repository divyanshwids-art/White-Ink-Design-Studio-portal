import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { PersonalTodo, User } from '../../types';
import { api } from '../../services/api';
import { AlertCircle, User as UserIcon, Calendar, FileText, CheckCircle2 } from 'lucide-react';

interface TodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  todo?: PersonalTodo | null;
  internalMembers: User[];
}

export const TodoModal: React.FC<TodoModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  todo,
  internalMembers,
}) => {
  const isEditing = Boolean(todo);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleAssignees = internalMembers.filter(
    (u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' || u.role === 'TEAM_MEMBER'
  );

  useEffect(() => {
    if (todo) {
      setTitle(todo.title || '');
      setDescription(todo.description || '');
      setDueDate(todo.dueDate ? todo.dueDate.split('T')[0] : '');
      setAssignedToId(todo.assignedToId || '');
    } else {
      setTitle('');
      setDescription('');
      setDueDate('');
      setAssignedToId('');
    }
    setError(null);
  }, [todo, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Todo title is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && todo) {
        await api.updateTodo(todo.id, {
          title: title.trim(),
          description: description.trim() || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assignedToId: assignedToId || null,
        });
      } else {
        await api.createTodo({
          title: title.trim(),
          description: description.trim() || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assignedToId: assignedToId || null,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save todo:', err);
      setError(err.message || 'Failed to save todo. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Todo' : 'New Personal Todo'}
      subtitle={
        isEditing
          ? 'Update details and assignment for this item'
          : 'Create a personal todo item or delegate to an internal team member'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FDF0ED] text-[#9E2A2B] border border-[#F5D0C5] rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
            Todo Title <span className="text-[#BA954F]">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Review brand guidelines, prepare presentation"
            className="w-full px-3.5 py-2.5 text-sm bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] font-medium text-neutral-900 placeholder:text-neutral-400"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
            Description <span className="text-neutral-400 font-normal lowercase">(Optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add relevant notes, checklist pointers, or context..."
            className="w-full px-3.5 py-2.5 text-sm bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] font-medium text-neutral-900 placeholder:text-neutral-400 resize-none"
          />
        </div>

        {/* Due Date & Assign To in 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              Due Date <span className="text-neutral-400 font-normal lowercase">(Optional)</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] font-medium text-neutral-900"
            />
          </div>

          {/* Assign To */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
              Assign To <span className="text-neutral-400 font-normal lowercase">(Internal Staff)</span>
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] font-medium text-neutral-900 cursor-pointer"
            >
              <option value="">No assignment (Personal only)</option>
              {eligibleAssignees.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EDE7DD]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-gold-secondary px-4 py-2 text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold-primary px-5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>{isEditing ? 'Save Changes' : 'Create Todo'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

