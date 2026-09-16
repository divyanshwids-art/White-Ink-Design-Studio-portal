import React, { useState, useEffect } from 'react';
import { User, Attendance, AttendanceStats } from '../types';
import { api } from '../services/api';
import { ClockActionCard } from '../components/attendance/ClockActionCard';
import { AttendanceHistoryTable } from '../components/attendance/AttendanceHistoryTable';
import { TeamAttendanceView } from '../components/attendance/TeamAttendanceView';
import { AttendanceOverviewChart } from '../components/attendance/AttendanceOverviewChart';
import { EodReportsViewerModal } from '../components/attendance/EodReportsViewerModal';
import {
  Clock,
  Calendar,
  Users,
  TrendingUp,
  History,
  CheckCircle2,
  AlertCircle,
  Coffee,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  FileText,
} from 'lucide-react';

interface AttendancePageProps {
  currentUser: User | null;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'punch' | 'history' | 'team' | 'analytics'>('punch');
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [historyRecords, setHistoryRecords] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showEodViewer, setShowEodViewer] = useState(false);

  const isAdminOrSuperAdmin =
    currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
  const isClient = currentUser?.role === 'CLIENT' || currentUser?.role === 'CLIENT_ADMIN';

  const fetchAttendanceData = async () => {
    if (isClient) return;
    setIsLoading(true);
    try {
      const todayRes = await api.getTodayAttendance();
      setTodayAttendance(todayRes.attendance);

      const historyRes = await api.getAttendanceHistory();
      setHistoryRecords(historyRes);

      const statsRes = await api.getAttendanceStats();
      setStats(statsRes);

      if (isAdminOrSuperAdmin) {
        const users = await api.getUsers();
        setTeamMembers(users.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN'));
      }
    } catch (err) {
      console.error('Failed to load attendance data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [currentUser]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAttendanceData();
  };

  if (isClient) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4 bg-white rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] my-12">
        <div className="w-16 h-16 bg-[#FAF7F2] text-[#BA954F] rounded-full flex items-center justify-center mx-auto border border-[#EDE7DD]">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-neutral-900">Internal Staff Portal</h2>
        <p className="text-sm text-neutral-500 leading-relaxed">
          Attendance and work-hour tracking is reserved for internal team members and administrators. As a client stakeholder, you can review design deliverables, drawings, and project milestones in the Projects section.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-widest uppercase text-[#BA954F]">
            Time & Presence Tracking
          </span>
          <h1 className="font-serif text-3xl font-bold text-neutral-900 tracking-tight mt-1">
            Studio Attendance
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Monitor daily working hours, break sessions, and team availability in real-time
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isAdminOrSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowEodViewer(true)}
              className="btn-gold-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Team EOD Reports</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-gold-secondary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#BA954F] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sync Records</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EDE7DD] pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('punch')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'punch'
              ? 'border-[#BA954F] text-neutral-900 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Clock className="h-4 w-4 text-[#BA954F]" />
          <span>Clock In / Out</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'history'
              ? 'border-[#BA954F] text-neutral-900 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <History className="h-4 w-4 text-[#BA954F]" />
          <span>My History Logs</span>
        </button>

        {isAdminOrSuperAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'team'
                ? 'border-[#BA954F] text-neutral-900 bg-white shadow-2xs rounded-t-xl'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Users className="h-4 w-4 text-[#BA954F]" />
            <span>Team Oversight</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#FAF7F2] text-[#BA954F] font-semibold border border-[#EDE7DD]">
              Admin
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-[#BA954F] text-neutral-900 bg-white shadow-2xs rounded-t-xl'
              : 'border-transparent text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <TrendingUp className="h-4 w-4 text-[#BA954F]" />
          <span>Analytics & Trends</span>
        </button>
      </div>

      {/* TAB CONTENT: CLOCK IN / OVERVIEW */}
      {activeTab === 'punch' && (
        <div className="space-y-6">
          <ClockActionCard
            attendance={todayAttendance}
            onAttendanceChange={fetchAttendanceData}
          />

          {/* Analytics Snapshot Strip */}
          <AttendanceOverviewChart stats={stats} />

          {/* Quick Recent Activity preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-neutral-900">Recent Attendance Logs</h3>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className="text-xs font-semibold text-[#BA954F] hover:underline cursor-pointer"
              >
                View Full Logs →
              </button>
            </div>
            <AttendanceHistoryTable
              records={historyRecords.slice(0, 5)}
              isLoading={isLoading}
              showUserColumn={false}
            />
          </div>
        </div>
      )}

      {/* TAB CONTENT: MY HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-neutral-900">Personal Attendance Logs</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Review all historical shift timestamps, total productive durations, and recorded break intervals.
            </p>
          </div>
          <AttendanceHistoryTable
            records={historyRecords}
            isLoading={isLoading}
            showUserColumn={false}
            onFilterChange={async (filters) => {
              setIsLoading(true);
              try {
                const filtered = await api.getAttendanceHistory(filters);
                setHistoryRecords(filtered);
              } catch (e) {
                console.error(e);
              } finally {
                setIsLoading(false);
              }
            }}
          />
        </div>
      )}

      {/* TAB CONTENT: TEAM ATTENDANCE (ADMIN) */}
      {activeTab === 'team' && isAdminOrSuperAdmin && (
        <div className="space-y-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-neutral-900">Workforce Attendance Oversight</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Monitor team presence, identify absences, review break durations, and audit shifts.
            </p>
          </div>
          <TeamAttendanceView teamMembers={teamMembers} />
        </div>
      )}

      {/* TAB CONTENT: ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <AttendanceOverviewChart stats={stats} />
          {isAdminOrSuperAdmin && (
            <TeamAttendanceView teamMembers={teamMembers} />
          )}
        </div>
      )}

      {/* Team EOD Reports Modal for Admins */}
      {isAdminOrSuperAdmin && (
        <EodReportsViewerModal
          isOpen={showEodViewer}
          onClose={() => setShowEodViewer(false)}
        />
      )}
    </div>
  );
};

