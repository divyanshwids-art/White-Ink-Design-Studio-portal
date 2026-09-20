import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { DailyActivitySummary, DailyActivityTaskItem, Task } from '../../types';
import { TaskFocusTimerModal } from '../tasks/TaskFocusTimerModal';
import {
  CheckCircle2,
  Clock,
  Play,
  ArrowRight,
  Sparkles,
  RotateCw,
} from 'lucide-react';

interface DashboardTodayTasksCardProps {
  onNavigate: (path: string) => void;
  onRefreshParent?: () => void;
}

export const DashboardTodayTasksCard: React.FC<DashboardTodayTasksCardProps> = ({
  onNavigate,
  onRefreshParent,
}) => {
  const { user } = useAuth();
  const isSuperAdminOrAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const [summary, setSummary] = useState<DailyActivitySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTaskForTimer, setSelectedTaskForTimer] = useState<DailyActivityTaskItem | null>(null);
  const [isTimerOpen, setIsTimerOpen] = useState(false);

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
    const handleDataUpdated = () => {
      loadSummary();
    };
    window.addEventListener('portal:data-updated', handleDataUpdated);
    return () => {
      window.removeEventListener('portal:data-updated', handleDataUpdated);
    };
  }, []);

  const handleOpenTimer = (task: DailyActivityTaskItem) => {
    setSelectedTaskForTimer(task);
    setIsTimerOpen(true);
  };

  const handleTimeLogged = () => {
    loadSummary();
    if (onRefreshParent) onRefreshParent();
  };

  const handleTaskClick = (task: DailyActivityTaskItem) => {
    if (task.type === 'TODO' || task.projectName === 'Personal Todo') {
      onNavigate('/todos');
    } else if (user?.role === 'SUPER_ADMIN') {
      onNavigate('/tasks');
    } else {
      onNavigate(`/tasks/${task.id}`);
    }
  };

  // Show all tasks: both personal todos and project tasks
  const allTasks = summary?.tasks || [];

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs p-3.5 sm:p-4 space-y-3 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EDE7DD]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
              <CheckCircle2 className="h-4 w-4 stroke-[1.75]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#1C1917] tracking-tight">Today's Task</h2>
              </div>
              <p className="text-[11px] text-[#78716C]">Track focus time on your assignments throughout the day</p>
            </div>
          </div>

        </div>

        {/* Task Items List */}
        <div className="divide-y divide-[#F5EFE6] max-h-[260px] overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-8 text-center text-xs text-[#78716C]">Loading today's tasks...</div>
          ) : allTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#78716C] space-y-1.5">
              <div className="w-8 h-8 rounded-full bg-[#FAF7F2] border border-[#EDE7DD] flex items-center justify-center mx-auto text-[#BA954F]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <p className="font-semibold text-[#1C1917] text-xs">No active tasks assigned yet for today</p>
              <p className="text-[11px] text-[#A8A29E]">Assigned project tasks and personal todos will appear here.</p>
            </div>
          ) : (
            allTasks.slice(0, 8).map((task) => {
              const isTodo = task.type === 'TODO' || task.projectName === 'Personal Todo';
              return (
                <div
                  key={task.id}
                  className="py-2.5 hover:bg-[#FAF7F2]/60 transition-colors flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      {isTodo ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
                          Personal Todo
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-[#FAF7F2] text-[#78716C] border border-[#EDE7DD]">
                          {task.projectName || 'PROJECT'}
                        </span>
                      )}
                      {task.isCompleted || task.status === 'COMPLETED' ? (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD] inline-flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-[#2D6A4F]" />
                          Done
                        </span>
                      ) : task.status === 'IN_PROGRESS' ? (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] inline-flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-[#BA954F]" />
                          In Progress
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[#FAF7F2] text-[#78716C] border border-[#EDE7DD] inline-flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-[#78716C]" />
                          To Do
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTaskClick(task)}
                      className="text-left font-semibold text-xs sm:text-sm text-[#1C1917] group-hover:text-[#BA954F] hover:underline transition-colors cursor-pointer block truncate"
                      title={`View details for ${task.title}`}
                    >
                      {task.title}
                    </button>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#78716C] mt-0.5 font-normal">
                      <Clock className="h-2.5 w-2.5 text-[#BA954F]" />
                      <span>
                        {task.totalLoggedMinutes > 0
                          ? `${task.totalLoggedMinutes}m logged today`
                          : 'No time logged yet'}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenTimer(task)}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer btn-hover-lift"
                      title="Start Focus Timer"
                    >
                      <Play className="h-3 w-3 fill-current" />
                      <span>Focus Timer</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer link to view all tasks */}
      <div className="pt-2 border-t border-[#EDE7DD]">
        <button
          type="button"
          onClick={() => onNavigate('/tasks')}
          className="text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] hover:underline inline-flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>View all tasks</span>
          <ArrowRight className="h-3.5 w-3.5 stroke-[2]" />
        </button>
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
    </div>
  );
};

