import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  DashboardStats,
  RecentProject,
  RecentTask,
  TaskStatus,
  Attendance,
  AttendanceStats,
  Milestone,
  ClientApproval,
  PersonalTodo,
  User,
} from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AttendanceStatusBadge } from '../components/attendance/AttendanceStatusBadge';
import { QuickActionsCard } from '../components/dashboard/QuickActionsCard';
import { TodoModal } from '../components/todos/TodoModal';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Plus,
  RotateCw,
  Flag,
  FileCheck,
  ListTodo,
  Check,
  Calendar,
  UserCheck,
  MessageSquare,
  Sparkles,
  Layers,
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
  const [upcomingMilestones, setUpcomingMilestones] = useState<Milestone[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ClientApproval[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [todos, setTodos] = useState<PersonalTodo[]>([]);
  const [internalUsers, setInternalUsers] = useState<User[]>([]);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdminOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';
  const isInternalStaff = !isClient;

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const promises: Promise<any>[] = [
        api.getDashboardStats(),
        api.getRecentProjects(),
        api.getRecentTasks(),
        api.getMilestones().catch(() => []),
        api.getApprovals().catch(() => []),
      ];

      if (isInternalStaff) {
        promises.push(api.getTodayAttendance().catch(() => ({ attendance: null })));
        promises.push(api.getAttendanceStats().catch(() => null));
        promises.push(api.getTodos().catch(() => []));
        promises.push(api.getUsers().catch(() => []));
      }

      const results = await Promise.all(promises);
      setStats(results[0]);
      setRecentProjects(results[1]);
      setRecentTasks(results[2]);
      setUpcomingMilestones(results[3].slice(0, 4));
      setPendingApprovals(results[4].filter((a: any) => a.status === 'PENDING').slice(0, 3));

      if (isInternalStaff) {
        setTodayAttendance(results[5]?.attendance || null);
        setAttendanceStats(results[6] || null);
        setTodos(results[7] || []);
        setInternalUsers(
          (results[8] || []).filter(
            (u: User) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' || u.role === 'TEAM_MEMBER'
          )
        );
      }
    } catch (err: any) {
      console.error('Error fetching dashboard metrics:', err);
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [user, isInternalStaff]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleQuickTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await api.updateTaskStatus(taskId, newStatus);
      await loadDashboardData();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleQuickTodoToggle = async (todo: PersonalTodo) => {
    try {
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t))
      );
      await api.toggleTodo(todo.id);
    } catch (err) {
      console.error('Failed to toggle todo status:', err);
      loadDashboardData();
    }
  };

  if (isLoading && !stats) {
    return <LoadingSpinner message="Loading studio workspace..." size="lg" />;
  }

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Header Banner - White Ink Style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/95 backdrop-blur-xs p-5 sm:p-6 rounded-2xl border border-[#EDE7DD] shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1C1917]">
              Hi, {firstName} 👋
            </h1>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0]">
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#78716C] font-normal">
            {isClient
              ? "Here's what's happening with your brand and active projects today."
              : "Here's what's on your studio plate today."}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={loadDashboardData}
            className="p-2.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-xl border border-[#EDE7DD] transition-colors cursor-pointer"
            title="Refresh statistics"
          >
            <RotateCw className="h-4 w-4 stroke-[1.75]" />
          </button>

          {isSuperAdminOrAdmin && (
            <>
              <button
                type="button"
                onClick={onOpenNewTask}
                className="px-3.5 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2]" />
                Add Task
              </button>
              <button
                type="button"
                onClick={onOpenNewProject}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2]" />
                New Project
              </button>
            </>
          )}

          {isClient && (
            <button
              type="button"
              onClick={onOpenClientProject}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2]" />
              New Requirement
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Metrics Grid - White Ink Style */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Projects */}
          <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
                Active Projects
              </span>
              <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl shadow-2xs">
                <FolderKanban className="h-4 w-4 stroke-[1.75]" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight">
                {stats.activeProjects}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-[#78716C]">
                <span>{stats.totalProjects} total</span>
                <span>•</span>
                <span className="text-[#2D6A4F] font-medium">{stats.completedProjects} done</span>
              </div>
            </div>
          </div>

          {/* Total Tasks / In Progress */}
          <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
                In Progress Tasks
              </span>
              <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl shadow-2xs">
                <CheckCircle2 className="h-4 w-4 stroke-[1.75]" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight">
                {stats.inProgressTasks}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-[#78716C]">
                <span>{stats.pendingTasks} to do</span>
                <span>•</span>
                <span className="text-[#2D6A4F] font-medium">{stats.completedTasks} done</span>
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
                Pending Approvals
              </span>
              <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl shadow-2xs">
                <FileCheck className="h-4 w-4 stroke-[1.75]" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight">
                {pendingApprovals.length}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-[#78716C]">
                <span>{stats.reviewTasks} deliverables in review</span>
              </div>
            </div>
          </div>

          {/* Avg Progress / Team Members */}
          <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
                {isClient ? 'Avg. Progress' : 'Studio Team'}
              </span>
              <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl shadow-2xs">
                {isClient ? (
                  <TrendingUp className="h-4 w-4 stroke-[1.75]" />
                ) : (
                  <Users className="h-4 w-4 stroke-[1.75]" />
                )}
              </div>
            </div>
            <div>
              {isClient ? (
                <div>
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight">
                    {stats.averageProjectProgress}%
                  </div>
                  <div className="mt-1.5">
                    <ProgressBar progress={stats.averageProjectProgress} size="sm" showLabel={false} />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight">
                    {stats.totalTeamMembers}
                  </div>
                  <div className="text-xs text-[#78716C] mt-1">
                    {stats.totalClients} client accounts managed
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions & Studio Attendance Section (Internal Staff & Admins) */}
      {isInternalStaff && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Quick Actions Card matching user reference image */}
          <div className="lg:col-span-1">
            <QuickActionsCard
              attendance={todayAttendance}
              onAttendanceChange={loadDashboardData}
              onOpenNewTask={onOpenNewTask}
              onOpenNewTodo={() => setIsTodoModalOpen(true)}
              isAdmin={isSuperAdminOrAdmin}
            />
          </div>

          {/* Right Column: Studio Shift & Attendance Overview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-[#EDE7DD] p-6 shadow-xs flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#EDE7DD]">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-[#FAF4EC] text-[#BA954F] rounded-xl border border-[#EDE3D4] shadow-2xs">
                      <Clock className="h-5 w-5 stroke-[1.75]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-serif font-bold text-[#1C1917]">
                          Today's Studio Shift & Attendance
                        </h3>
                        {todayAttendance?.activeBreak && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0] animate-pulse">
                            On Break
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#78716C] font-normal mt-0.5">
                        Live attendance status, work tracking and break duration
                      </p>
                    </div>
                  </div>
                  {todayAttendance?.status && (
                    <AttendanceStatusBadge status={todayAttendance.status} size="sm" />
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
                  <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#EDE7DD]">
                    <div className="text-[11px] font-semibold text-[#78716C]">Clock In</div>
                    <div className="text-sm sm:text-base font-serif font-bold text-[#1C1917] mt-0.5">
                      {todayAttendance?.clockIn
                        ? new Date(todayAttendance.clockIn).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#EDE7DD]">
                    <div className="text-[11px] font-semibold text-[#78716C]">Breaks Logged</div>
                    <div className="text-sm sm:text-base font-serif font-bold text-[#1C1917] mt-0.5">
                      {todayAttendance?.breaks?.length || 0} session(s)
                    </div>
                  </div>

                  <div className="p-3.5 bg-[#FAF4EC] rounded-xl border border-[#EDE3D4] col-span-2 sm:col-span-1">
                    <div className="text-[11px] font-semibold text-[#BA954F]">Effective Time</div>
                    <div className="text-sm sm:text-base font-serif font-bold text-[#1C1917] mt-0.5">
                      {todayAttendance?.effectiveWorkingMinutes
                        ? `${Math.floor(todayAttendance.effectiveWorkingMinutes / 60)}h ${
                            todayAttendance.effectiveWorkingMinutes % 60
                          }m`
                        : todayAttendance?.clockIn && !todayAttendance?.clockOut
                        ? 'Tracking...'
                        : '0h 0m'}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#FAF7F2]/60 border border-[#EDE7DD] text-xs text-[#78716C]">
                  {!todayAttendance?.clockIn ? (
                    <span>💡 You haven't clocked in yet. Use the <strong>Mark Present</strong> button on the left to start your shift.</span>
                  ) : todayAttendance?.clockOut ? (
                    <span>✅ Your shift has ended today. Total logged working time: <strong>{Math.floor(todayAttendance.effectiveWorkingMinutes / 60)}h {todayAttendance.effectiveWorkingMinutes % 60}m</strong>.</span>
                  ) : todayAttendance?.activeBreak ? (
                    <span>☕ You are currently on break. Click <strong>End Lunch Break</strong> on the left when you're back.</span>
                  ) : (
                    <span>⏱️ Your shift is active. You can start a break or mark exit directly from the Quick Actions menu.</span>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#EDE7DD] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {attendanceStats ? (
                  <div className="flex items-center gap-4 text-xs text-[#57534E] font-medium">
                    <div>
                      <span className="font-bold text-[#1C1917]">{attendanceStats.presentToday}</span> Present Today
                    </div>
                    <div>
                      <span className="font-bold text-[#1C1917]">{attendanceStats.currentlyWorking}</span> Active
                    </div>
                    <div>
                      <span className="font-bold text-[#1C1917]">{attendanceStats.onBreak}</span> On Break
                    </div>
                  </div>
                ) : (
                  <div />
                )}

                <button
                  type="button"
                  onClick={() => onNavigate('/attendance')}
                  className="px-4 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>Full Attendance Sheet</span>
                  <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress & Overview Bento (Admin & Super Admin only) */}
      {isSuperAdminOrAdmin && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Project Completion Gauge */}
          <div className="bg-white p-6 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-serif font-bold text-[#1C1917]">Project Completion</h3>
                <span className="text-xs font-bold font-mono text-[#BA954F]">
                  {stats.averageProjectProgress}%
                </span>
              </div>
              <p className="text-xs text-[#78716C] font-normal mb-4">
                Average deliverable completion across all active studio pipelines
              </p>
              <ProgressBar progress={stats.averageProjectProgress} size="lg" />
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-6 pt-4 border-t border-[#EDE7DD] text-xs">
              <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EDE7DD]">
                <div className="text-[#78716C] font-normal">Planning</div>
                <div className="text-base font-serif font-bold text-[#1C1917]">
                  {stats.planningProjects}
                </div>
              </div>
              <div className="p-3 bg-[#FAF4EC] rounded-xl border border-[#EDE3D4]">
                <div className="text-[#BA954F] font-medium">Active</div>
                <div className="text-base font-serif font-bold text-[#1C1917]">
                  {stats.activeProjects}
                </div>
              </div>
            </div>
          </div>

          {/* Task Status Breakdown */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#EDE7DD] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1C1917]">Task Lifecycle Distribution</h3>
                <p className="text-xs text-[#78716C] font-normal">Breakdown of current deliverable stages</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/kanban')}
                className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer"
              >
                Open Kanban <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]">
                <div className="text-xs font-semibold text-[#78716C]">To Do</div>
                <div className="text-xl font-serif font-bold text-[#1C1917] mt-1">{stats.pendingTasks}</div>
                <div className="text-[10px] text-[#A8A29E] mt-0.5 font-mono">
                  {stats.totalTasks ? Math.round((stats.pendingTasks / stats.totalTasks) * 100) : 0}% of tasks
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#EDE3D4] bg-[#FAF4EC]">
                <div className="text-xs font-semibold text-[#BA954F]">In Progress</div>
                <div className="text-xl font-serif font-bold text-[#1C1917] mt-1">{stats.inProgressTasks}</div>
                <div className="text-[10px] text-[#BA954F]/80 mt-0.5 font-mono">
                  {stats.totalTasks ? Math.round((stats.inProgressTasks / stats.totalTasks) * 100) : 0}% of tasks
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#E8DCC8] bg-[#FAF2E6]">
                <div className="text-xs font-semibold text-[#946B2D]">In Review</div>
                <div className="text-xl font-serif font-bold text-[#1C1917] mt-1">{stats.reviewTasks}</div>
                <div className="text-[10px] text-[#946B2D]/80 mt-0.5 font-mono">
                  {stats.totalTasks ? Math.round((stats.reviewTasks / stats.totalTasks) * 100) : 0}% of tasks
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#D1E7DD] bg-[#F0F7F2]">
                <div className="text-xs font-semibold text-[#2D6A4F]">Completed</div>
                <div className="text-xl font-serif font-bold text-[#1C1917] mt-1">{stats.completedTasks}</div>
                <div className="text-[10px] text-[#2D6A4F]/80 mt-0.5 font-mono">
                  {stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% of tasks
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Milestones and Pending Approvals Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Approvals Widget */}
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#EDE7DD] bg-[#FAF7F2]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl">
                  <FileCheck className="h-4 w-4 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1C1917]">
                    {isClient ? 'Deliverables Awaiting Your Review' : 'Client Approval Requests'}
                  </h3>
                  <p className="text-[11px] text-[#78716C] font-normal">
                    {pendingApprovals.length} pending client sign-off
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/approvals')}
                className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
              </button>
            </div>

            <div className="divide-y divide-[#F5EFE6]">
              {pendingApprovals.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#78716C] font-normal">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-[#2D6A4F] mb-1.5" />
                  All deliverables have been reviewed and approved.
                </div>
              ) : (
                pendingApprovals.map((appr) => (
                  <div
                    key={appr.id}
                    onClick={() => onNavigate('/approvals')}
                    className="p-4 hover:bg-[#FAF7F2] cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#1C1917] truncate">{appr.title}</div>
                      <div className="text-[11px] text-[#78716C] mt-0.5 truncate font-normal">
                        {appr.project?.name} • Submitted {new Date(appr.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0]">
                      Pending Review
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Milestones Widget */}
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#EDE7DD] bg-[#FAF7F2]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl">
                  <Flag className="h-4 w-4 stroke-[1.75]" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1C1917]">Key Milestones</h3>
                  <p className="text-[11px] text-[#78716C] font-normal">Major target dates and completion goals</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/milestones')}
                className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
              </button>
            </div>

            <div className="divide-y divide-[#F5EFE6]">
              {upcomingMilestones.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#78716C] font-normal">
                  <Flag className="h-6 w-6 mx-auto text-[#B58E4E] mb-1.5" />
                  No upcoming milestones configured yet.
                </div>
              ) : (
                upcomingMilestones.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => onNavigate('/milestones')}
                    className="p-4 hover:bg-[#FAF7F2] cursor-pointer transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#1C1917] truncate">{m.name}</span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          m.status === 'COMPLETED'
                            ? 'bg-[#F0F7F2] text-[#2D6A4F] border-[#D1E7DD]'
                            : m.status === 'DELAYED'
                            ? 'bg-[#FDF2F0] text-[#B91C1C] border-[#F5D5D0]'
                            : 'bg-[#FAF4EC] text-[#BA954F] border-[#EAE0D0]'
                        }`}
                      >
                        {m.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#78716C] font-normal">
                      <span className="truncate max-w-[180px]">{m.project?.name}</span>
                      <span className="font-mono">
                        {m.dueDate ? `Target: ${new Date(m.dueDate).toLocaleDateString()}` : 'No date'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* My Personal Todo Widget (Internal staff only) */}
      {isInternalStaff && (
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#EDE7DD] bg-[#FAF7F2]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl">
                <ListTodo className="h-4 w-4 stroke-[1.75]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-serif font-bold text-[#1C1917]">My Todo List</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0]">
                    {todos.filter((t) => !t.completed).length} pending
                  </span>
                  {todos.filter((t) => t.completed).length > 0 && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white text-[#78716C] border border-[#EDE7DD] hidden sm:inline-block">
                      {todos.filter((t) => t.completed).length} completed
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#78716C] font-normal">
                  Your active checklists, daily priorities, and delegated tasks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTodoModalOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2]" />
                <span>Add Todo</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/todos')}
                className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer"
              >
                View all <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[#F5EFE6]">
            {todos.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716C] font-normal">
                <CheckCircle2 className="h-6 w-6 mx-auto text-[#B58E4E] mb-1.5" />
                <p className="font-semibold text-[#1C1917] mb-0.5">No todos found</p>
                <p>You have no personal todos right now.</p>
                <button
                  type="button"
                  onClick={() => setIsTodoModalOpen(true)}
                  className="mt-3 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2]" />
                  <span>Create First Todo</span>
                </button>
              </div>
            ) : (
              todos
                .filter((t) => !t.completed)
                .slice(0, 4)
                .map((todo) => {
                  const hasDueDate = Boolean(todo.dueDate);
                  const dueDateObj = todo.dueDate ? new Date(todo.dueDate) : null;
                  const isOverdue =
                    dueDateObj &&
                    new Date(dueDateObj.toDateString()) < new Date(new Date().toDateString());

                  return (
                    <div
                      key={todo.id}
                      className="p-4 hover:bg-[#FAF7F2] transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => handleQuickTodoToggle(todo)}
                          className="shrink-0 w-5 h-5 rounded-lg border border-[#DFD5C6] hover:border-[#BA954F] bg-white hover:bg-[#FAF4EC] flex items-center justify-center cursor-pointer transition-colors"
                          title="Mark as completed"
                        >
                          {todo.completed && <Check className="h-3.5 w-3.5 stroke-[3] text-[#BA954F]" />}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#1C1917] truncate">{todo.title}</p>
                          <div className="flex items-center gap-2.5 mt-0.5 text-[11px] text-[#78716C] font-normal">
                            {hasDueDate && (
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  isOverdue ? 'text-[#B91C1C] font-semibold' : ''
                                }`}
                              >
                                <Calendar className="h-3 w-3" />
                                {isOverdue ? 'Overdue: ' : ''}
                                {dueDateObj?.toLocaleDateString()}
                              </span>
                            )}
                            {todo.assignedTo && (
                              <span className="inline-flex items-center gap-1">
                                <UserCheck className="h-3 w-3 text-[#BA954F]" />
                                {todo.assignedToId === user?.id ? (
                                  <>From {todo.createdBy?.name || 'Colleague'}</>
                                ) : (
                                  <>Assigned to {todo.assignedTo.name}</>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleQuickTodoToggle(todo)}
                        className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-xl text-[#57534E] hover:text-[#1C1917] hover:bg-[#F5EFE6] border border-[#EDE7DD] transition-colors cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  );
                })
            )}

            {todos.length > 0 && todos.filter((t) => !t.completed).length === 0 && (
              <div className="p-4 text-center text-xs text-[#78716C] font-normal bg-[#FAF7F2]/40">
                <CheckCircle2 className="h-4 w-4 mx-auto text-[#2D6A4F] mb-1" />
                All caught up! All your todos are marked as completed.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Projects & Recent Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#EDE7DD] bg-[#FAF7F2]">
            <div>
              <h3 className="text-sm font-serif font-bold text-[#1C1917]">Recent Projects</h3>
              <p className="text-xs text-[#78716C] font-normal">Track latest status and deliverables</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/projects')}
              className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
            </button>
          </div>

          <div className="divide-y divide-[#F5EFE6]">
            {recentProjects.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716C] font-normal">
                <p>No projects found.</p>
                {isClient && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={onOpenClientProject}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2]" />
                      Create New Project
                    </button>
                  </div>
                )}
              </div>
            ) : (
              recentProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onNavigate(`/projects/${project.id}`)}
                  className="p-4 hover:bg-[#FAF7F2] cursor-pointer transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#1C1917] hover:text-[#BA954F] transition-colors truncate">
                        {project.name}
                      </h4>
                      <p className="text-xs text-[#78716C] flex items-center gap-1.5 mt-0.5 font-normal">
                        <Building2 className="h-3 w-3 text-[#BA954F]" />
                        {project.clientName}
                      </p>
                    </div>
                    <StatusBadge status={project.status} size="sm" />
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="w-48">
                      <ProgressBar progress={project.progress} size="sm" />
                    </div>
                    <div className="text-[11px] text-[#A8A29E] font-mono shrink-0">
                      {project.dueDate ? `Due ${new Date(project.dueDate).toLocaleDateString()}` : 'No deadline'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-[#EDE7DD] bg-[#FAF7F2]">
            <div>
              <h3 className="text-sm font-serif font-bold text-[#1C1917]">Recent Tasks</h3>
              <p className="text-xs text-[#78716C] font-normal">Active deliverables and assignments</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/tasks')}
              className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer"
            >
              View all <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
            </button>
          </div>

          <div className="divide-y divide-[#F5EFE6]">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716C] font-normal">No tasks found.</div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 hover:bg-[#FAF7F2] transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isInternalStaff && <PriorityBadge priority={task.priority} size="sm" />}
                      <span className="text-xs text-[#78716C] font-normal truncate">
                        {task.projectName}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#1C1917] truncate">{task.title}</p>
                    {task.assignedTo && (
                      <p className="text-[11px] text-[#78716C] mt-1 flex items-center gap-1 font-normal">
                        Assigned to: <span className="font-semibold text-[#1C1917]">{task.assignedTo.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isInternalStaff ? (
                      <select
                        value={task.status}
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

      {/* Add Todo Modal for Quick Creation */}
      <TodoModal
        isOpen={isTodoModalOpen}
        onClose={() => setIsTodoModalOpen(false)}
        onSuccess={loadDashboardData}
        internalMembers={internalUsers}
      />
    </div>
  );
};
