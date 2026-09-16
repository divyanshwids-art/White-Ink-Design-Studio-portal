import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ReportsOverview, TeamMemberWorkload } from '../types';
import {
  BarChart3,
  TrendingUp,
  FolderKanban,
  CheckSquare,
  Flag,
  FileCheck,
  Users,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
} from 'lucide-react';

interface ReportsPageProps {
  onNavigate?: (path: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const isClient = role === 'CLIENT' || role === 'CLIENT_ADMIN';

  const [reports, setReports] = useState<ReportsOverview | null>(null);
  const [teamWorkload, setTeamWorkload] = useState<TeamMemberWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsData, workloadData] = await Promise.all([
        api.getReportsOverview(),
        !isClient ? api.getTeamWorkload() : Promise.resolve([]),
      ]);
      setReports(reportsData);
      setTeamWorkload(workloadData);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportCsv = async () => {
    try {
      setExportingCsv(true);
      setExportError(null);
      const blob = await api.exportReportsCsv();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `white-ink-report-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting CSV:', err);
      setExportError(err.message || 'Failed to export CSV report');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      setExportError(null);
      const blob = await api.exportReportsPdf();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `white-ink-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting PDF:', err);
      setExportError(err.message || 'Failed to export PDF report');
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gold-700 bg-card rounded-xl border border-gold-200">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gold-500 border-t-transparent mb-3" />
        <p className="text-sm font-medium">Generating performance and analytics reports...</p>
      </div>
    );
  }

  if (!reports) {
    return (
      <div className="p-12 text-center text-gold-700 bg-card rounded-xl border border-gold-200">
        <AlertTriangle className="h-8 w-8 text-gold-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-heading">Unable to load report data</p>
        <button
          type="button"
          onClick={loadData}
          className="btn-primary btn-hover-lift mt-3 px-3.5 py-1.5 text-xs font-semibold rounded-lg cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const projects = (reports as any).projects || (reports as any).projectMetrics || {
    total: 0,
    active: 0,
    inProgress: 0,
    completed: 0,
    onHold: 0,
    planning: 0,
    averageProgress: 0,
  };
  const tasks = (reports as any).tasks || (reports as any).taskMetrics || {
    total: 0,
    todo: 0,
    inProgress: 0,
    review: 0,
    completed: 0,
    overdue: 0,
  };
  const milestones = (reports as any).milestones || (reports as any).milestoneMetrics || {
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  };
  const approvals = (reports as any).approvals || (reports as any).approvalMetrics || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  const attendance = (reports as any).attendance || (reports as any).attendanceSummary || {
    presentToday: 0,
    activeOnBreak: 0,
    totalTrackedHours: 0,
  };

  const projectCompletionRate =
    projects.total > 0 ? Math.round(((projects.completed || 0) / projects.total) * 100) : 0;
  const taskCompletionRate =
    tasks.total > 0 ? Math.round(((tasks.completed || 0) / tasks.total) * 100) : 0;
  const milestoneCompletionRate =
    milestones.total > 0 ? Math.round(((milestones.completed || 0) / milestones.total) * 100) : 0;
  const approvalRate =
    approvals.total > 0 ? Math.round(((approvals.approved || 0) / approvals.total) * 100) : 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-heading text-heading flex items-center gap-2.5">
            <BarChart3 className="h-6 w-6 text-gold-600" />
            Executive Reports & Analytics
          </h1>
          <p className="muted mt-1">
            Real-time delivery progress, milestone health, client approvals, and studio capacity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-black bg-gold-200 hover:bg-gold-300 border border-gold-400 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {exportingCsv ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-black" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 text-black" />
            )}
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="btn-primary btn-hover-lift inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {exportingPdf ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            Export PDF
          </button>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-heading bg-white hover:bg-gold-50 border border-gold-300 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-gold-700" />
            Refresh Metrics
          </button>
        </div>
      </div>

