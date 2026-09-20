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
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
      );
      await api.toggleTodo(todo.id);
    } catch (err: any) {
      console.error('Failed to toggle todo:', err);
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
      if (activeTab === 'PENDING' && todo.completed) return false;
      if (activeTab === 'COMPLETED' && !todo.completed) return false;
      if (activeTab === 'ASSIGNED_TO_ME' && todo.assignedToId !== user?.id) return false;
      if (activeTab === 'CREATED_BY_ME' && todo.createdById !== user?.id) return false;

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

  const isSuperAdminOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-widest uppercase text-[#BA954F]">
            Task Lists & Agendas
          </span>
          <h1 className="font-serif text-3xl font-bold text-neutral-900 tracking-tight mt-1 flex items-center gap-2.5">
            <ListTodo className="h-7 w-7 text-[#BA954F]" />
            <span>Personal Todos</span>
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage your daily tasks, priority checklists, and internal studio assignments
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEditingTodo(null);
              setIsModalOpen(true);
            }}
            className="btn-gold-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Todo</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-[#FDF0ED] border border-[#F5D0C5] text-[#9E2A2B] rounded-2xl text-xs font-medium flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#9E2A2B] shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadTodos}
            className="underline hover:text-red-900 cursor-pointer font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Section: Search, Tabs & Todo List */}
      <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Controls: Search and Tabs */}
        <div className="p-4 sm:p-5 border-b border-[#EDE7DD] bg-[#FAF7F2]/40 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-[#BA954F] text-white shadow-xs border-[#BA954F] font-semibold'
                      : 'bg-white text-neutral-600 hover:bg-[#FAF7F2] hover:text-neutral-900 border-[#EDE7DD]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? 'bg-white text-[#BA954F] font-bold'
                        : 'bg-[#FAF7F2] text-neutral-500'
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search todos..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#EDE7DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#BA954F] font-medium text-neutral-900 placeholder:text-neutral-400"
            />
          </div>
        </div>

        {/* Todo List Container */}
        <div className="p-5 sm:p-6">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner message="Loading your todos..." size="md" />
            </div>
          ) : filteredTodos.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-500 font-medium">
              <CheckSquare className="h-8 w-8 mx-auto text-[#BA954F] mb-2 opacity-60" />
              <p className="font-serif text-base font-bold text-neutral-900 mb-1">No todos found</p>
              <p className="text-neutral-400 max-w-sm mx-auto">
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
                  className="btn-gold-primary mt-4 px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create First Todo
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

