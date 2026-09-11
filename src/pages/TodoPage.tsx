import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { PersonalTodo, User } from '../types';
import { api } from '../services/api';
import { TodoCard } from '../components/todos/TodoCard';
import { TodoModal } from '../components/todos/TodoModal';
import { TodoDeleteDialog } from '../components/todos/TodoDeleteDialog';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  CheckSquare,
  ListTodo,
  Plus,
  Search,
  RotateCw,
  Clock,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  Filter,
} from 'lucide-react';

type TabType = 'ALL' | 'PENDING' | 'COMPLETED' | 'ASSIGNED_TO_ME' | 'CREATED_BY_ME';

export const TodoPage: React.FC = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<PersonalTodo | null>(null);
  const [deletingTodo, setDeletingTodo] = useState<PersonalTodo | null>(null);

  const loadTodos = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [todosData, usersData] = await Promise.all([
        api.getTodos(),
        api.getUsers().catch(() => []),
      ]);
      setTodos(todosData);
      setUsers(
        usersData.filter(
          (u: User) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' || u.role === 'TEAM_MEMBER'
        )
      );
    } catch (err: any) {
      console.error('Failed to load todos:', err);
      setError(err.message || 'Failed to load todos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Handle Toggle
  const handleToggle = async (todo: PersonalTodo) => {
    try {
      // Optimistic update
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
      );
      await api.toggleTodo(todo.id);
    } catch (err: any) {
      console.error('Failed to toggle todo:', err);
      // Revert on error
      loadTodos();
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingTodo) return;
    try {
      await api.deleteTodo(deletingTodo.id);
      setTodos((prev) => prev.filter((t) => t.id !== deletingTodo.id));
      setDeletingTodo(null);
    } catch (err: any) {
      console.error('Failed to delete todo:', err);
      setError(err.message || 'Failed to delete todo');
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const pending = total - completed;
    const assignedToMe = todos.filter(
      (t) => t.assignedToId === user?.id && t.createdById !== user?.id
    ).length;
    return { total, completed, pending, assignedToMe };
  }, [todos, user?.id]);

  // Filtered Todos
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      // Tab filter
      if (activeTab === 'PENDING' && todo.completed) return false;
      if (activeTab === 'COMPLETED' && !todo.completed) return false;
      if (activeTab === 'ASSIGNED_TO_ME' && todo.assignedToId !== user?.id) return false;
      if (activeTab === 'CREATED_BY_ME' && todo.createdById !== user?.id) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = todo.title.toLowerCase().includes(q);
        const matchesDesc = todo.description?.toLowerCase().includes(q);
        const matchesAssignee = todo.assignedTo?.name.toLowerCase().includes(q);
        const matchesCreator = todo.createdBy?.name.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesAssignee && !matchesCreator) {
          return false;
        }
      }

      return true;
    });
  }, [todos, activeTab, searchQuery, user?.id]);

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'ALL', label: 'All', count: stats.total },
    { id: 'PENDING', label: 'Pending', count: stats.pending },
    { id: 'COMPLETED', label: 'Completed', count: stats.completed },
    { id: 'ASSIGNED_TO_ME', label: 'Assigned to Me', count: stats.assignedToMe },
    {
      id: 'CREATED_BY_ME',
      label: 'Created by Me',
      count: todos.filter((t) => t.createdById === user?.id).length,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-gold-300 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-black flex items-center gap-2.5">
              <ListTodo className="h-7 w-7 text-gold-600" />
              <span>My Todo List</span>
            </h1>
          </div>
          <p className="text-sm text-black/70 font-medium">
            Manage your daily personal tasks, checklists, and internal assignments
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadTodos}
            className="p-2 text-black hover:bg-gold-100 rounded-lg border border-gold-300 transition-colors cursor-pointer"
            title="Refresh todos"
          >
            <RotateCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingTodo(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 rounded-lg shadow-sm border border-gold-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Todo</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-300 text-red-900 rounded-xl text-xs font-bold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadTodos}
            className="underline hover:text-red-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Bento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-xl border border-gold-300 shadow-2xs">
          <div className="text-xs font-bold text-black/70">Total Todos</div>
          <div className="text-2xl font-extrabold text-black mt-1">{stats.total}</div>
          <div className="text-[11px] text-black/50 font-medium mt-0.5">All active & finished</div>
        </div>

        <div className="p-4 bg-gold-50 rounded-xl border border-gold-300 shadow-2xs">
          <div className="text-xs font-bold text-black flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-gold-700" />
            <span>Pending</span>
          </div>
          <div className="text-2xl font-extrabold text-black mt-1">{stats.pending}</div>
          <div className="text-[11px] text-black/60 font-medium mt-0.5">Needs action</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-gold-300 shadow-2xs">
          <div className="text-xs font-bold text-black flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-gold-600" />
            <span>Completed</span>
          </div>
          <div className="text-2xl font-extrabold text-black mt-1">{stats.completed}</div>
          <div className="text-[11px] text-black/50 font-medium mt-0.5">
            {stats.total ? Math.round((stats.completed / stats.total) * 100) : 0}% done
          </div>
        </div>

        <div className="p-4 bg-gold-100 rounded-xl border border-gold-300 shadow-2xs">
          <div className="text-xs font-bold text-black flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-black" />
            <span>Assigned to Me</span>
          </div>
          <div className="text-2xl font-extrabold text-black mt-1">{stats.assignedToMe}</div>
          <div className="text-[11px] text-black/70 font-medium mt-0.5">From team members</div>
        </div>
      </div>

      {/* Main Section: Search, Tabs & Todo List */}
      <div className="bg-white rounded-xl border border-gold-300 shadow-sm overflow-hidden">
        {/* Controls: Search and Tabs */}
        <div className="p-4 border-b border-gold-200 bg-gold-50/50 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gold-500 text-black shadow-xs border border-gold-600'
                      : 'text-black/80 hover:bg-gold-200/70 hover:text-black border border-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white text-black font-extrabold'
                        : 'bg-gold-200 text-black/80'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search todos..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gold-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 font-medium text-black placeholder:text-black/40"
            />
          </div>
        </div>

        {/* Todo List Container */}
        <div className="p-4 sm:p-5">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner message="Loading your todos..." size="md" />
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="py-12 text-center text-xs text-black/60 font-medium">
              <CheckSquare className="h-8 w-8 mx-auto text-gold-400 mb-2" />
              <p className="text-sm font-bold text-black mb-1">No todos found</p>
              <p className="text-black/60">
                {searchQuery
                  ? 'No todo items match your search query.'
                  : activeTab === 'COMPLETED'
                  ? 'You have not completed any todos yet.'
                  : activeTab === 'PENDING'
                  ? 'No pending todos! You are all caught up.'
                  : activeTab === 'ASSIGNED_TO_ME'
                  ? 'No todos currently assigned to you.'
                  : 'Start by creating your first personal todo.'}
              </p>
              {!searchQuery && activeTab === 'ALL' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTodo(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-3.5 px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 rounded-lg shadow-2xs border border-gold-600 transition-colors inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  Create First Todo
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredTodos.map((todo) => (
                <TodoCard
                  key={todo.id}
                  todo={todo}
                  onToggle={handleToggle}
                  onEdit={(t) => {
                    setEditingTodo(t);
                    setIsModalOpen(true);
                  }}
                  onDelete={(t) => setDeletingTodo(t)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <TodoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTodo(null);
        }}
        onSuccess={loadTodos}
        todo={editingTodo}
        internalMembers={users}
      />

      {/* Delete Confirmation Modal */}
      <TodoDeleteDialog
        isOpen={Boolean(deletingTodo)}
        onClose={() => setDeletingTodo(null)}
        onConfirm={handleDeleteConfirm}
        todo={deletingTodo}
      />
    </div>
  );
};
