import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  DashboardStats,
  RecentProject,
  RecentTask,
  TaskStatus,
  Attendance,
} from '../types';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DashboardAttendanceCard } from '../components/dashboard/DashboardAttendanceCard';
import { DashboardTodayTasksCard } from '../components/dashboard/DashboardTodayTasksCard';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertCircle,
  Plus,
  Calendar,
  Zap,
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
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  const isSuperAdminOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';
  const isInternalStaff = !isClient;

  const alarmShownRef = useRef(false);

  // Keep a live clock for header date/time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
        promises.push(api.getTodayAttendance().then((r) => r.attendance).catch(() => null));
      }
      const results = await Promise.all(promises);
      setStats(results[0]);
      setRecentProjects(results[1]);
      setRecentTasks(results[2]);
      if (isInternalStaff) {
        setTodayAttendance(results[3] || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, [isInternalStaff]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Client approvals notification reminder
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
      if (!alarmShownRef.current) {
        fireAlarm();
        alarmShownRef.current = true;
      }
      const id = setInterval(fireAlarm, 12 * 60 * 60 * 1000);
      return () => clearInterval(id);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((p) => {
        if (p === 'granted') fireAlarm();
      });
    }
  }, [isClient, stats?.reviewTasks]);

  if (isLoading && !stats) {
    return <LoadingSpinner message="Loading workspace..." size="lg" />;
  }

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const namePrefix = isClient
    ? user?.name?.split(' ')[0]?.toLowerCase().endsWith('a') ||
      user?.name?.split(' ')[0]?.toLowerCase().endsWith('i')
      ? 'Ms.'
      : 'Mr.'
    : '';

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="space-y-3.5 max-w-7xl mx-auto pb-3 animate-gold-fade-in">
      {/* 1. WELCOME SECTION */}
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
                <img
                  src={user.profileImage}
                  alt={user.name}
                  className="h-16 w-16 rounded-full border-4 border-white object-cover shadow-md"
                />
              ) : (
                <div className="h-16 w-16 rounded-full border-4 border-white bg-[#FAF4EC] flex items-center justify-center text-[#BA954F] font-bold text-xl shadow-md">
                  {user?.name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
              )}
            </div>
          </div>
          <div className="bg-white px-5 pb-4 pt-10 rounded-b-2xl">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-lg font-bold text-[#1C1917]">
                  {namePrefix} {firstName}
                </h1>
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-0.5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1917]">
              {getGreeting()}, {firstName} 
            </h1>
            <p className="text-xs text-[#78716C] mt-0.5">
              Here's what's happening with your work today.
            </p>
          </div>

          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex flex-col sm:items-end text-[11px] text-[#78716C]">
              <div className="flex items-center gap-1 font-medium">
                <Calendar className="h-3 w-3 text-[#BA954F]" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1 font-medium">
                <Clock className="h-3 w-3 text-[#BA954F]" />
                <span>{formattedTime}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSuperAdminOrAdmin && (
                <>
                  <button
                    type="button"
                    onClick={onOpenNewTask}
                    className="px-2.5 py-1.5 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2]" /> Add Task
                  </button>
                  <button
                    type="button"
                    onClick={onOpenNewProject}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer btn-hover-lift"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2]" /> New Project
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. SUMMARY / OVERVIEW CARDS */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Active Projects */}
          <div
            onClick={() => onNavigate('/projects')}
            className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#EDE7DD] shadow-xs flex items-center justify-between card-hover-lift cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] group-hover:scale-105 transition-transform">
                <FolderKanban className="h-4 w-4 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#78716C]">Active Projects</div>
                <div className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
                  {stats.activeProjects}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#78716C]">
                  <span>{stats.totalProjects} total</span>
                  <span>•</span>
                  <span className="text-[#2D6A4F] font-medium">{stats.completedProjects} done</span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-[#A8A29E] group-hover:text-[#BA954F] group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* In Progress */}
          <div
            onClick={() => onNavigate('/tasks')}
            className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#EDE7DD] shadow-xs flex items-center justify-between card-hover-lift cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD] group-hover:scale-105 transition-transform">
                <CheckCircle2 className="h-4 w-4 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#78716C]">In Progress</div>
                <div className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
                  {stats.inProgressTasks}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-[#78716C]">
                  <span>{stats.pendingTasks} to do</span>
                  <span>•</span>
                  <span className="text-[#2D6A4F] font-medium">{stats.completedTasks} done</span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-[#A8A29E] group-hover:text-[#BA954F] group-hover:translate-x-0.5 transition-all" />
          </div>

          {/* Pending Approvals */}
          <div
            onClick={() => onNavigate('/approvals')}
            className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#EDE7DD] shadow-xs flex items-center justify-between card-hover-lift cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FAF2E6] text-[#946B2D] border border-[#E8DCC8] group-hover:scale-105 transition-transform">
                <Clock className="h-4 w-4 stroke-[1.75]" />
              </div>
              <div>
                <div className="text-[11px] font-medium text-[#78716C]">Pending Approvals</div>
                <div className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
                  {stats.reviewTasks}
                </div>
                <div className="text-[10px] text-[#78716C]">
                  Deliverables in review
                </div>
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-[#A8A29E] group-hover:text-[#BA954F] group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      )}

      {/* 3. MAIN SECTION: ATTENDANCE (LEFT) + TODAY'S TASKS (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-start">
        {/* Attendance Section */}
        <DashboardAttendanceCard
          attendance={todayAttendance}
          onAttendanceChange={loadDashboardData}
        />

        {/* Today's Tasks Section */}
        <DashboardTodayTasksCard
          onNavigate={onNavigate}
          onRefreshParent={loadDashboardData}
        />
      </div>
    </div>
  );
};
