import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task, Project, User, TaskStatus } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TaskModal } from '../components/tasks/TaskModal';
import { SubmitTaskModal } from '../components/tasks/SubmitTaskModal';
import { ImportTasksModal } from '../components/tasks/ImportTasksModal';
import { ClientTaskDetailModal } from '../components/tasks/ClientTaskDetailModal';
import { DeadlineCountdownBadge } from '../components/tasks/DeadlineCountdownBadge';
import { TaskFocusTimerModal } from '../components/tasks/TaskFocusTimerModal';
import { TaskOverdueReasonModal } from '../components/tasks/TaskOverdueReasonModal';
import {
  CheckSquare,
  Search,
  Plus,
  Calendar,
  User as UserIcon,
  Edit2,
  Trash2,
  Send,
  FileSpreadsheet,
  Timer,
  Play,
  AlertTriangle,
} from 'lucide-react';

interface TasksPageProps {
  openCreateModalDirectly?: boolean;
  onNavigate?: (path: string) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  openCreateModalDirectly = false,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');

  const [isModalOpen, setIsModalOpen] = useState(openCreateModalDirectly);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitTask, setSubmitTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [focusTimerTask, setFocusTimerTask] = useState<Task | null>(null);
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState(false);
  const [overdueTask, setOverdueTask] = useState<Task | null>(null);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);

  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';
  const isSuperAdminOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const canManage = !isClient;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksData, projectsData, usersData] = await Promise.all([
        api.getTasks({
          search,
          status: statusFilter,
          priority: priorityFilter,
          projectId: projectFilter,
        }),
        api.getProjects(),
        api.getUsers(),
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, priorityFilter, projectFilter]);

  useEffect(() => {
    loadData();
    const handleDataUpdated = () => {
      loadData();
    };
    window.addEventListener('portal:data-updated', handleDataUpdated);
    return () => {
      window.removeEventListener('portal:data-updated', handleDataUpdated);
    };
  }, [loadData]);

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    setIsDeleting(true);
    try {
      await api.deleteTask(deletingTask.id);
      setDeletingTask(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/95 backdrop-blur-xs p-5 sm:p-6 rounded-2xl border border-[#EDE7DD] shadow-xs">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1C1917]">
            Task Management
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] font-normal">
            View, track, and update all project deliverables and milestone assignments
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer btn-hover-lift"
          >
            <Plus className="h-4 w-4 stroke-[2]" />
            {isClient ? 'Add Task' : 'Create Task'}
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white/95 backdrop-blur-xs p-3.5 sm:p-4 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer shadow-2xs"
          >
            <option value="ALL">Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 text-xs font-semibold bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer shadow-2xs"
          >
            <option value="ALL">Status</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Review</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {!isClient && (
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3.5 py-2 text-xs font-semibold bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer shadow-2xs"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          )}
        </div>
      </div>

      {/* Task List */}
      {isLoading ? (
        <LoadingSpinner message="Loading task deliverables..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="There are no tasks matching your filters. Create a new task to assign work."
          icon={CheckSquare}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs divide-y divide-[#F5EFE6] overflow-hidden">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 sm:p-5 hover:bg-[#FAF7F2] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer group"
              onClick={() => {
                if (user?.role === 'SUPER_ADMIN') {
                  setViewingTask(task);
                } else if (onNavigate) {
                  onNavigate(`/tasks/${task.id}`);
                } else {
                  setViewingTask(task);
                }
              }}
            >
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {!isClient && <PriorityBadge priority={task.priority} size="sm" />}
                  <span className="text-xs font-semibold text-[#78716C]">{task.project?.name || 'Project'}</span>
                  {task.dueDate && (
                    <DeadlineCountdownBadge dueDate={task.dueDate} status={task.status} size="sm" />
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#1C1917] leading-snug group-hover:text-[#BA954F] transition-colors">{task.title}</h3>
                {task.description && (
                  <p className="text-xs text-[#78716C] line-clamp-1 font-normal">{task.description}</p>
                )}
                <div className="flex items-center gap-4 text-xs text-[#78716C] font-normal pt-1">
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3.5 w-3.5 text-[#BA954F]" />
                    {task.assignedTo?.name || 'Unassigned'}
                  </span>
                  {task.dueDate && (
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="h-3.5 w-3.5 text-[#BA954F]" />
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Overdue Reason Callout (visible to admins and team members) */}
                {task.overdueReason && (
                  <div className="p-2.5 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-xs text-[#B91C1C] flex items-start gap-2 mt-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-[#B91C1C] mt-0.5" />
                    <div>
                      <span className="font-bold">Delay Reason ({task.assignedTo?.name || 'Member'}): </span>
                      <span className="italic text-red-950">&ldquo;{task.overdueReason}&rdquo;</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#EDE7DD]">
                {/* Overdue delay button for team member */}
                {task.dueDate &&
                  new Date(task.dueDate).getTime() < Date.now() &&
                  task.status !== 'COMPLETED' &&
                  user?.role === 'TEAM_MEMBER' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOverdueTask(task);
                        setIsOverdueModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold text-[#B91C1C] hover:text-[#991B1B] bg-[#FDF2F0] hover:bg-[#FBE8E6] border border-[#F5D5D0] rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
                      title="Explain delay reason to Admin"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      <span>{task.overdueReason ? 'Edit Reason' : 'Explain Delay'}</span>
                    </button>
                )}

                {canManage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusTimerTask(task);
                      setIsFocusTimerOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] bg-[#FAF4EC] hover:bg-[#FAF4EC]/80 border border-[#EDE3D4] rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Start LeetCode-style Focus Timer with Alarm"
                  >
                    <Timer className="h-3.5 w-3.5" />
                    <span>Focus Timer</span>
                  </button>
                )}

                {isClient ? (
                  <StatusBadge status={task.status} size="sm" />
                ) : user?.role === 'TEAM_MEMBER' ? (
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {task.status !== 'REVIEW' && task.status !== 'COMPLETED' && task.assignedToId === user?.id && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSubmitTask(task);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl cursor-pointer shadow-xs btn-hover-lift"
                      >
                        <Send className="h-3 w-3" />
                        Submit for Client Approval
                      </button>
                    )}
                    {task.status === 'REVIEW' && task.clientApprovalStatus === 'PENDING' && (
                      <span className="text-[11px] font-semibold text-[#946B2D] bg-[#FAF2E6] border border-[#E8DCC8] rounded-xl px-2.5 py-1.5 whitespace-nowrap">
                        Awaiting Client Approval
                      </span>
                    )}
                    {task.clientApprovalStatus === 'APPROVED' && (
                      <span className="text-[11px] font-semibold text-[#2D6A4F] bg-[#F0F7F2] border border-[#D1E7DD] rounded-xl px-2.5 py-1.5 whitespace-nowrap">
                        Client Approved
                      </span>
                    )}
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleQuickStatusChange(task.id, e.target.value as TaskStatus)}
                      disabled={task.status === 'REVIEW' || task.status === 'COMPLETED'}
                      className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-[#DFD5C6] bg-white text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      {task.status === 'REVIEW' && <option value="REVIEW" disabled>In Review</option>}
                      {task.status === 'COMPLETED' && <option value="COMPLETED" disabled>Completed</option>}
                      {task.status === 'REVISION_REQUESTED' && <option value="REVISION_REQUESTED">Revision Requested</option>}
                    </select>
                  </div>
                ) : (
                  <div onClick={(e) => e.stopPropagation()}>
                    <select
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleQuickStatusChange(task.id, e.target.value as TaskStatus)}
                      className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-[#DFD5C6] bg-white text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer shadow-2xs"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="REVIEW">In Review</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="REVISION_REQUESTED">Revision Requested</option>
                    </select>
                  </div>
                )}

                {canManage && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTask(task);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
                      title="Edit Task"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingTask(task);
                      }}
                      className="p-1.5 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FDF2F0] rounded-lg transition-colors cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTask(null); }}
        task={editingTask}
        projects={projects}
        users={users}
        onSuccess={loadData}
      />

      {/* Focus Timer Modal */}
      {focusTimerTask && (
        <TaskFocusTimerModal
          isOpen={isFocusTimerOpen}
          onClose={() => {
            setIsFocusTimerOpen(false);
            setFocusTimerTask(null);
          }}
          task={focusTimerTask}
          onTimeLogged={loadData}
        />
      )}

      {/* Import Tasks Modal */}
      <ImportTasksModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        projects={projects}
        users={users}
        onSuccess={loadData}
      />

      {/* Submit Task Modal */}
      {submitTask && (
        <SubmitTaskModal
          isOpen={!!submitTask}
          onClose={() => setSubmitTask(null)}
          task={submitTask}
          onSuccess={loadData}
        />
      )}

      {/* Universal Task Detail View Modal */}
      {viewingTask && (
        <ClientTaskDetailModal
          task={viewingTask}
          isOpen={!!viewingTask}
          onClose={() => setViewingTask(null)}
          onApproved={() => {
            setViewingTask(null);
            loadData();
          }}
          onStartTimer={(t) => {
            setFocusTimerTask(t);
            setIsFocusTimerOpen(true);
          }}
          onSubmitTask={(t) => {
            setSubmitTask(t);
          }}
          onExplainDelay={(t) => {
            setOverdueTask(t);
            setIsOverdueModalOpen(true);
          }}
          onEditTask={(t) => {
            setEditingTask(t);
            setIsModalOpen(true);
          }}
          onStatusChange={async (taskId, status) => {
            await handleQuickStatusChange(taskId, status);
            setViewingTask((prev) => (prev && prev.id === taskId ? { ...prev, status } : prev));
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${deletingTask?.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteTask}
        onCancel={() => setDeletingTask(null)}
      />

      {/* Task Overdue Delay Explanation Modal */}
      {overdueTask && (
        <TaskOverdueReasonModal
          isOpen={isOverdueModalOpen}
          onClose={() => {
            setIsOverdueModalOpen(false);
            setOverdueTask(null);
          }}
          task={overdueTask}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
