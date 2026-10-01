import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Task, Project, User, TaskStatus, TaskPriority, RevisionRequest } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import {
  AlertCircle,
  FileText,
  Calendar,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { normalizeDateToDayEnd } from '@shared';

interface TaskDraft {
  id: string;
  title: string;
  description: string;
  projectId: string;
  assignedToId: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  allocatedMinutes: number | '';
}

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

  // Single task state (used when isEditing = true)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [allocatedMinutes, setAllocatedMinutes] = useState<number | ''>('');

  // Multiple tasks state (used when isEditing = false)
  const [commonProjectId, setCommonProjectId] = useState('');
  const [commonDueDate, setCommonDueDate] = useState('');
  const [commonAssignedToId, setCommonAssignedToId] = useState('');
  const [taskDrafts, setTaskDrafts] = useState<TaskDraft[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialProject = defaultProjectId || projects[0]?.id || '';
  const eligibleUsers = users.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN');
  const initialAssignee = eligibleUsers[0]?.id || '';

  const createEmptyDraft = (projId = commonProjectId || initialProject): TaskDraft => ({
    id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: '',
    description: '',
    projectId: projId,
    assignedToId: commonAssignedToId || initialAssignee,
    status: defaultStatus || 'TODO',
    priority: 'MEDIUM',
    dueDate: commonDueDate || '',
    allocatedMinutes: 60,
  });

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setProjectId(task.projectId || '');
      setAssignedToId(task.assignedToId || '');
      setStatus(task.status || 'TODO');
      setPriority(task.priority || 'MEDIUM');
      setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setAllocatedMinutes(task.allocatedMinutes ? task.allocatedMinutes : 60);
    } else {
      const defProj = defaultProjectId || projects[0]?.id || '';
      const defAssignee = eligibleUsers[0]?.id || '';

      setTitle('');
      setDescription('');
      setProjectId(defProj);
      setAssignedToId(defAssignee);
      setStatus(defaultStatus || 'TODO');
      setPriority('MEDIUM');
      setDueDate('');
      setAllocatedMinutes(60);

      setCommonProjectId(defProj);
      setCommonDueDate('');
      setCommonAssignedToId(defAssignee);
      setTaskDrafts([
        {
          id: `draft_1`,
          title: '',
          description: '',
          projectId: defProj,
          assignedToId: defAssignee,
          status: defaultStatus || 'TODO',
          priority: 'MEDIUM',
          dueDate: '',
          allocatedMinutes: 60,
        },
      ]);
    }
    setError(null);
  }, [task, projects, users, defaultProjectId, defaultStatus, isOpen]);

  // Multiple tasks helpers
  const handleAddTaskDraft = () => {
    setTaskDrafts((prev) => [...prev, createEmptyDraft()]);
  };

  const handleDuplicateTaskDraft = (index: number) => {
    const target = taskDrafts[index];
    if (!target) return;
    const clone: TaskDraft = {
      ...target,
      id: `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: target.title ? `${target.title} (Copy)` : '',
    };
    const updated = [...taskDrafts];
    updated.splice(index + 1, 0, clone);
    setTaskDrafts(updated);
  };

  const handleRemoveTaskDraft = (index: number) => {
    if (taskDrafts.length <= 1) return;
    setTaskDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateTaskDraft = (index: number, updates: Partial<TaskDraft>) => {
    setTaskDrafts((prev) =>
      prev.map((draft, i) => (i === index ? { ...draft, ...updates } : draft))
    );
  };

  // Bulk actions for multiple mode
  const applyCommonProjectToAll = (newProjId: string) => {
    setCommonProjectId(newProjId);
    setTaskDrafts((prev) => prev.map((d) => ({ ...d, projectId: newProjId })));
  };

  const applyCommonDueDateToAll = (newDate: string) => {
    setCommonDueDate(newDate);
    setTaskDrafts((prev) => prev.map((d) => ({ ...d, dueDate: newDate })));
  };

  const applyCommonAssigneeToAll = (newAssigneeId: string) => {
    setCommonAssignedToId(newAssigneeId);
    setTaskDrafts((prev) => prev.map((d) => ({ ...d, assignedToId: newAssigneeId })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Single Task Edit Mode (when editing an existing task)
    if (isEditing && task) {
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
      if (!isClient && !assignedToId) {
        setError('Please select an assigned user.');
        return;
      }
      if (!dueDate) {
        setError('Due date is required.');
        return;
      }
      if (!isClient && (allocatedMinutes === '' || Number(allocatedMinutes) <= 0)) {
        setError('Target allocated duration in minutes is required.');
        return;
      }

      if (isTeamMember && (status === 'COMPLETED' || (status === 'REVIEW' && task?.status !== 'REVIEW'))) {
        setError('Team members cannot directly mark tasks as In Review or Completed. Please submit for client review.');
        return;
      }

      setIsSubmitting(true);
      try {
        const allocatedNum = allocatedMinutes !== '' ? Number(allocatedMinutes) : null;
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

        onSuccess();
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to save task.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // 2. Task Creation Mode (All fields mandatory)
    if (taskDrafts.length === 0) {
      setError('Please add at least one task.');
      return;
    }

    // Validate each draft - every single field is mandatory
    for (let i = 0; i < taskDrafts.length; i++) {
      const d = taskDrafts[i];
      const taskNum = i + 1;
      const prefix = taskDrafts.length > 1 ? `Task #${taskNum}: ` : '';

      if (!d.title.trim()) {
        setError(`${prefix}Title is required.`);
        return;
      }
      if (!d.description.trim()) {
        setError(`${prefix}Description is required.`);
        return;
      }
      const itemProj = d.projectId || commonProjectId;
      if (!itemProj) {
        setError(`${prefix}Please select an associated project.`);
        return;
      }
      if (!isClient) {
        const itemAssignee = d.assignedToId || commonAssignedToId;
        if (!itemAssignee) {
          setError(`${prefix}Please select an assigned user.`);
          return;
        }
      }
      if (!d.priority) {
        setError(`${prefix}Please select a priority.`);
        return;
      }
      const itemDue = d.dueDate || commonDueDate;
      if (!itemDue) {
        setError(`${prefix}Due date is required.`);
        return;
      }
      if (!isClient) {
        if (d.allocatedMinutes === '' || Number(d.allocatedMinutes) <= 0) {
          setError(`${prefix}Target allocated duration (minutes) is required.`);
          return;
        }
      }
      if (!d.status) {
        setError(`${prefix}Please select a status.`);
        return;
      }
      if (isTeamMember && (d.status === 'COMPLETED' || d.status === 'REVIEW')) {
        setError(`${prefix}Team members cannot directly mark tasks as In Review or Completed.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payloads = taskDrafts.map((d) => {
        const allocatedNum = d.allocatedMinutes !== '' ? Number(d.allocatedMinutes) : null;
        const finalProj = d.projectId || commonProjectId || initialProject;
        const finalDue = d.dueDate || commonDueDate;
        const finalAssignee = isClient ? undefined : (d.assignedToId || commonAssignedToId || undefined);

        return {
          title: d.title.trim(),
          description: d.description.trim(),
          projectId: finalProj,
          assignedToId: finalAssignee,
          status: isClient ? ('TODO' as TaskStatus) : d.status,
          priority: d.priority,
          dueDate: normalizeDateToDayEnd(finalDue),
          allocatedMinutes: allocatedNum,
        };
      });

      await api.createTasks(payloads);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create tasks:', err);
      setError(err.message || 'Failed to create tasks. Please check your inputs and try again.');
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
      title={
        isEditing
          ? 'Edit Task'
          : taskDrafts.length > 1
          ? `Create Tasks (${taskDrafts.length})`
          : isClient
          ? 'Create Project Requirement'
          : 'Create Task'
      }
      subtitle={
        isEditing
          ? 'Update task deliverables and specifications'
          : taskDrafts.length > 1
          ? 'Adding multiple tasks at once in a single form (all fields required)'
          : isClient
          ? 'Add a task requirement to your project (all fields required)'
          : 'Add a task deliverable to a project (all fields required)'
      }
      maxWidth={isEditing ? 'lg' : '2xl'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Revision Request Banner */}
        {task?.revisionRequest && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                  Client Revision Request
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  (task.revisionRequest as RevisionRequest).priority === 'HIGH'
                    ? 'bg-rose-100 text-rose-700 border-rose-300'
                    : (task.revisionRequest as RevisionRequest).priority === 'LOW'
                    ? 'bg-gold-100 text-black border-gold-300'
                    : 'bg-amber-100 text-amber-700 border-amber-300'
                }`}
              >
                {(task.revisionRequest as RevisionRequest).priority} Priority
              </span>
            </div>
            <p className="text-xs text-amber-900 font-medium leading-relaxed">
              {(task.revisionRequest as RevisionRequest).feedback}
            </p>
            {(task.revisionRequest as RevisionRequest).targetDate && (
              <div className="flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                <Calendar className="h-3 w-3" />
                Target:{' '}
                {new Date((task.revisionRequest as RevisionRequest).targetDate!).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
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

        {/* Error notification */}
        {error && (
          <div className="p-3 text-xs sm:text-sm text-black bg-gold-100 border border-gold-400 rounded-lg font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-700" />
            <span>{error}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* EDITING AN EXISTING TASK                                     */}
        {/* ============================================================ */}
        {isEditing && (
          <div className="space-y-4">
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

            {!isClient && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Assigned User <span className="text-gold-700">*</span>
                </label>
                <select
                  required
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer"
                >
                  <option value="" disabled>Select Assignee *</option>
                  {eligibleUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={`grid gap-3 ${isClient ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
              {!isClient && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                    Status <span className="text-gold-700">*</span>
                  </label>
                  <select
                    required
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
                  Priority <span className="text-gold-700">*</span>
                </label>
                <select
                  required
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

            {!isClient && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                  Target Allocated Duration (Minutes) <span className="text-gold-700">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="480"
                    required
                    value={allocatedMinutes}
                    onChange={(e) =>
                      setAllocatedMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                    }
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
          </div>
        )}

        {/* ============================================================ */}
        {/* ADDING TASKS (DIRECT MULTI-TASK FORM - ALL FIELDS REQUIRED)  */}
        {/* ============================================================ */}
        {!isEditing && (
          <div className="space-y-4">
            {/* Quick Defaults Bar */}
            <div className="p-3.5 bg-[#FAF7F2] border border-gold-300 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black">
                  <Sparkles className="h-3.5 w-3.5 text-gold-700" />
                  <span>Quick Defaults for All Tasks</span>
                </div>
                <span className="text-[11px] text-neutral-500">
                  Settings apply to all new tasks
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Project (All Tasks) <span className="text-neutral-400 font-normal lowercase">(Optional)</span>
                  </label>
                  <select
                    value={commonProjectId}
                    onChange={(e) => applyCommonProjectToAll(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                  >
                    <option value="">Keep per-task or Select Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Common Due Date <span className="text-neutral-400 font-normal lowercase">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={commonDueDate}
                    onChange={(e) => applyCommonDueDateToAll(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500"
                  />
                </div>

                {!isClient && (
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                      Common Assignee <span className="text-neutral-400 font-normal lowercase">(Optional)</span>
                    </label>
                    <select
                      value={commonAssignedToId}
                      onChange={(e) => applyCommonAssigneeToAll(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                    >
                      <option value="">Keep per-task or Select Assignee</option>
                      {eligibleUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Task Item Cards List */}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {taskDrafts.map((draft, idx) => (
                <div
                  key={draft.id}
                  className="p-3.5 bg-white border border-gold-200 hover:border-gold-400 rounded-xl space-y-3 transition-colors shadow-2xs relative group"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-gold-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-gold-500 text-black text-[11px] font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-black uppercase tracking-wider">
                        Task #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleDuplicateTaskDraft(idx)}
                        title="Duplicate this task"
                        className="p-1 text-neutral-500 hover:text-black hover:bg-gold-100 rounded-md transition-colors cursor-pointer"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      {taskDrafts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTaskDraft(idx)}
                          title="Remove this task"
                          className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description (Both Mandatory) */}
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                        Task Title <span className="text-gold-700">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={draft.title}
                        onChange={(e) => updateTaskDraft(idx, { title: e.target.value })}
                        placeholder={`Task #${idx + 1} Title (required)`}
                        className="w-full px-3 py-1.5 text-xs sm:text-sm bg-[#FAF7F2]/50 border border-gold-300 rounded-lg text-black font-semibold placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500"
                        autoFocus={idx === 0}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                        Description & Deliverable Specs <span className="text-gold-700">*</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={draft.description}
                        onChange={(e) => updateTaskDraft(idx, { description: e.target.value })}
                        placeholder="Task specifications, criteria, acceptance deliverables (required)..."
                        className="w-full px-3 py-1.5 text-xs bg-[#FAF7F2]/30 border border-gold-200 rounded-lg text-black font-medium placeholder:text-neutral-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 resize-none"
                      />
                    </div>
                  </div>

                  {/* Row of metadata inputs - All Mandatory */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                        Project <span className="text-gold-700">*</span>
                      </label>
                      <select
                        required
                        value={draft.projectId}
                        onChange={(e) => updateTaskDraft(idx, { projectId: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-white border border-gold-300 rounded-lg text-black font-medium focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                      >
                        <option value="" disabled>Select Project *</option>
                        {projects.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isClient && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                          Assignee <span className="text-gold-700">*</span>
                        </label>
                        <select
                          required
                          value={draft.assignedToId}
                          onChange={(e) => updateTaskDraft(idx, { assignedToId: e.target.value })}
                          className="w-full px-2 py-1 text-xs bg-white border border-gold-300 rounded-lg text-black font-medium focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                        >
                          <option value="" disabled>Select Assignee *</option>
                          {eligibleUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                        Priority <span className="text-gold-700">*</span>
                      </label>
                      <select
                        required
                        value={draft.priority}
                        onChange={(e) => updateTaskDraft(idx, { priority: e.target.value as TaskPriority })}
                        className="w-full px-2 py-1 text-xs bg-white border border-gold-300 rounded-lg text-black font-medium focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                        Due Date <span className="text-gold-700">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={draft.dueDate}
                        onChange={(e) => updateTaskDraft(idx, { dueDate: e.target.value })}
                        className="w-full px-2 py-1 text-xs bg-white border border-gold-300 rounded-lg text-black font-medium focus:outline-none focus:ring-1 focus:ring-gold-500"
                      />
                    </div>
                  </div>

                  {!isClient && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-gold-100/60">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                          Status <span className="text-gold-700">*</span>
                        </label>
                        <select
                          required
                          value={draft.status}
                          onChange={(e) => updateTaskDraft(idx, { status: e.target.value as TaskStatus })}
                          className="w-full px-2 py-1 text-xs bg-white border border-gold-300 rounded-lg text-black font-medium focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="REVIEW">In Review</option>
                          <option value="COMPLETED">Completed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-0.5">
                          Allocated Focus (Minutes) <span className="text-gold-700">*</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="480"
                          required
                          value={draft.allocatedMinutes}
                          onChange={(e) =>
                            updateTaskDraft(idx, {
                              allocatedMinutes: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                            })
                          }
                          placeholder="e.g. 60 min"
                          className="w-full px-2 py-1 text-xs bg-white border border-gold-300 rounded-lg text-black font-medium focus:outline-none focus:ring-1 focus:ring-gold-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add Another Task Button */}
            <button
              type="button"
              onClick={handleAddTaskDraft}
              className="w-full py-2.5 border-2 border-dashed border-gold-400 hover:border-gold-600 bg-gold-50/50 hover:bg-gold-100/60 text-gold-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="h-4 w-4 text-gold-700" />
              <span>+ Add Another Task to Form</span>
            </button>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gold-200">
          <div>
            {!isEditing && taskDrafts.length > 1 && (
              <span className="text-xs font-bold text-neutral-700 bg-gold-100/70 border border-gold-300 px-2.5 py-1 rounded-lg">
                Total: {taskDrafts.length} tasks
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
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
              className="px-5 py-2 text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 shadow-sm cursor-pointer btn-hover-lift inline-flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <span>
                  {taskDrafts.length > 1
                    ? `Saving ${taskDrafts.length} Tasks...`
                    : 'Saving Task...'}
                </span>
              ) : isEditing ? (
                'Update Task'
              ) : taskDrafts.length > 1 ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Create {taskDrafts.length} Tasks</span>
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
