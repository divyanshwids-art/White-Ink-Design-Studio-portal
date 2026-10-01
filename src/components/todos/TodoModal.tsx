import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { PersonalTodo, User } from '../../types';
import { api } from '../../services/api';
import {
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Copy,
  Sparkles,
} from 'lucide-react';
import { normalizeDateToDayEnd } from '@shared';

interface TodoDraft {
  id: string;
  title: string;
  description: string;
  dueDate: string;
}

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

  // Single todo state (used when isEditing = true)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedToId, setAssignedToId] = useState('');

  // Multiple todos state (used when isEditing = false)
  const [commonDueDate, setCommonDueDate] = useState('');
  const [todoDrafts, setTodoDrafts] = useState<TodoDraft[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleAssignees = internalMembers.filter(
    (u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' || u.role === 'TEAM_MEMBER'
  );

  const createEmptyDraft = (): TodoDraft => ({
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: '',
    description: '',
    dueDate: commonDueDate || '',
  });

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

      setCommonDueDate('');
      setTodoDrafts([
        {
          id: 'draft_1',
          title: '',
          description: '',
          dueDate: '',
        },
      ]);
    }
    setError(null);
  }, [todo, isOpen]);

  const handleAddTodoDraft = () => {
    setTodoDrafts((prev) => [...prev, createEmptyDraft()]);
  };

  const handleDuplicateTodoDraft = (index: number) => {
    const target = todoDrafts[index];
    if (!target) return;
    const clone: TodoDraft = {
      ...target,
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: target.title ? `${target.title} (Copy)` : '',
    };
    const updated = [...todoDrafts];
    updated.splice(index + 1, 0, clone);
    setTodoDrafts(updated);
  };

  const handleRemoveTodoDraft = (index: number) => {
    if (todoDrafts.length <= 1) return;
    setTodoDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTodoDraft = (index: number, updates: Partial<TodoDraft>) => {
    setTodoDrafts((prev) =>
      prev.map((draft, i) => (i === index ? { ...draft, ...updates } : draft))
    );
  };

  const applyCommonDueDateToAll = (dateVal: string) => {
    setCommonDueDate(dateVal);
    setTodoDrafts((prev) => prev.map((d) => ({ ...d, dueDate: dateVal })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Single Todo Edit Mode
    if (isEditing && todo) {
      if (!title.trim()) {
        setError('Todo title is required.');
        return;
      }
      if (!description.trim()) {
        setError('Todo description is required.');
        return;
      }
      if (!dueDate) {
        setError('Due date is required.');
        return;
      }

      setIsSubmitting(true);
      try {
        await api.updateTodo(todo.id, {
          title: title.trim(),
          description: description.trim(),
          dueDate: normalizeDateToDayEnd(dueDate) || null,
          assignedToId: assignedToId || null,
        });

        onSuccess();
        onClose();
      } catch (err: any) {
        console.error('Failed to save todo:', err);
        setError(err.message || 'Failed to save todo. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2. Creation Mode (1 or multiple in unified form - all fields mandatory)
    if (todoDrafts.length === 0) {
      setError('Please add at least one todo.');
      return;
    }

    // Validate all items
    for (let i = 0; i < todoDrafts.length; i++) {
      const d = todoDrafts[i];
      const todoNum = i + 1;
      const prefix = todoDrafts.length > 1 ? `Todo #${todoNum}: ` : '';

      if (!d.title.trim()) {
        setError(`${prefix}Title is required.`);
        return;
      }
      if (!d.description.trim()) {
        setError(`${prefix}Description is required.`);
        return;
      }
      const itemDue = d.dueDate || commonDueDate;
      if (!itemDue) {
        setError(`${prefix}Due date is required.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloads = todoDrafts.map((d) => ({
        title: d.title.trim(),
        description: d.description.trim(),
        dueDate: normalizeDateToDayEnd(d.dueDate || commonDueDate) || null,
        assignedToId: null,
      }));

      await api.createTodos(payloads);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create todos:', err);
      setError(err.message || 'Failed to create todos. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditing
          ? 'Edit Todo'
          : todoDrafts.length > 1
          ? `Create Todos (${todoDrafts.length})`
          : 'New Personal Todo'
      }
      subtitle={
        isEditing
          ? 'Update details and assignment for this item'
          : todoDrafts.length > 1
          ? 'Adding multiple personal todo tasks at once'
          : 'Create personal todo item'
      }
      maxWidth={isEditing ? 'md' : 'xl'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FDF0ED] text-[#9E2A2B] border border-[#F5D0C5] rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* EDITING AN EXISTING TODO */}
        {isEditing && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Todo Title <span className="text-[#BA954F]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Review brand guidelines, prepare presentation"
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] font-medium text-neutral-900 placeholder:text-neutral-400"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Description <span className="text-[#BA954F]">*</span>
              </label>
              <textarea
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Add relevant notes, checklist pointers, or context (required)..."
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] font-medium text-neutral-900 placeholder:text-neutral-400 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Due Date <span className="text-[#BA954F]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] font-medium text-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Assign To <span className="text-neutral-400 font-normal lowercase">(Internal Staff)</span>
                </label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] font-medium text-neutral-900 cursor-pointer"
                >
                  <option value="">Personal only (Myself)</option>
                  {eligibleAssignees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* CREATING TODOS (DIRECT MULTI-TODO FORM - ALL FIELDS MANDATORY & NO ASSIGN TO) */}
        {!isEditing && (
          <div className="space-y-4">
            {/* Quick Defaults Bar */}
            <div className="p-3 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#BA954F] shrink-0" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    Quick Default Due Date
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Apply the same due date across all todo items below
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:w-64">
                <input
                  type="date"
                  value={commonDueDate}
                  onChange={(e) => applyCommonDueDateToAll(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#EDE7DD] rounded-lg text-neutral-900 font-semibold focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                />
              </div>
            </div>

            {/* List of Todo Drafts */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {todoDrafts.map((draft, idx) => (
                <div
                  key={draft.id}
                  className="p-3.5 bg-white border border-[#EDE7DD] hover:border-[#DFD5C6] rounded-xl space-y-2.5 transition-colors shadow-2xs relative group"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#FAF7F2]">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#BA954F] text-white text-[11px] font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                        Todo #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicateTodoDraft(idx)}
                        title="Duplicate this todo"
                        className="p-1 text-neutral-500 hover:text-neutral-900 hover:bg-[#FAF7F2] rounded-md transition-colors cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      {todoDrafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTodoDraft(idx)}
                          title="Remove this todo"
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description (Mandatory) */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                        Todo Title <span className="text-[#BA954F]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={draft.title}
                        onChange={(e) => updateTodoDraft(idx, { title: e.target.value })}
                        placeholder={`Todo #${idx + 1} Title (required)`}
                        className="w-full px-3 py-1.5 text-xs sm:text-sm bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-lg text-neutral-900 font-semibold placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F]"
                        autoFocus={idx === 0}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                        Description / Notes <span className="text-[#BA954F]">*</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={draft.description}
                        onChange={(e) => updateTodoDraft(idx, { description: e.target.value })}
                        placeholder="Context, notes or checklist pointers (required)..."
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF7F2]/30 border border-[#EDE7DD] rounded-lg text-neutral-900 font-medium placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] resize-none"
                      />
                    </div>
                  </div>

                  {/* Due Date Only (Assign To removed for personal todos) */}
                  <div className="pt-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                      Due Date <span className="text-[#BA954F]">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={draft.dueDate}
                      onChange={(e) => updateTodoDraft(idx, { dueDate: e.target.value })}
                      className="w-full sm:w-1/2 px-2.5 py-1.5 text-xs bg-white border border-[#EDE7DD] rounded-lg text-neutral-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add Another Todo Button */}
            <button
              type="button"
              onClick={handleAddTodoDraft}
              className="w-full py-2.5 border-2 border-dashed border-[#DFD5C6] hover:border-[#BA954F] bg-[#FAF7F2]/60 hover:bg-[#FAF7F2] text-neutral-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="h-4 w-4 text-[#BA954F]" />
              <span>+ Add Another Todo to Form</span>
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#EDE7DD]">
          <div>
            {!isEditing && todoDrafts.length > 1 && (
              <span className="text-xs font-bold text-neutral-700 bg-[#FAF7F2] border border-[#EDE7DD] px-2.5 py-1 rounded-lg">
                Total: {todoDrafts.length} items
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-gold-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-gold-primary px-5 py-2 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>
                  {todoDrafts.length > 1
                    ? `Saving ${todoDrafts.length} Todos...`
                    : 'Saving Todo...'}
                </span>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    {isEditing
                      ? 'Save Changes'
                      : todoDrafts.length > 1
                      ? `Create ${todoDrafts.length} Todos`
                      : 'Create Todo'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
