import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  DashboardStats,
  RecentProject,
  RecentTask,
  TaskStatus,
  PersonalTodo,
  User,
} from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { TodoModal } from '../components/todos/TodoModal';
import { DeadlineCountdownBadge } from '../components/tasks/DeadlineCountdownBadge';
import { TaskFocusTimerModal } from '../components/tasks/TaskFocusTimerModal';
import { DailyTaskActivityCard } from '../components/dashboard/DailyTaskActivityCard';
import { TaskOverdueReasonModal } from '../components/tasks/TaskOverdueReasonModal';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  FileCheck,
  Users,
  AlertCircle,
  ArrowRight,
  Plus,
  RotateCw,
  ListTodo,
  Check,
  Calendar,
  UserCheck,
  Building,
  Building2,
  Bell,
  Zap,
  Play,
  Timer,
  TrendingUp,
  Activity,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (path: string) => void;
  onOpenNewProject: () => void;
  onOpenClientProject: () => void;
  onOpenNewTask: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenNewProject,
  onOpenClientProject,
  onOpenNewTask,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [internalUsers, setInternalUsers] = useState<User[]>([]);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [focusTimerTask, setFocusTimerTask] = useState<any>(null);
  const [isFocusTimerOpen, setIsFocusTimerOpen] = useState(false);
  const [overdueTask, setOverdueTask] = useState<any>(null);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdminOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';
  const isInternalStaff = !isClient;

  const alarmShownRef = useRef(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const promises: Promise<any>[] = [
        api.getDashboardStats(),
        api.getRecentProjects(),
        api.getRecentTasks(),
      ];
      if (isInternalStaff) {
        promises.push(api.getTodos().catch(() => []));
        promises.push(api.getUsers().catch(() => []));
      }
      const results = await Promise.all(promises);
      setStats(results[0]);
      setRecentProjects(results[1]);
      setRecentTasks(results[2]);
      if (isInternalStaff) {
        setTodos(results[3] || []);
        setInternalUsers(
          (results[4] || []).filter(
            (u: User) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' || u.role === 'TEAM_MEMBER'
          )
        );
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isInternalStaff]);

  useEffect(() => { loadDashboardData(); }, [loadDashboardData]);

  const handleQuickTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      await loadDashboardData();
    } catch (err) { console.error('Failed to update task status:', err); }
  };

  const handleQuickTodoToggle = async (todo: PersonalTodo) => {
    try {
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t)));
      await api.toggleTodo(todo.id);
    } catch (err) { loadDashboardData(); }
  };

  useEffect(() => {
    if (!isClient || !stats?.reviewTasks) return;
    const fireAlarm = () => {
      if (stats.reviewTasks > 0) {
        new Notification('⏰ Pending Approvals Reminder', {
          body: `You have ${stats.reviewTasks} deliverable(s) waiting for your approval.`,
          icon: '/white-ink-logo.png',
        });
      }
    };
    if (Notification.permission === 'granted') {
      if (!alarmShownRef.current) { fireAlarm(); alarmShownRef.current = true; }
      const id = setInterval(fireAlarm, 12 * 60 * 60 * 1000);
      return () => clearInterval(id);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => { if (p === 'granted') fireAlarm(); });
    }
  }, [isClient, stats?.reviewTasks]);

  if (isLoading && !stats) return <LoadingSpinner message="Loading workspace..." size="lg" />;

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const namePrefix = isClient
    ? (user?.name?.split(' ')[0]?.toLowerCase().endsWith('a') || user?.name?.split(' ')[0]?.toLowerCase().endsWith('i') ? 'Ms.' : 'Mr.')
    : '';

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-gold-fade-in">

      {/* Header */}
      {isClient ? (
        <div className="rounded-2xl border border-[#EDE7DD] shadow-xs">
          <div
            className="h-28 sm:h-36 w-full relative rounded-t-2xl"
            style={{
              background: user?.bannerImage
                ? `url(${user.bannerImage}) center/cover no-repeat`
                : 'linear-gradient(135deg, #BA954F 0%, #8C6A2F 50%, #C9A84C 100%)',
            }}
          >
            <div className="absolute -bottom-8 left-5">
              {user?.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-md" />
              ) : (
                <div className="h-16 w-16 rounded-full border-4 border-white bg-[#FAF4EC] flex items-center justify-center text-[#BA954F] font-serif font-bold text-xl shadow-md">
                  {user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white px-5 pb-4 pt-10 rounded-b-2xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-lg font-bold text-[#1C1917]">{namePrefix} {firstName}</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0]">
                  {user?.role?.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={onOpenClientProject}
                  className="px-3.5 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2]" />
                  New Requirement
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/approvals')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
                >
                  <Zap className="h-3.5 w-3.5 stroke-[2]" />
                  Need Urgent Services
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-[#EDE7DD] shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1917]">Welcome back, {firstName}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0]">
                {user?.role?.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-[#78716C]">Here's your workspace overview for today.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadDashboardData}
              className="p-2.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-xl border border-[#EDE7DD] transition-colors cursor-pointer"
              title="Refresh"
            >
              <RotateCw className="h-4 w-4 stroke-[1.75]" />
            </button>
            {isSuperAdminOrAdmin && (
              <>
                <button type="button" onClick={onOpenNewTask} className="px-3.5 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs">
                  <Plus className="h-3.5 w-3.5 stroke-[2]" /> Add Task
                </button>
                <button type="button" onClick={onOpenNewProject} className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift">
                  <Plus className="h-3.5 w-3.5 stroke-[2]" /> New Project
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className={`grid gap-4 ${isSuperAdminOrAdmin ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
          <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">Active Projects</span>
              <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl"><FolderKanban className="h-4 w-4 stroke-[1.75]" /></div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">{stats.activeProjects}</div>
              {isClient ? (
                <button type="button" onClick={() => onNavigate('/projects')} className="mt-2 text-[11px] font-semibold text-[#BA954F] hover:underline cursor-pointer">View More →</button>
              ) : (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-[#78716C]">
                  <span>{stats.totalProjects} total</span><span>·</span><span className="text-[#2D6A4F] font-medium">{stats.completedProjects} done</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">In Progress</span>
              <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl"><CheckCircle2 className="h-4 w-4 stroke-[1.75]" /></div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">{stats.inProgressTasks}</div>
              {isClient ? (
                <button type="button" onClick={() => onNavigate('/tasks')} className="mt-2 text-[11px] font-semibold text-[#BA954F] hover:underline cursor-pointer">View More →</button>
              ) : (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-[#78716C]">
                  <span>{stats.pendingTasks} to do</span><span>·</span><span className="text-[#2D6A4F] font-medium">{stats.completedTasks} done</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">Pending Approvals</span>
              <div className="flex items-center gap-1.5">
                {isClient && stats.reviewTasks > 0 && (
                  <div className="relative">
                    <Bell className="h-4 w-4 text-[#B91C1C] stroke-[1.75]" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#B91C1C] animate-pulse" />
                  </div>
                )}
                <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl"><FileCheck className="h-4 w-4 stroke-[1.75]" /></div>
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">{stats.reviewTasks}</div>
              {isClient ? (
                <button type="button" onClick={() => onNavigate('/approvals')} className="mt-2 text-[11px] font-semibold text-[#B91C1C] hover:underline cursor-pointer">View More →</button>
              ) : (
                <div className="text-xs text-[#78716C] mt-1">deliverables in review</div>
              )}
            </div>
          </div>

          {isSuperAdminOrAdmin && (
            <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">Team Members</span>
                <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl"><Users className="h-4 w-4 stroke-[1.75]" /></div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">{stats.totalTeamMembers}</div>
                <div className="text-xs text-[#78716C] mt-1">{stats.totalClients} client accounts</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Task Lifecycle — Admin only */}
      {isSuperAdminOrAdmin && stats && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#EDE7DD] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#1C1917]">Task Lifecycle</h3>
              <p className="text-xs text-[#78716C] mt-0.5">Current deliverable stage breakdown</p>
            </div>
            <button type="button" onClick={() => onNavigate('/kanban')} className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer">
              Kanban <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'To Do', value: stats.pendingTasks, color: 'bg-[#FAF7F2] border-[#EDE7DD]', text: 'text-[#78716C]' },
              { label: 'In Progress', value: stats.inProgressTasks, color: 'bg-[#FAF4EC] border-[#EDE3D4]', text: 'text-[#BA954F]' },
              { label: 'In Review', value: stats.reviewTasks, color: 'bg-[#FAF2E6] border-[#E8DCC8]', text: 'text-[#946B2D]' },
              { label: 'Completed', value: stats.completedTasks, color: 'bg-[#F0F7F2] border-[#D1E7DD]', text: 'text-[#2D6A4F]' },
            ].map((item) => (
              <div key={item.label} className={`p-4 rounded-xl border ${item.color}`}>
                <div className={`text-xs font-semibold ${item.text}`}>{item.label}</div>
                <div className="text-2xl font-bold text-[#1C1917] mt-1">{item.value}</div>
                <div className={`text-[10px] mt-0.5 ${item.text} opacity-80`}>
                  {stats.totalTasks ? Math.round((item.value / stats.totalTasks) * 100) : 0}% of total
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Projects & Recent Tasks */}
      <div className={`grid grid-cols-1 gap-5 ${!isClient ? 'lg:grid-cols-2' : ''}`}>
        {!isClient && (
          <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE7DD]">
              <div>
                <h3 className="text-sm font-bold text-[#1C1917]">Recent Projects</h3>
                <p className="text-xs text-[#78716C] mt-0.5">Latest status and progress</p>
              </div>
              <button type="button" onClick={() => onNavigate('/projects')} className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer">
                View all <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
              </button>
            </div>
            <div className="divide-y divide-[#F5EFE6]">
              {recentProjects.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#78716C]"><p>No projects found.</p></div>
              ) : (
                recentProjects.map((project) => (
                  <div key={project.id} onClick={() => onNavigate(`/projects/${project.id}`)} className="p-4 hover:bg-[#FAF7F2] cursor-pointer transition-colors space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[#1C1917] truncate">{project.name}</h4>
                        <p className="text-xs text-[#78716C] flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-[#BA954F] shrink-0" />{project.clientName}
                        </p>
                      </div>
                      <StatusBadge status={project.status} size="sm" />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 max-w-[180px]"><ProgressBar progress={project.progress} size="sm" /></div>
                      <DeadlineCountdownBadge dueDate={project.dueDate} status={project.status} size="sm" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE7DD]">
            <div>
              <h3 className="text-sm font-bold text-[#1C1917]">Recent Tasks</h3>
              <p className="text-xs text-[#78716C] mt-0.5">Active deliverables and assignments</p>
            </div>
            <button type="button" onClick={() => onNavigate('/tasks')} className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer">
              View all <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
            </button>
          </div>
          <div className="divide-y divide-[#F5EFE6]">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716C]">No tasks found.</div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onNavigate(`/tasks/${task.id}`)}
                  className="p-4 hover:bg-[#FAF7F2] transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {isInternalStaff && <PriorityBadge priority={task.priority} size="sm" />}
                      <span className="text-xs text-[#78716C] truncate">{task.projectName}</span>
                      {task.dueDate && (
                        <DeadlineCountdownBadge dueDate={task.dueDate} status={task.status} size="sm" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#1C1917] group-hover:text-[#BA954F] transition-colors truncate">{task.title}</p>
                    {task.assignedTo && (
                      <p className="text-[11px] text-[#78716C] mt-0.5">
                        Assigned to <span className="font-semibold text-[#1C1917]">{task.assignedTo.name}</span>
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
                          className="px-2.5 py-1 text-[11px] font-semibold text-[#B91C1C] hover:text-[#991B1B] bg-[#FDF2F0] hover:bg-[#FBE8E6] border border-[#F5D5D0] rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Explain delay reason to Admin"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span>{task.overdueReason ? 'Edit Reason' : 'Explain Delay'}</span>
                        </button>
                    )}

                    {isInternalStaff && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusTimerTask(task);
                          setIsFocusTimerOpen(true);
                        }}
                        className="p-1.5 rounded-xl text-[#BA954F] hover:text-[#A17B2F] hover:bg-[#FAF4EC] border border-[#EDE3D4] transition-colors cursor-pointer"
                        title="Start Focus Timer with Alarm"
                      >
                        <Timer className="h-4 w-4" />
                      </button>
                    )}
                    {isInternalStaff ? (
                      <select
                        value={task.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleQuickTaskStatus(task.id, e.target.value as TaskStatus)}
                        className="text-xs py-1.5 px-2.5 border border-[#DFD5C6] rounded-xl bg-white font-semibold text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer shadow-2xs"
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="REVIEW">Review</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    ) : (
                      <StatusBadge status={task.status} size="sm" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Daily Task Activity & Time Tracking Widget — Internal Staff */}
      {isInternalStaff && (
        <DailyTaskActivityCard onRefresh={loadDashboardData} isAdmin={isSuperAdminOrAdmin} />
      )}

      {/* Todo List — Internal staff only */}
      {isInternalStaff && (
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE7DD]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl"><ListTodo className="h-4 w-4 stroke-[1.75]" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#1C1917]">My Todo List</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0]">
                    {todos.filter((t) => !t.completed).length} pending
                  </span>
                </div>
                <p className="text-xs text-[#78716C] mt-0.5">Your active priorities and delegated tasks</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setIsTodoModalOpen(true)} className="px-3 py-1.5 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs">
                <Plus className="h-3.5 w-3.5 stroke-[2]" /> Add
              </button>
              <button type="button" onClick={() => onNavigate('/todos')} className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer">
                View all <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
              </button>
            </div>
          </div>
          <div className="divide-y divide-[#F5EFE6]">
            {todos.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716C]">
                <CheckCircle2 className="h-6 w-6 mx-auto text-[#B58E4E] mb-2" />
                <p className="font-semibold text-[#1C1917] mb-1">No todos yet</p>
                <button type="button" onClick={() => setIsTodoModalOpen(true)} className="mt-2 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift">
                  <Plus className="h-3.5 w-3.5 stroke-[2]" /> Create First Todo
                </button>
              </div>
            ) : (
              todos.filter((t) => !t.completed).slice(0, 4).map((todo) => {
                const dueDateObj = todo.dueDate ? new Date(todo.dueDate) : null;
                const isOverdue = dueDateObj && new Date(dueDateObj.toDateString()) < new Date(new Date().toDateString());
                return (
                  <div key={todo.id} className="p-4 hover:bg-[#FAF7F2] transition-colors flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button type="button" onClick={() => handleQuickTodoToggle(todo)} className="shrink-0 w-5 h-5 rounded-lg border border-[#DFD5C6] hover:border-[#BA954F] bg-white hover:bg-[#FAF4EC] flex items-center justify-center cursor-pointer transition-colors">
                        {todo.completed && <Check className="h-3.5 w-3.5 stroke-[3] text-[#BA954F]" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1C1917] truncate">{todo.title}</p>
                        <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-[#78716C]">
                          {dueDateObj && (
                            <span className={`inline-flex items-center gap-1 ${isOverdue ? 'text-[#B91C1C] font-semibold' : ''}`}>
                              <Calendar className="h-3 w-3" />
                              {isOverdue ? 'Overdue: ' : ''}{dueDateObj.toLocaleDateString()}
                            </span>
                          )}
                          {todo.assignedTo && (
                            <span className="inline-flex items-center gap-1">
                              <UserCheck className="h-3 w-3 text-[#BA954F]" />
                              {todo.assignedToId === user?.id ? `From ${todo.createdBy?.name || 'Colleague'}` : `→ ${todo.assignedTo.name}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setFocusTimerTask(todo);
                          setIsFocusTimerOpen(true);
                        }}
                        className="p-1.5 rounded-xl text-[#BA954F] hover:text-[#A17B2F] hover:bg-[#FAF4EC] border border-[#EDE3D4] transition-colors cursor-pointer"
                        title="Start Focus Timer with Alarm"
                      >
                        <Timer className="h-3.5 w-3.5" />
                      </button>
                      <button type="button" onClick={() => handleQuickTodoToggle(todo)} className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-xl text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EFE6] border border-[#EDE7DD] transition-colors cursor-pointer">
                        Done
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {todos.length > 0 && todos.filter((t) => !t.completed).length === 0 && (
              <div className="p-4 text-center text-xs text-[#78716C] bg-[#FAF7F2]/40">
                <CheckCircle2 className="h-4 w-4 mx-auto text-[#2D6A4F] mb-1" />
                All caught up — every todo is completed.
              </div>
            )}
          </div>
        </div>
      )}

      <TodoModal
        isOpen={isTodoModalOpen}
        onClose={() => setIsTodoModalOpen(false)}
        onSuccess={loadDashboardData}
        internalMembers={internalUsers}
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
          onTimeLogged={loadDashboardData}
        />
      )}

      {/* Task Overdue Delay Explanation Modal */}
      {overdueTask && (
        <TaskOverdueReasonModal
          isOpen={isOverdueModalOpen}
          onClose={() => {
            setIsOverdueModalOpen(false);
            setOverdueTask(null);
          }}
          task={overdueTask}
          onSuccess={loadDashboardData}
        />
      )}
    </div>
  );
};