      {exportError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center justify-between">
          <span>{exportError}</span>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-rose-600 hover:text-rose-800 font-semibold ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top 4 Metric Ratio Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Project Rate */}
        <div className="bg-card p-5 rounded-xl border border-gold-200 shadow-xs flex flex-col justify-between card-hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gold-700 uppercase tracking-wider">
              Project Delivery
            </span>
            <div className="p-2 bg-gold-100 text-gold-800 rounded-lg border border-gold-300">
              <FolderKanban className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-heading">{projectCompletionRate}%</div>
            <div className="text-xs text-gold-800/80 mt-0.5">
              {projects.completed} of {projects.total} projects completed
            </div>
            <div className="w-full bg-gold-100 h-2 rounded-full mt-3 overflow-hidden border border-gold-200">
              <div
                className="bg-gold-500 h-full rounded-full transition-all"
                style={{ width: `${projectCompletionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Task Velocity */}
        <div className="bg-card p-5 rounded-xl border border-gold-200 shadow-xs flex flex-col justify-between card-hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gold-700 uppercase tracking-wider">
              Task Velocity
            </span>
            <div className="p-2 bg-gold-100 text-gold-800 rounded-lg border border-gold-300">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-heading">{taskCompletionRate}%</div>
            <div className="text-xs text-gold-800/80 mt-0.5">
              {tasks.completed} of {tasks.total} tasks resolved
            </div>
            <div className="w-full bg-gold-100 h-2 rounded-full mt-3 overflow-hidden border border-gold-200">
              <div
                className="bg-gold-500 h-full rounded-full transition-all"
                style={{ width: `${taskCompletionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Milestone Rate */}
        <div className="bg-card p-5 rounded-xl border border-gold-200 shadow-xs flex flex-col justify-between card-hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gold-700 uppercase tracking-wider">
              Milestone Sign-Off
            </span>
            <div className="p-2 bg-gold-100 text-gold-800 rounded-lg border border-gold-300">
              <Flag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-heading">{milestoneCompletionRate}%</div>
            <div className="text-xs text-gold-800/80 mt-0.5">
              {milestones.completed} of {milestones.total} milestones achieved
            </div>
            <div className="w-full bg-gold-100 h-2 rounded-full mt-3 overflow-hidden border border-gold-200">
              <div
                className="bg-gold-500 h-full rounded-full transition-all"
                style={{ width: `${milestoneCompletionRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Deliverables Approval */}
        <div className="bg-card p-5 rounded-xl border border-gold-200 shadow-xs flex flex-col justify-between card-hover-lift">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gold-700 uppercase tracking-wider">
              Client Acceptance
            </span>
            <div className="p-2 bg-gold-100 text-gold-800 rounded-lg border border-gold-300">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-heading">{approvalRate}%</div>
            <div className="text-xs text-gold-800/80 mt-0.5">
              {approvals.approved} approved ({approvals.pending} awaiting review)
            </div>
            <div className="w-full bg-gold-100 h-2 rounded-full mt-3 overflow-hidden border border-gold-200">
              <div
                className="bg-gold-500 h-full rounded-full transition-all"
                style={{ width: `${approvalRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Pipeline Card */}
        <div className="bg-card rounded-xl border border-gold-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gold-100 pb-3">
            <h3 className="font-bold text-heading text-sm flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-gold-600" />
              Project Pipeline Breakdown
            </h3>
            <span className="text-xs font-bold text-black bg-gold-200 border border-gold-400 px-2 py-0.5 rounded">
              {projects.total} Total
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold text-heading mb-1">
                <span>In Progress / Active</span>
                <span className="font-extrabold text-heading">{projects.inProgress}</span>
              </div>
              <div className="w-full bg-gold-100 h-2 rounded-full overflow-hidden border border-gold-200">
                <div
                  className="bg-gold-500 h-full"
                  style={{
                    width: `${projects.total ? (projects.inProgress / projects.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-heading mb-1">
                <span>Planning & Scoping</span>
                <span className="font-extrabold text-heading">{projects.planning}</span>
              </div>
              <div className="w-full bg-gold-100 h-2 rounded-full overflow-hidden border border-gold-200">
                <div
                  className="bg-gold-400 h-full"
                  style={{
                    width: `${projects.total ? (projects.planning / projects.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-heading mb-1">
                <span>Completed</span>
                <span className="font-extrabold text-heading">{projects.completed}</span>
              </div>
              <div className="w-full bg-gold-100 h-2 rounded-full overflow-hidden border border-gold-200">
                <div
                  className="bg-gold-600 h-full"
                  style={{
                    width: `${projects.total ? (projects.completed / projects.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold text-heading mb-1">
                <span>On Hold / Delayed</span>
                <span className="font-extrabold text-heading">{projects.onHold}</span>
              </div>
              <div className="w-full bg-gold-100 h-2 rounded-full overflow-hidden border border-gold-200">
                <div
                  className="bg-gold-300 h-full"
                  style={{
                    width: `${projects.total ? (projects.onHold / projects.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Task Velocity Distribution */}
        <div className="bg-card rounded-xl border border-gold-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gold-100 pb-3">
            <h3 className="font-bold text-heading text-sm flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-gold-600" />
              Task Execution Status
            </h3>
            <span className="text-xs font-bold text-black bg-gold-200 border border-gold-400 px-2 py-0.5 rounded">
              {tasks.total} Tasks
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-gold-50/70 rounded-xl border border-gold-200">
              <div className="text-xl font-extrabold text-heading">{tasks.todo}</div>
              <div className="text-[11px] text-gold-800 font-semibold mt-0.5">To Do Backlog</div>
            </div>
            <div className="p-3 bg-gold-100 rounded-xl border border-gold-300">
              <div className="text-xl font-extrabold text-black">{tasks.inProgress}</div>
              <div className="text-[11px] text-black/70 font-semibold mt-0.5">In Progress</div>
            </div>
            <div className="p-3 bg-gold-200 rounded-xl border border-gold-400">
              <div className="text-xl font-extrabold text-black">{tasks.review}</div>
              <div className="text-[11px] text-black/80 font-bold mt-0.5">In Review</div>
            </div>
            <div className="p-3 bg-gold-300 rounded-xl border border-gold-500">
              <div className="text-xl font-extrabold text-black">{tasks.completed}</div>
              <div className="text-[11px] text-black font-extrabold mt-0.5">Completed</div>
            </div>
          </div>

          {tasks.overdue > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs font-medium">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{tasks.overdue} tasks are currently past their due date</span>
            </div>
          )}
        </div>
      </div>

      {/* Attendance & Team Workload Section (For Non-Clients) */}
      {!isClient && (
        <div className="space-y-6">
          {/* Attendance KPI banner */}
          <div className="bg-gradient-to-r from-gold-500 via-gold-400 to-gold-600 rounded-xl p-6 text-black shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-gold-500">
            <div className="space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-black/80">
                Attendance & Working Time
              </div>
              <div className="text-xl font-extrabold text-black">
                {attendance.presentToday} Team Members Present Today
              </div>
              <p className="text-xs text-black/80 font-medium">
                {attendance.activeOnBreak} on active break • {attendance.totalTrackedHours} total tracked hours across all shifts
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/attendance')}
              className="px-5 py-2.5 bg-black text-gold-300 hover:text-gold-200 text-xs font-extrabold rounded-xl border border-gold-400 hover:bg-black/90 transition-all shrink-0 cursor-pointer shadow-sm"
            >
              Open Attendance Center →
            </button>
          </div>

          {/* Team Workload Matrix */}
          <div className="bg-card rounded-xl border border-gold-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gold-100 pb-3">
              <h3 className="font-bold text-heading text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-gold-600" />
                Team Member Workload & Capacity
              </h3>
              <span className="text-xs text-gold-700 font-medium">Task distribution balance</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gold-200 text-gold-900 bg-gold-50/70">
                    <th className="table-header py-2.5 px-3">Team Member</th>
                    <th className="table-header py-2.5 px-3">Role</th>
                    <th className="table-header py-2.5 px-3 text-center">Date</th>
                    <th className="table-header py-2.5 px-3 text-center">Active Projects</th>
                    <th className="table-header py-2.5 px-3 text-center">Assigned Tasks</th>
                    <th className="table-header py-2.5 px-3 text-center">In Progress</th>
                    <th className="table-header py-2.5 px-3 text-center">Workload Index</th>
                    <th className="table-header py-2.5 px-3 text-right">Attendance Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {teamWorkload.map((m) => {
                    const workloadScore = m.activeTasksCount * 2;
                    const isHeavy = workloadScore > 10;
                    const todayFormatted = new Date().toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr key={m.user.id} className="hover:bg-gold-50/60 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            {m.user.profileImage ? (
                              <img
                                src={m.user.profileImage}
                                alt={m.user.name}
                                className="h-7 w-7 rounded-full object-cover border border-gold-300"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-gold-100 text-gold-800 border border-gold-300 flex items-center justify-center font-bold text-[10px]">
                                {m.user.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-heading">{m.user.name}</div>
                              <div className="text-[11px] text-gold-700">{m.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 bg-gold-50 border border-gold-200 rounded text-gold-900 font-semibold text-[10px]">
                            {m.user.role}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-gold-800 font-medium text-[11px] whitespace-nowrap">
                          {todayFormatted}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-heading">
                          {m.assignedProjectCount}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-heading">
                          {m.totalTasksCount}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-black">
                          {m.activeTasksCount}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isHeavy
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-gold-100 text-black border border-gold-300'
                            }`}
                          >
                            {isHeavy ? 'High Load' : 'Balanced'} ({m.activeTasksCount} active)
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.todayAttendanceStatus === 'WORKING'
                                ? 'bg-gold-200 text-black border border-gold-400'
                                : m.todayAttendanceStatus === 'ON_BREAK'
                                ? 'bg-gold-100 text-black border border-gold-300'
                                : 'bg-white text-black/60 border border-gold-200'
                            }`}
                          >
                            {m.todayAttendanceStatus.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
