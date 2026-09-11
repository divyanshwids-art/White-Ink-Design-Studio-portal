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

  // Filter out client roles just in case
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
          <div className="p-3 bg-red-50 text-red-900 border border-red-300 rounded-lg text-xs font-semibold flex items-center gap-2 animate-gold-fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-bold text-black mb-1">
            Todo Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Review brand guidelines, prepare presentation"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gold-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium text-black placeholder:text-black/40"
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-black mb-1">
            Description <span className="text-black/50 font-normal">(Optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add relevant notes, checklist pointers, or context..."
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-gold-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium text-black placeholder:text-black/40 resize-none"
          />
        </div>

        {/* Due Date & Assign To in 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Due Date */}
          <div>
            <label className="block text-xs font-bold text-black mb-1">
              Due Date <span className="text-black/50 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-gold-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium text-black"
              />
            </div>
          </div>

          {/* Assign To (Internal only) */}
          <div>
            <label className="block text-xs font-bold text-black mb-1">
              Assign To <span className="text-black/50 font-normal">(Internal Staff)</span>
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-gold-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium text-black cursor-pointer"
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
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-gold-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-black bg-white hover:bg-gold-100 border border-gold-300 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 rounded-lg shadow-sm border border-gold-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Saving...</span>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
                <span>{isEditing ? 'Save Changes' : 'Create Todo'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
