import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task, Project, User, TaskStatus, TaskPriority } from '../types';
import { api } from '../services/api';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { TaskModal } from '../components/tasks/TaskModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import {
  Columns3,
  Plus,
  Calendar,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Trash2,
  Filter,
} from 'lucide-react';

export const KanbanPage: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('ALL');

  // Drag state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Modals
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultColumnStatus, setDefaultColumnStatus] = useState<TaskStatus>('TODO');
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';
  const canManage = !isClient;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [tasksData, projectsData, usersData] = await Promise.all([
        api.getTasks({
          projectId: selectedProjectId !== 'ALL' ? selectedProjectId : undefined,
          assignedToId: selectedAssigneeId !== 'ALL' ? selectedAssigneeId : undefined,
        }),
        api.getProjects(),
        api.getUsers(),
      ]);
      setTasks(tasksData);
      setProjects(projectsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to load kanban data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProjectId, selectedAssigneeId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns: { id: TaskStatus; title: string; color: string; badgeBg: string }[] = [
    { id: 'TODO', title: 'To Do', color: 'border-gold-300', badgeBg: 'bg-gold-100 text-black border border-gold-300' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-gold-400', badgeBg: 'bg-gold-200 text-black border border-gold-400' },
    { id: 'REVIEW', title: 'Review', color: 'border-gold-500', badgeBg: 'bg-gold-300 text-black border border-gold-500' },
    { id: 'COMPLETED', title: 'Completed', color: 'border-gold-400', badgeBg: 'bg-gold-200 text-black border border-gold-400 font-bold' },
  ];

  const handleStatusUpdate = async (taskId: string, newStatus: TaskStatus) => {
    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await api.updateTaskStatus(taskId, newStatus);
      await loadData();
    } catch (err) {
      console.error('Failed to update task status:', err);
      await loadData();
    }
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: TaskStatus) => {
    if (!draggedTaskId) return;
    const taskId = draggedTaskId;
    setDraggedTaskId(null);
    await handleStatusUpdate(taskId, status);
  };

  const getNextStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === 'TODO') return 'IN_PROGRESS';
    if (current === 'IN_PROGRESS') return 'REVIEW';
    if (current === 'REVIEW') return 'COMPLETED';
    return null;
  };

  const getPrevStatus = (current: TaskStatus): TaskStatus | null => {
    if (current === 'COMPLETED') return 'REVIEW';
    if (current === 'REVIEW') return 'IN_PROGRESS';
    if (current === 'IN_PROGRESS') return 'TODO';
    return null;
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
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-black flex items-center gap-2">
            <Columns3 className="h-6 w-6 text-gold-600 stroke-[2.5]" />
            Kanban Task Board
          </h1>
          <p className="text-sm text-black/70 font-medium">
            Drag and drop tasks across lifecycle stages to advance project completion
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setDefaultColumnStatus('TODO');
              setIsTaskModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black text-sm font-bold rounded-lg border border-gold-600 shadow-sm transition-colors shrink-0 cursor-pointer btn-hover-lift"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Add Task
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-gold-300 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-xs font-bold text-black mr-2">
          <Filter className="h-4 w-4 text-gold-600" />
          Filter Board:
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-3 py-1.5 text-xs font-semibold bg-white border border-gold-300 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
        >
          <option value="ALL">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={selectedAssigneeId}
          onChange={(e) => setSelectedAssigneeId(e.target.value)}
          className="px-3 py-1.5 text-xs font-semibold bg-white border border-gold-300 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
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

      {/* Kanban Board Columns */}
      {isLoading ? (
        <LoadingSpinner message="Arranging Kanban columns..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(col.id)}
                className="bg-gold-50/50 border border-gold-300 rounded-xl flex flex-col max-h-[82vh] overflow-hidden"
              >
                {/* Column Header */}
                <div className="p-3 bg-white border-b border-gold-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-black">
                      {col.title}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.badgeBg}`}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTask(null);
                        setDefaultColumnStatus(col.id);
                        setIsTaskModalOpen(true);
                      }}
                      className="p-1 text-black/60 hover:text-black hover:bg-gold-100 rounded-md transition-colors cursor-pointer"
                      title={`Add task to ${col.title}`}
                    >
                      <Plus className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>

                {/* Tasks Container */}
                <div className="p-3 space-y-3 overflow-y-auto flex-1">
                  {colTasks.length === 0 ? (
                    <div className="py-8 text-center border-2 border-dashed border-gold-300 rounded-lg text-xs font-semibold text-black/50">
                      Drag tasks here
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const next = getNextStatus(task.status);
                      const prev = getPrevStatus(task.status);

                      return (
                        <div
                          key={task.id}
                          draggable={canManage}
                          onDragStart={() => canManage && handleDragStart(task.id)}
                          className={`bg-white p-3.5 rounded-lg border border-gold-300 shadow-sm hover:border-gold-400 transition-all ${
                            canManage ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
                          } space-y-2.5 group card-hover-lift`}
                        >
                          {/* Priority & Actions */}
                          <div className="flex items-center justify-between gap-1">
                            {!isClient ? (
                              <PriorityBadge priority={task.priority} size="sm" />
                            ) : (
                              <div />
                            )}
                            {canManage && (
                              <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTask(task);
                                    setIsTaskModalOpen(true);
                                  }}
                                  className="p-1 text-black/60 hover:text-black hover:bg-gold-100 rounded-md cursor-pointer"
                                  title="Edit Task"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeletingTask(task)}
                                  className="p-1 text-black/60 hover:text-rose-700 hover:bg-gold-100 rounded-md cursor-pointer"
                                  title="Delete Task"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Task Project & Title */}
                          <div>
                            <span className="text-[11px] font-bold text-gold-700 truncate block">
                              {task.project?.name || 'Project'}
                            </span>
                            <h4 className="text-sm font-bold text-black leading-snug mt-0.5">
                              {task.title}
                            </h4>
                          </div>

                          {task.description && (
                            <p className="text-xs text-black/70 font-medium line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Footer: Assignee, Due Date, Move arrows */}
                          <div className="flex items-center justify-between pt-2 border-t border-gold-200 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {task.assignedTo ? (
                                <img
                                  src={
                                    task.assignedTo.profileImage ||
                                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                      task.assignedTo.name
                                    )}`
                                  }
                                  alt={task.assignedTo.name}
                                  title={task.assignedTo.name}
                                  className="h-5 w-5 rounded-full ring-1 ring-gold-400 object-cover"
                                />
                              ) : (
                                <span className="text-[10px] text-black/40 font-medium">Unassigned</span>
                              )}
                              {task.dueDate && (
                                <span className="text-[10px] text-black/70 font-semibold flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-gold-600" />
                                  {new Date(task.dueDate).toLocaleDateString(undefined, {
                                    month: 'numeric',
                                    day: 'numeric',
                                  })}
                                </span>
                              )}
                            </div>

                            {/* Move buttons */}
                            {canManage && (
                              <div className="flex items-center gap-1">
                                {prev && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(task.id, prev)}
                                    className="p-1 text-black/60 hover:text-black hover:bg-gold-100 rounded-md cursor-pointer"
                                    title={`Move to ${prev.replace('_', ' ')}`}
                                  >
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {next && (
                                  <button
                                    type="button"
                                    onClick={() => handleStatusUpdate(task.id, next)}
                                    className="p-1 text-black/60 hover:text-black hover:bg-gold-100 rounded-md cursor-pointer"
                                    title={`Move to ${next.replace('_', ' ')}`}
                                  >
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={loadData}
        task={editingTask}
        projects={projects}
        users={users}
        defaultStatus={defaultColumnStatus}
      />

      {/* Delete Task Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task?"
        message={`Are you sure you want to delete "${deletingTask?.title}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
};
