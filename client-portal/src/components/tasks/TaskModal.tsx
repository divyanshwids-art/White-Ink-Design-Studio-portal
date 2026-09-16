import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Task, Project, User, TaskPriority } from '../../types';
import { api } from '../../services/api';
import { Sparkles, Calendar, Layers, AlertCircle } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task?: Task | null;
  projects: Project[];
  users?: User[];
  defaultProjectId?: string;
  defaultStatus?: any;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  task,
  projects,
  defaultProjectId,
}) => {
  const isEditing = Boolean(task);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setProjectId(task.projectId || '');
      setPriority(task.priority || 'MEDIUM');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
    } else {
      setTitle('');
      setDescription('');
      setProjectId(defaultProjectId || projects[0]?.id || '');
      setPriority('MEDIUM');
      setDueDate('');
    }
    setError(null);
  }, [task, projects, defaultProjectId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Task description and requirement specs are required.');
      return;
    }
    if (!projectId) {
      setError('Please select an associated project.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && task) {
        await api.updateTask(task.id, {
          title: title.trim(),
          description: description.trim(),
          projectId,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        });
      } else {
        await api.createTask({
          title: title.trim(),
          description: description.trim(),
          projectId,
          status: 'TODO',
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Task Requirement' : 'Create New Task'}
      subtitle={isEditing ? 'Update requirements for this deliverable' : 'Submit a new task requirement to the White Ink Studio team'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-xs text-[#B91C1C] bg-[#FDF2F0] border border-[#F5D5D0] rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Task Title */}
        <div>
          <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
            Task Title <span className="text-[#BA954F]">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Homepage hero animation & responsive layout"
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] transition-colors"
          />
        </div>

        {/* Requirements & Description */}
        <div>
          <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
            Deliverable Requirements & Description <span className="text-[#BA954F]">*</span>
          </label>
          <textarea
            rows={4}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what needs to be created or adjusted, along with any reference links, design notes, or criteria..."
            className="w-full p-3 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] transition-colors leading-relaxed"
          />
        </div>

        {/* Associated Project Selection */}
        <div>
          <label className="block text-xs font-semibold text-[#1C1917] mb-1.5 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-[#BA954F]" />
            Associated Project <span className="text-[#BA954F]">*</span>
          </label>
          <select
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] font-semibold focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] cursor-pointer"
          >
            <option value="" disabled>
              Select Project
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Priority & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] font-semibold focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] cursor-pointer"
            >
              <option value="LOW">Low Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent (Immediate Focus)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1C1917] mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#BA954F]" />
              Target / Due Date (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] font-semibold focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F]"
            />
          </div>
        </div>

        {/* Info Note for Client */}
        <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EDE7DD] text-[11px] text-[#78716C] leading-relaxed flex items-start gap-2">
          <Sparkles className="h-4 w-4 text-[#BA954F] shrink-0 mt-0.5" />
          <span>
            Once submitted, this task will immediately appear on the Studio Team Portal where designers will be assigned and start work.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE7DD]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-[#57534E] hover:text-[#1C1917] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl transition-all disabled:opacity-50 shadow-xs cursor-pointer btn-hover-lift"
          >
            {isSubmitting ? 'Submitting to Studio...' : isEditing ? 'Update Task' : 'Submit Task to Studio'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
