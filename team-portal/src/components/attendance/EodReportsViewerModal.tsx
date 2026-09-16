import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { EodReport, User } from '../../types';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  User as UserIcon,
  Calendar,
  Filter,
  Search,
  ChevronRight,
  Sparkles,
  Inbox,
} from 'lucide-react';

interface EodReportsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUserId?: string;
  initialDate?: string;
}

export const EodReportsViewerModal: React.FC<EodReportsViewerModalProps> = ({
  isOpen,
  onClose,
  initialUserId,
  initialDate,
}) => {
  const [reports, setReports] = useState<EodReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<EodReport | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || 'ALL');
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTeamUsers();
      loadReports();
    }
  }, [isOpen, selectedDate, selectedUserId]);

  const loadTeamUsers = async () => {
    try {
      const users = await api.getUsers();
      setTeamUsers(users.filter((u) => u.role === 'TEAM_MEMBER' || u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'));
    } catch (err) {
      console.error('Failed to load team users:', err);
    }
  };

  const loadReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getTeamEodReports({
        date: selectedDate || undefined,
        userId: selectedUserId !== 'ALL' ? selectedUserId : undefined,
      });
      setReports(data);
      if (data.length > 0) {
        setSelectedReport(data[0]);
      } else {
        setSelectedReport(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch EOD reports.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatHoursMins = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-gold-fade-in">
      <div className="relative w-full max-w-5xl bg-white rounded-3xl border border-[#EDE7DD] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Top Header */}
        <div className="p-5 bg-[#FAF7F2] border-b border-[#EDE7DD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
              <FileText className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1917]">
                Team End of Day (EOD) Submissions
              </h2>
              <p className="text-xs text-[#78716C]">
                Daily tasks completed, in-progress items, and focus time breakdown
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date selector */}
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer shadow-2xs font-semibold"
            />

            {/* Member filter */}
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer shadow-2xs font-semibold"
            >
              <option value="ALL">All Team Members</option>
              {teamUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-white rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area - 2 Column Master/Detail Layout */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#EDE7DD]">
          
          {/* Left Sidebar List */}
          <div className="p-4 overflow-y-auto space-y-2 bg-[#FAF7F2]/40">
            <div className="flex items-center justify-between text-xs font-bold text-[#78716C] px-1 mb-2">
              <span>SUBMISSIONS ({reports.length})</span>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-xs text-[#78716C]">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#78716C] space-y-2">
                <Inbox className="h-6 w-6 mx-auto text-[#A8A29E]" />
                <p>No EOD reports found for selected date.</p>
              </div>
            ) : (
              reports.map((rep) => {
                const isSelected = selectedReport?.id === rep.id;
                return (
                  <div
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-white border-[#BA954F] shadow-xs'
                        : 'bg-white/80 hover:bg-white border-[#EDE7DD]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-[#1C1917] truncate">{rep.userName}</h4>
                      <span className="text-[10px] font-semibold text-[#BA954F] bg-[#FAF4EC] px-2 py-0.5 rounded-full">
                        {rep.completedTasks?.length || 0} done
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#78716C]">
                      <span>Work: {formatHoursMins(rep.totalWorkingMinutes || 0)}</span>
                      <span>{new Date(rep.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Detail Pane */}
          <div className="md:col-span-2 p-6 overflow-y-auto space-y-6 bg-white">
            {selectedReport ? (
              <div className="space-y-6">
                
                {/* Header Profile */}
                <div className="flex items-center justify-between pb-4 border-b border-[#EDE7DD] flex-wrap gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#1C1917]">{selectedReport.userName}</h3>
                    <p className="text-xs text-[#78716C]">{selectedReport.userEmail} · Date: {selectedReport.date}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#2D6A4F] bg-[#F0F7F2] px-3 py-1 rounded-full border border-[#D1E7DD]">
                      Submitted at {new Date(selectedReport.submittedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE7DD]">
                    <span className="text-[10px] font-bold text-[#78716C] uppercase">Working Hours</span>
                    <div className="text-lg font-bold text-[#1C1917] mt-0.5">
                      {formatHoursMins(selectedReport.totalWorkingMinutes || 0)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE7DD]">
                    <span className="text-[10px] font-bold text-[#78716C] uppercase">Break Taken</span>
                    <div className="text-lg font-bold text-[#1C1917] mt-0.5">
                      {formatHoursMins(selectedReport.totalBreakMinutes || 0)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE7DD]">
                    <span className="text-[10px] font-bold text-[#78716C] uppercase">Completed</span>
                    <div className="text-lg font-bold text-[#2D6A4F] mt-0.5">
                      {selectedReport.completedTasks?.length || 0} Tasks
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE7DD]">
                    <span className="text-[10px] font-bold text-[#78716C] uppercase">In Progress</span>
                    <div className="text-lg font-bold text-[#BA954F] mt-0.5">
                      {selectedReport.inProgressTasks?.length || 0} Tasks
                    </div>
                  </div>
                </div>

                {/* Completed Tasks */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#2D6A4F]" />
                    Completed Tasks Today ({selectedReport.completedTasks?.length || 0})
                  </h4>
                  <div className="divide-y divide-[#F5EFE6] border border-[#EDE7DD] rounded-2xl overflow-hidden bg-white">
                    {(!selectedReport.completedTasks || selectedReport.completedTasks.length === 0) ? (
                      <div className="p-4 text-center text-xs text-[#78716C]">No tasks completed today.</div>
                    ) : (
                      selectedReport.completedTasks.map((t) => (
                        <div key={t.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <p className="font-bold text-[#1C1917] truncate">{t.title}</p>
                            <p className="text-[11px] text-[#78716C]">{t.projectName || 'Task'}</p>
                          </div>
                          {t.timeSpentMinutes ? (
                            <span className="shrink-0 text-[11px] font-semibold text-[#BA954F] bg-[#FAF4EC] px-2 py-0.5 rounded-full border border-[#EDE3D4]">
                              {t.timeSpentMinutes}m spent
                            </span>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* In Progress Tasks */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-[#BA954F]" />
                    In Progress & Carried Over ({selectedReport.inProgressTasks?.length || 0})
                  </h4>
                  <div className="divide-y divide-[#F5EFE6] border border-[#EDE7DD] rounded-2xl overflow-hidden bg-white">
                    {(!selectedReport.inProgressTasks || selectedReport.inProgressTasks.length === 0) ? (
                      <div className="p-4 text-center text-xs text-[#78716C]">No pending tasks recorded.</div>
                    ) : (
                      selectedReport.inProgressTasks.map((t) => (
                        <div key={t.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                          <div className="min-w-0">
                            <p className="font-bold text-[#1C1917] truncate">{t.title}</p>
                            <p className="text-[11px] text-[#78716C]">{t.projectName || 'Task'}</p>
                          </div>
                          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#78716C] border border-[#EDE7DD]">
                            In Progress
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Notes & Blockers */}
                {selectedReport.summaryNote && (
                  <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#EDE7DD] space-y-1">
                    <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider">Summary Notes:</span>
                    <p className="text-xs text-[#1C1917] leading-relaxed whitespace-pre-wrap">{selectedReport.summaryNote}</p>
                  </div>
                )}

                {selectedReport.blockers && (
                  <div className="p-4 rounded-2xl bg-[#FDF2F0] border border-[#F5D5D0] space-y-1">
                    <span className="text-[10px] font-bold text-[#B91C1C] uppercase tracking-wider">Blockers / Attention Needed:</span>
                    <p className="text-xs text-[#B91C1C] leading-relaxed whitespace-pre-wrap">{selectedReport.blockers}</p>
                  </div>
                )}

              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-xs text-[#78716C] py-16">
                <p>Select a team member's submission from the list to view full EOD details.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
