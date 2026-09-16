import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DailyActivitySummary, EodTaskReportItem } from '../../types';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Send,
  Loader2,
  Calendar,
  Sparkles,
  ListTodo,
} from 'lucide-react';

interface EodReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefillSummary?: DailyActivitySummary | null;
}

export const EodReportModal: React.FC<EodReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  prefillSummary,
}) => {
  const [summary, setSummary] = useState<DailyActivitySummary | null>(prefillSummary || null);
  const [summaryNote, setSummaryNote] = useState<string>('');
  const [blockers, setBlockers] = useState<string>('');
  const [tomorrowTask, setTomorrowTask] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !prefillSummary) {
      loadDraftSummary();
    } else if (prefillSummary) {
      setSummary(prefillSummary);
    }
  }, [isOpen, prefillSummary]);

  const loadDraftSummary = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getDailyActivitySummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate EOD summary preview.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const completedTasks: EodTaskReportItem[] = summary
    ? summary.tasks.filter((t) => t.isCompleted).map((t) => ({
        id: t.id,
        title: t.title,
        projectName: t.projectName,
        timeSpentMinutes: t.totalLoggedMinutes,
        status: t.status,
        type: t.type,
      }))
    : [];

  const inProgressTasks: EodTaskReportItem[] = summary
    ? summary.tasks.filter((t) => !t.isCompleted).map((t) => ({
        id: t.id,
        title: t.title,
        projectName: t.projectName,
        timeSpentMinutes: t.totalLoggedMinutes,
        status: t.status,
        type: t.type,
      }))
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTomorrow = tomorrowTask.trim();
    if (!trimmedTomorrow) {
      setError('Kal ka task daalna zaroori hai (Tomorrow\'s planned task is mandatory before exit).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.submitEodReport({
        summaryNote: summaryNote.trim() || undefined,
        blockers: blockers.trim() || undefined,
        completedTasks,
        inProgressTasks,
        tomorrowTask: trimmedTomorrow,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit End of Day report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatHoursMins = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-gold-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-[#EDE7DD] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="p-5 bg-[#FAF7F2] border-b border-[#EDE7DD] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
              <FileText className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1C1917]">
                End of Day (EOD) Report
              </h2>
              <p className="text-xs text-[#78716C]">
                Daily summary submitted automatically to Admin on shift completion
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-xs text-[#78716C] space-y-2">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#BA954F]" />
              <p>Compiling your daily task activity...</p>
            </div>
          ) : (
            <>
              {/* Daily Highlights Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE7DD]">
                  <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider">Completed Tasks</span>
                  <div className="text-xl font-bold text-[#2D6A4F] mt-0.5">
                    {completedTasks.length}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE7DD]">
                  <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider">In Progress</span>
                  <div className="text-xl font-bold text-[#BA954F] mt-0.5">
                    {inProgressTasks.length}
                  </div>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE7DD] col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider">Total Focus Time</span>
                  <div className="text-xl font-bold text-[#1C1917] mt-0.5">
                    {formatHoursMins(summary?.totalLoggedTaskMinutes || 0)}
                  </div>
                </div>
              </div>

              {/* Completed Tasks List */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-[#2D6A4F]" />
                  Completed Deliverables & Tasks ({completedTasks.length})
                </h3>
                <div className="divide-y divide-[#F5EFE6] border border-[#EDE7DD] rounded-2xl overflow-hidden bg-white">
                  {completedTasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#78716C]">
                      No tasks completed today.
                    </div>
                  ) : (
                    completedTasks.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-[#1C1917] truncate">{item.title}</p>
                          <p className="text-[11px] text-[#78716C]">{item.projectName || 'Task'}</p>
                        </div>
                        {item.timeSpentMinutes ? (
                          <span className="shrink-0 text-[11px] font-semibold text-[#BA954F] bg-[#FAF4EC] px-2 py-0.5 rounded-full border border-[#EDE3D4]">
                            {item.timeSpentMinutes}m spent
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* In Progress Tasks */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#BA954F]" />
                  Pending & In Progress for Tomorrow ({inProgressTasks.length})
                </h3>
                <div className="divide-y divide-[#F5EFE6] border border-[#EDE7DD] rounded-2xl overflow-hidden bg-white">
                  {inProgressTasks.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#78716C]">
                      No pending tasks remaining.
                    </div>
                  ) : (
                    inProgressTasks.map((item) => (
                      <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <p className="font-bold text-[#1C1917] truncate">{item.title}</p>
                          <p className="text-[11px] text-[#78716C]">{item.projectName || 'Task'}</p>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#78716C] border border-[#EDE7DD]">
                          In Progress
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Summary Notes */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#443B30]">
                  Daily Work Summary & Accomplishments (Optional):
                </label>
                <textarea
                  rows={2}
                  value={summaryNote}
                  onChange={(e) => setSummaryNote(e.target.value)}
                  placeholder="Key progress made today, client feedback addressed..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                />
              </div>

              {/* Tomorrow's Planned Task / Next Day To-Do (Mandatory for Exit) */}
              <div className="space-y-2 p-4 bg-[#FAF7F2] border border-[#EDE7DD] rounded-2xl">
                <div className="flex items-center justify-between">
                  <label htmlFor="eod-tomorrow-task-input" className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5">
                    <ListTodo className="h-4 w-4 text-[#BA954F]" />
                    Tomorrow's Planned Task / Next Day To-Do <span className="text-[#9E2A2B] font-bold">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#BA954F] bg-[#FAF4EC] px-2 py-0.5 rounded-md border border-[#EDE3D4]">
                    Mandatory for Exit
                  </span>
                </div>
                <p className="text-[11px] text-[#78716C]">
                  Specify what deliverable/task you will work on tomorrow. This will be automatically added to your to-do list and scheduled with a reminder notification.
                </p>
                <input
                  id="eod-tomorrow-task-input"
                  type="text"
                  required
                  value={tomorrowTask}
                  onChange={(e) => setTomorrowTask(e.target.value)}
                  placeholder="e.g., Complete 3D elevation renders and client CAD revision sheet..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                />
              </div>

              {/* Blockers */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#443B30]">
                  Blockers / Assistance Needed (Optional):
                </label>
                <input
                  type="text"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="e.g., Awaiting client logo assets for hero section..."
                  className="w-full px-3.5 py-2 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                />
              </div>
            </>
          )}

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#EDE7DD]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer btn-hover-lift disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit EOD Report
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
