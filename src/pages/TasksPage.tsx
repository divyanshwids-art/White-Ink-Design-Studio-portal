import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TaskModal } from '../components/tasks/TaskModal';
import { SubmitTaskModal } from '../components/tasks/SubmitTaskModal';
import { ImportTasksModal } from '../components/tasks/ImportTasksModal';
import {
  CheckSquare,
  Search,
  Plus,
  Calendar,
  User as UserIcon,
  Edit2,
  Trash2,
  Filter,
  Send,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

interface TasksPageProps {
  openCreateModalDirectly?: boolean;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  openCreateModalDirectly = false,
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(openCreateModalDirectly);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [submitTask, setSubmitTask] = useState<Task | null>(null);

  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';
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
          assignedToId: assigneeFilter,
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
  }, [search, statusFilter, priorityFilter, projectFilter, assigneeFilter]);

  useEffect(() => {
    loadData();
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-gold-300 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-black">Task Management</h1>
          <p className="text-sm text-black/70 font-medium">
            View, track, and update all project deliverables and milestone assignments
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gold-100 text-black text-xs sm:text-sm font-bold rounded-lg border border-gold-300 transition-colors shrink-0 cursor-pointer shadow-xs"
              title="Bulk import tasks from Excel file (.xlsx, .xls)"
            >
              <FileSpreadsheet className="h-4 w-4 text-gold-700" />
              Import from Excel
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingTask(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black text-xs sm:text-sm font-bold rounded-lg shadow-sm border border-gold-600 transition-colors shrink-0 cursor-pointer btn-hover-lift"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Create Task
            </button>
          </div>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-gold-300 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-black/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-white border border-gold-300 rounded-lg text-black font-medium placeholder-black/50 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-white border border-gold-300 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-white border border-gold-300 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="REVIEW">Review</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {!isClient && (
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-white border border-gold-300 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          )}

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold bg-white border border-gold-300 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
          >
            <option value="ALL">All Assignees</option>
            {users
              .filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN')
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Task List Table */}
      {isLoading ? (
        <LoadingSpinner message="Loading task deliverables..." />
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="There are no tasks matching your filters. Create a new task to assign work."
          icon={CheckSquare}
          actionLabel={canManage ? 'Create New Task' : undefined}
          onAction={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-white rounded-xl border border-gold-300 shadow-sm divide-y divide-gold-200 overflow-hidden">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 sm:p-5 hover:bg-gold-50/60 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
            >
              {/* Task Details */}
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {!isClient && <PriorityBadge priority={task.priority} size="sm" />}
                  <span className="text-xs font-bold text-black">
                    {task.project?.name || 'Project'}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-black leading-snug">{task.title}</h3>
                {task.description && (
                  <p className="text-xs text-black/70 line-clamp-1 font-medium">{task.description}</p>
                )}

                <div className="flex items-center gap-4 text-xs text-black/70 font-medium pt-1">
                  <span className="flex items-center gap-1">
                    <UserIcon className="h-3.5 w-3.5 text-gold-600" />
                    {task.assignedTo?.name || 'Unassigned'}
                  </span>
                  {task.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-gold-600" />
                      Due {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gold-200">
                {isClient ? (
                  <StatusBadge status={task.status} size="sm" />
                ) : user?.role === 'TEAM_MEMBER' ? (
                  <div className="flex items-center gap-2">
                    {task.status !== 'REVIEW' && task.status !== 'COMPLETED' && task.assignedToId === user?.id && (
                      <button
                        type="button"
                        onClick={() => setSubmitTask(task)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg cursor-pointer shadow-xs btn-hover-lift"
                      >
                        <Send className="h-3 w-3" />
                        Submit for Client Approval
                      </button>
                    )}

                    {task.status === 'REVIEW' && task.clientApprovalStatus === 'PENDING' && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                        Awaiting Client Approval
                      </span>
                    )}

                    {task.clientApprovalStatus === 'APPROVED' && (
                      <span className="text-[11px] font-extrabold text-black bg-gold-200 border border-gold-400 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                        Client Approved
                      </span>
                    )}

                    <select
                      value={task.status}
                      onChange={(e) => handleQuickStatusChange(task.id, e.target.value as TaskStatus)}
                      disabled={task.status === 'REVIEW' || task.status === 'COMPLETED'}
                      className="text-xs font-bold py-1.5 px-2.5 rounded-lg border border-gold-300 bg-white text-black focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      {task.status === 'REVIEW' && <option value="REVIEW" disabled>In Review</option>}
                      {task.status === 'COMPLETED' && <option value="COMPLETED" disabled>Completed</option>}
                      {task.status === 'REVISION_REQUESTED' && <option value="REVISION_REQUESTED">Revision Requested</option>}
                    </select>
                  </div>
                ) : (
                  <select
                    value={task.status}
                    onChange={(e) => handleQuickStatusChange(task.id, e.target.value as TaskStatus)}
                    className="text-xs font-bold py-1.5 px-2.5 rounded-lg border border-gold-300 bg-white text-black focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REVISION_REQUESTED">Revision Requested</option>
                  </select>
                )}

                {canManage && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(task);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-black hover:bg-gold-100 rounded-md transition-colors cursor-pointer border border-transparent hover:border-gold-300"
                      title="Edit Task"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTask(task)}
                      className="p-1.5 text-black hover:bg-gold-200 rounded-md transition-colors cursor-pointer border border-transparent hover:border-gold-400"
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
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        task={editingTask}
        projects={projects}
        users={users}
      />

      {/* Import Tasks Modal */}
      <ImportTasksModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={loadData}
        projects={projects}
        defaultProjectId={projectFilter !== 'ALL' ? projectFilter : undefined}
      />

      {/* Submit Task for Client Approval Modal */}
      {submitTask && (
        <SubmitTaskModal
          task={submitTask}
          onClose={() => setSubmitTask(null)}
          onSubmitted={async () => {
            setSubmitTask(null);
            await loadData();
          }}
        />
      )}

      {/* Delete Task Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task?"
        message={`Are you sure you want to delete task "${deletingTask?.title}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
};
