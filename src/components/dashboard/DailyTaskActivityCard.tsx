import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { DailyActivitySummary, DailyActivityTaskItem, Task } from '../../types';
import { TaskFocusTimerModal } from '../tasks/TaskFocusTimerModal';
import { EodReportModal } from '../attendance/EodReportModal';
import {
  Timer,
  CheckCircle2,
  Clock,
  Play,
  FileText,
  RotateCw,
  Sparkles,
  Zap,
} from 'lucide-react';

interface DailyTaskActivityCardProps {
  onRefresh?: () => void;
  isAdmin?: boolean;
}

export const DailyTaskActivityCard: React.FC<DailyTaskActivityCardProps> = ({
  onRefresh,
  isAdmin = false,
}) => {
  const [summary, setSummary] = useState<DailyActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState<DailyActivityTaskItem | null>(null);
  const [isTimerOpen, setIsTimerOpen] = useState<boolean>(false);
  const [isEodModalOpen, setIsEodModalOpen] = useState<boolean>(false);

  const loadSummary = async () => {
    setIsLoading(true);
    try {
      const data = await api.getDailyActivitySummary();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load daily activity summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleOpenTimer = (task: DailyActivityTaskItem) => {
    setSelectedTaskForTimer(task);
    setIsTimerOpen(true);
  };

  const handleTimeLogged = () => {
    loadSummary();
    if (onRefresh) onRefresh();
  };

  const formatHoursMins = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDE7DD] bg-[#FAF7F2]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
            <Timer className="h-4 w-4 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#1C1917]">Today's Task Activity & Time Tracker</h3>
              {summary && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0]">
                  {formatHoursMins(summary.totalLoggedTaskMinutes)} logged
                </span>
              )}
            </div>
            <p className="text-xs text-[#78716C]">Track focus time on your assignments throughout the day</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSummary}
            className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-white rounded-xl border border-[#EDE7DD] transition-colors cursor-pointer"
            title="Refresh Activity"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsEodModalOpen(true)}
            className="px-3 py-1.5 text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] bg-white hover:bg-[#FAF4EC] border border-[#EDE3D4] rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <FileText className="h-3.5 w-3.5" />
            EOD Report
          </button>
        </div>
      </div>

      {/* List of Tasks */}
      <div className="divide-y divide-[#F5EFE6]">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[#78716C]">Loading today's activity...</div>
        ) : !summary || summary.tasks.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#78716C] space-y-1">
            <CheckCircle2 className="h-5 w-5 mx-auto text-[#BA954F] mb-1" />
            <p className="font-semibold text-[#1C1917]">No active tasks assigned yet for today</p>
            <p className="text-[11px] text-[#A8A29E]">Pick up tasks from the Tasks tab to start tracking time</p>
          </div>
        ) : (
          summary.tasks.slice(0, 5).map((t) => (
            <div key={t.id} className="p-4 hover:bg-[#FAF7F2] transition-colors flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-[#FAF7F2] text-[#78716C] border border-[#EDE7DD]">
                    {t.projectName || 'Task'}
                  </span>
                  {t.isCompleted && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD]">
                      Done
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-[#1C1917] truncate">{t.title}</h4>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-[#78716C]">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-[#BA954F]" />
                    {t.totalLoggedMinutes > 0 ? `${t.totalLoggedMinutes} mins logged today` : 'No time logged yet'}
                  </span>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenTimer(t)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
                  title="Start LeetCode-style Focus Timer with Alarm"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Focus Timer
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Focus Timer Modal */}
      {selectedTaskForTimer && (
        <TaskFocusTimerModal
          isOpen={isTimerOpen}
          onClose={() => {
            setIsTimerOpen(false);
            setSelectedTaskForTimer(null);
          }}
          task={{
            id: selectedTaskForTimer.id,
            title: selectedTaskForTimer.title,
            projectId: selectedTaskForTimer.projectId || '',
          } as Task}
          onTimeLogged={handleTimeLogged}
        />
      )}

      {/* EOD Report Modal */}
      <EodReportModal
        isOpen={isEodModalOpen}
        onClose={() => setIsEodModalOpen(false)}
        onSuccess={loadSummary}
        prefillSummary={summary}
      />
    </div>
  );
};
