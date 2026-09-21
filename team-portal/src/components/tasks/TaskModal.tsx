import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Task, Project, User, TaskStatus, TaskPriority, RevisionRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AlertCircle, FileText, Calendar } from 'lucide-react';
import { normalizeDateToDayEnd } from '@shared';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  task?: Task | null;
  projects: Project[];
  users: User[];
  defaultProjectId?: string;
  defaultStatus?: TaskStatus;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  task,
  projects,
  users,
  defaultProjectId,
  defaultStatus,
}) => {
  const isEditing = Boolean(task);
  const { user } = useAuth();
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [allocatedMinutes, setAllocatedMinutes] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setProjectId(task.projectId || '');
      setAssignedToId(task.assignedToId || '');
      setStatus(task.status || 'TODO');
      setPriority(task.priority || 'MEDIUM');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setAllocatedMinutes(task.allocatedMinutes ? task.allocatedMinutes : '');
    } else {
      setTitle('');
      setDescription('');
      setProjectId(defaultProjectId || projects[0]?.id || '');
      setAssignedToId('');
      setStatus(defaultStatus || 'TODO');
      setPriority('MEDIUM');
      setDueDate('');
      setAllocatedMinutes('');
    }
    setError(null);
  }, [task, projects, defaultProjectId, defaultStatus, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Task title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Task description is required.');
      return;
    }
    if (!projectId) {
      setError('Please select a project.');
      return;
    }

    if (isTeamMember && (status === 'COMPLETED' || (status === 'REVIEW' && task?.status !== 'REVIEW'))) {
      setError('Team members cannot directly mark tasks as In Review or Completed. Please submit for client review.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const allocatedNum = allocatedMinutes !== '' ? Number(allocatedMinutes) : null;
      if (isEditing && task) {
        await api.updateTask(task.id, {
          title: title.trim(),
          description: description.trim(),
          projectId,
          assignedToId: isClient ? undefined : (assignedToId || undefined),
          status: isClient ? task.status : status,
          priority,
          dueDate: normalizeDateToDayEnd(dueDate),
          allocatedMinutes: allocatedNum,
        });
      } else {
        await api.createTask({
          title: title.trim(),
          description: description.trim(),
          projectId,
          assignedToId: isClient ? undefined : (assignedToId || undefined),
          status: isClient ? 'TODO' : status,
          priority,
          dueDate: normalizeDateToDayEnd(dueDate),
          allocatedMinutes: allocatedNum,
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

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (isTeamMember && (newStatus === 'COMPLETED' || (newStatus === 'REVIEW' && task?.status !== 'REVIEW'))) {
      return;
    }
    setStatus(newStatus);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Task' : isClient ? 'Create Project Requirement' : 'Create New Task'}
      subtitle={isEditing ? 'Update task deliverables and specifications' : isClient ? 'Add a new task requirement to your project' : 'Add a task deliverable to a project'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Revision Request Banner — shown to team members when client has requested changes */}
        {task?.revisionRequest && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Client Revision Request</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                (task.revisionRequest as RevisionRequest).priority === 'HIGH'
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : (task.revisionRequest as RevisionRequest).priority === 'LOW'
                  ? 'bg-gold-100 text-black border-gold-300'
                  : 'bg-amber-100 text-amber-700 border-amber-300'
              }`}>
                {(task.revisionRequest as RevisionRequest).priority} Priority
              </span>
            </div>
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              {(task.revisionRequest as RevisionRequest).feedback}
            </p>
            {(task.revisionRequest as RevisionRequest).targetDate && (
              <div className="flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                <Calendar className="h-3 w-3" />
                Target: {new Date((task.revisionRequest as RevisionRequest).targetDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
            {(task.revisionRequest as RevisionRequest).files?.length > 0 && (
              <div className="space-y-1 pt-1">
                {(task.revisionRequest as RevisionRequest).files.map((f) => (
                  <div key={f.name} className="flex items-center gap-2 text-[11px] text-amber-800 font-medium">
                    <FileText className="h-3 w-3 shrink-0" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-amber-600 shrink-0">{f.size}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 text-sm text-black bg-gold-100 border border-gold-400 rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Task Title */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Task Title <span className="text-gold-700">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Homepage hero animation & responsive layout"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-medium placeholder-black/40 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Description <span className="text-gold-700">*</span>
          </label>
          <textarea
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed task criteria, acceptance specs, or technical notes..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-medium placeholder-black/40 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        {/* Project Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Associated Project <span className="text-gold-700">*</span>
          </label>
          <select
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer"
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

        {/* Assignee Selection (Hidden for Clients) */}
        {!isClient && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Assigned User
            </label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer"
            >
              <option value="">Unassigned</option>
              {users
                .filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role.replace('_', ' ')})
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Status, Priority & Due Date */}
        <div className={`grid gap-3 ${isClient ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
          {/* Status (Hidden for Clients) */}
          {!isClient && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">In Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="REVISION_REQUESTED">Revision Requested</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Due Date <span className="text-gold-700">*</span>
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>
        </div>

        {/* Target Allocated Duration for Smart Focus Timer */}
        {!isClient && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Target Allocated Duration (Minutes)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="480"
                value={allocatedMinutes}
                onChange={(e) => setAllocatedMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                placeholder="e.g. 25, 45, 60, 90"
                className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold placeholder-black/40 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-black/50 font-medium">
                minutes
              </span>
            </div>
            <p className="text-[11px] text-[#78716C] mt-1">
              Pre-sets the Smart Focus Timer and alarm for the assigned team member.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gold-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-bold text-black bg-white hover:bg-gold-100 border border-gold-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 shadow-sm cursor-pointer btn-hover-lift"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
