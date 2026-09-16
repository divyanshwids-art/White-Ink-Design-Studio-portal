import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  DashboardStats,
  RecentProject,
  RecentTask,
} from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { DeadlineCountdownBadge } from '../components/tasks/DeadlineCountdownBadge';
import {
  FolderKanban,
  CheckCircle2,
  FileCheck,
  AlertCircle,
  ArrowRight,
  Plus,
  RotateCw,
  Building2,
  Bell,
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
  onOpenClientProject,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const alarmShownRef = useRef(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [statsRes, projectsRes, tasksRes] = await Promise.all([
        api.getDashboardStats(),
        api.getRecentProjects(),
        api.getRecentTasks(),
      ]);
      setStats(statsRes);
      setRecentProjects(projectsRes);
      setRecentTasks(tasksRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (!stats?.reviewTasks || stats.reviewTasks <= 0) return;
    const fireAlarm = () => {
      new Notification('⏰ Pending Approvals Reminder', {
        body: `You have ${stats.reviewTasks} deliverable(s) waiting for your review.`,
        icon: '/white-ink-logo.png',
      });
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
  }, [stats?.reviewTasks]);

  if (isLoading && !stats) {
    return <LoadingSpinner message="Loading client workspace..." size="lg" />;
  }

  const firstName = user?.name ? user.name.split(' ')[0] : 'there';
  const namePrefix =
    user?.name?.split(' ')[0]?.toLowerCase().endsWith('a') ||
    user?.name?.split(' ')[0]?.toLowerCase().endsWith('i')
      ? 'Ms.'
      : 'Mr.';

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Header Banner */}
      <div className="rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden">
        <div
          className="h-28 sm:h-36 w-full relative"
          style={{
            background: (user as any)?.bannerImage
              ? `url(${(user as any).bannerImage}) center/cover no-repeat`
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
              <div className="h-16 w-16 rounded-full border-4 border-white bg-[#FAF4EC] flex items-center justify-center text-[#BA954F] font-serif font-bold text-xl shadow-md">
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
                onClick={loadDashboardData}
                className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-xl border border-[#EDE7DD] transition-colors cursor-pointer"
                title="Refresh"
              >
                <RotateCw className="h-4 w-4 stroke-[1.75]" />
              </button>
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
                className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
              >
                <Zap className="h-3.5 w-3.5 stroke-[2]" />
                Review Deliverables
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">
                Active Projects
              </span>
              <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl">
                <FolderKanban className="h-4 w-4 stroke-[1.75]" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">
                {stats.activeProjects}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/projects')}
                className="mt-2 text-[11px] font-semibold text-[#BA954F] hover:underline cursor-pointer"
              >
                View Projects →
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">
                In Progress
              </span>
              <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl">
                <CheckCircle2 className="h-4 w-4 stroke-[1.75]" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">
                {stats.inProgressTasks}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/projects')}
                className="mt-2 text-[11px] font-semibold text-[#BA954F] hover:underline cursor-pointer"
              >
                Track Status →
              </button>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col justify-between card-hover-lift">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-semibold text-[#78716C] uppercase tracking-wider">
                Pending Approvals
              </span>
              <div className="flex items-center gap-1.5">
                {stats.reviewTasks > 0 && (
                  <div className="relative">
                    <Bell className="h-4 w-4 text-[#B91C1C] stroke-[1.75]" />
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#B91C1C] animate-pulse" />
                  </div>
                )}
                <div className="p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl">
                  <FileCheck className="h-4 w-4 stroke-[1.75]" />
                </div>
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#1C1917] tracking-tight">
                {stats.reviewTasks}
              </div>
              <button
                type="button"
                onClick={() => onNavigate('/approvals')}
                className="mt-2 text-[11px] font-semibold text-[#B91C1C] hover:underline cursor-pointer"
              >
                Review Deliverables →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects & Deliverables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Projects */}
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE7DD]">
            <div>
              <h3 className="text-sm font-bold text-[#1C1917]">Your Projects</h3>
              <p className="text-xs text-[#78716C] mt-0.5">Overview and milestone progress</p>
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
              <div className="p-8 text-center text-xs text-[#78716C]">
                <p>No active projects found.</p>
              </div>
            ) : (
              recentProjects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => onNavigate(`/projects/${project.id}`)}
                  className="p-4 hover:bg-[#FAF7F2] cursor-pointer transition-colors space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[#1C1917] truncate">{project.name}</h4>
                      <p className="text-xs text-[#78716C] flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 text-[#BA954F] shrink-0" />
                        {project.clientName}
                      </p>
                    </div>
                    <StatusBadge status={project.status} size="sm" />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 max-w-[180px]">
                      <ProgressBar progress={project.progress} size="sm" />
                    </div>
                    <DeadlineCountdownBadge dueDate={project.dueDate} status={project.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Deliverables for Review */}
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE7DD]">
            <div>
              <h3 className="text-sm font-bold text-[#1C1917]">Deliverables & Tasks</h3>
              <p className="text-xs text-[#78716C] mt-0.5">Recent task updates and review items</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/approvals')}
              className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] flex items-center gap-1 cursor-pointer"
            >
              Approvals <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
            </button>
          </div>
          <div className="divide-y divide-[#F5EFE6]">
            {recentTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#78716C]">No recent tasks found.</div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onNavigate(`/projects/${task.projectId}`)}
                  className="p-4 hover:bg-[#FAF7F2] transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs text-[#78716C] truncate">{task.projectName}</span>
                      {task.dueDate && (
                        <DeadlineCountdownBadge dueDate={task.dueDate} status={task.status} size="sm" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#1C1917] group-hover:text-[#BA954F] transition-colors truncate">
                      {task.title}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <StatusBadge status={task.status} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
