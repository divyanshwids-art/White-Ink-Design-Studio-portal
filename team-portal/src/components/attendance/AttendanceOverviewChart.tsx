import React from 'react';
import { AttendanceStats } from '../../types';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  Activity,
} from 'lucide-react';

interface AttendanceOverviewChartProps {
  stats: AttendanceStats | null;
}

export const AttendanceOverviewChart: React.FC<AttendanceOverviewChartProps> = ({ stats }) => {
  if (!stats) return null;

  const total = stats.totalTeamMembers || 1;
  const presentPct = Math.round(((stats.presentToday || 0) / total) * 100);
  const latePct = Math.round(((stats.lateToday || 0) / total) * 100);
  const absentPct = Math.round(((stats.absentToday || 0) / total) * 100);
  const onLeavePct = Math.round(((stats.onLeaveToday || 0) / total) * 100);

  const maxWeeklyAttendance = Math.max(
    ...stats.weeklyTrend.map((w) => w.present + w.onLeave + w.late),
    total,
    1
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Today's Rate & Status Breakdown Card */}
      <div className="bg-white rounded-2xl border border-[#EDE7DD] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-bold text-neutral-900 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#BA954F]" />
            Today's Turnout Rate
          </h3>
          <span className="text-xs font-semibold px-3 py-0.5 rounded-full bg-[#FAF7F2] text-[#BA954F] border border-[#EDE7DD]">
            {presentPct}% Present
          </span>
        </div>

        {/* Progress Bar Breakdown */}
        <div className="space-y-3">
          <div className="h-3.5 w-full bg-[#FAF7F2] rounded-full overflow-hidden flex border border-[#EDE7DD]">
            <div
              style={{ width: `${presentPct}%` }}
              className="bg-[#2D6A4F] h-full transition-all duration-500"
              title={`Present: ${stats.presentToday}`}
            />
            <div
              style={{ width: `${latePct}%` }}
              className="bg-[#B45309] h-full transition-all duration-500"
              title={`Late: ${stats.lateToday}`}
            />
            <div
              style={{ width: `${onLeavePct}%` }}
              className="bg-[#94A3B8] h-full transition-all duration-500"
              title={`On Leave: ${stats.onLeaveToday}`}
            />
            <div
              style={{ width: `${absentPct}%` }}
              className="bg-[#9E2A2B] h-full transition-all duration-500"
              title={`Absent: ${stats.absentToday}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EBF3ED] border border-[#D1E7D8]">
              <span className="flex items-center gap-1.5 text-[#2D6A4F] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#2D6A4F]" /> Present
              </span>
              <span className="font-bold text-[#2D6A4F]">{stats.presentToday}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FDF6E9] border border-[#F9E2AF]">
              <span className="flex items-center gap-1.5 text-[#B45309] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#B45309]" /> Late
              </span>
              <span className="font-bold text-[#B45309]">{stats.lateToday}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]">
              <span className="flex items-center gap-1.5 text-[#475569] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#64748B]" /> On Leave
              </span>
              <span className="font-bold text-[#475569]">{stats.onLeaveToday}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FDF0ED] border border-[#F5D0C5]">
              <span className="flex items-center gap-1.5 text-[#9E2A2B] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#9E2A2B]" /> Absent
              </span>
              <span className="font-bold text-[#9E2A2B]">{stats.absentToday}</span>
            </div>
          </div>
        </div>

        {/* Avg Working Hours */}
        <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#EDE7DD] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#BA954F]" />
            <span className="text-neutral-600 font-medium">Avg Effective Work Duration:</span>
          </div>
          <span className="font-bold font-serif text-neutral-900">{stats.avgWorkingHours} hrs / day</span>
        </div>
      </div>

      {/* 30-Day Attendance Trend Chart */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EDE7DD] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-base font-bold text-neutral-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#BA954F]" />
              30-Day Attendance Trajectory
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Daily turnout distribution across all active studio team members (Past 30 Days)
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-neutral-600 shrink-0">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#BA954F]" /> Present
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B45309]" /> Late
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]" /> Leave
            </span>
          </div>
        </div>

        {/* Bar Chart Visualization with horizontal scroll */}
        <div className="pt-4 pb-1 overflow-x-auto custom-scrollbar">
          <div className="h-44 flex items-end justify-between gap-1.5 min-w-[720px] px-1">
            {stats.weeklyTrend.map((item, idx) => {
              const presentHeight = Math.round((item.present / maxWeeklyAttendance) * 100);
              const lateHeight = Math.round((item.late / maxWeeklyAttendance) * 100);
              const leaveHeight = Math.round(((item as any).onLeave || 0) / maxWeeklyAttendance * 100);
              const isToday = idx === stats.weeklyTrend.length - 1;
              const dateParts = item.date.split('-');
              const dayNum = dateParts[2] || '';
              const monthNum = dateParts[1] || '';

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative min-w-[18px]">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 bg-neutral-900 text-white text-[10px] font-medium px-2.5 py-1.5 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 border border-neutral-700">
                    <span className="font-bold text-[#BA954F]">{item.date} ({item.day})</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span>✓ {item.present} Present</span>
                      {item.late > 0 && <span className="text-amber-400">· {item.late} Late</span>}
                      {item.absent > 0 && <span className="text-rose-400">· {item.absent} Absent</span>}
                    </div>
                  </div>

                  {/* Bars Stack */}
                  <div
                    className={`w-full max-w-[20px] rounded-t-lg overflow-hidden flex flex-col justify-end h-32 border-b border-[#EDE7DD] ${
                      isToday ? 'bg-[#FAF4EC] ring-1 ring-[#BA954F]/50 shadow-xs' : 'bg-[#FAF7F2]'
                    }`}
                  >
                    {leaveHeight > 0 && (
                      <div
                        style={{ height: `${leaveHeight}%` }}
                        className="w-full bg-[#94A3B8]"
                        title={`Leave: ${(item as any).onLeave}`}
                      />
                    )}
                    {lateHeight > 0 && (
                      <div
                        style={{ height: `${lateHeight}%` }}
                        className="w-full bg-[#B45309]"
                        title={`Late: ${item.late}`}
                      />
                    )}
                    <div
                      style={{ height: `${presentHeight}%` }}
                      className={`w-full ${
                        isToday
                          ? 'bg-gradient-to-t from-[#6A471C] via-[#BA954F] to-[#E2C386]'
                          : 'bg-gradient-to-t from-[#845F2F] to-[#BA954F]'
                      } rounded-t-xs`}
                      title={`Present: ${item.present}`}
                    />
                  </div>

                  {/* Label */}
                  <div className="flex flex-col items-center">
                    <span
                      className={`text-[9px] font-bold leading-tight ${
                        isToday ? 'text-[#BA954F] font-extrabold' : 'text-neutral-600 group-hover:text-neutral-900'
                      }`}
                    >
                      {dayNum}
                    </span>
                    <span className="text-[8px] font-medium text-neutral-400 leading-tight">
                      {item.day.slice(0, 1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer meta */}
        <div className="text-[11px] text-neutral-500 border-t border-[#EDE7DD] pt-3 flex items-center justify-between">
          <span>Studio Standard: 90%+ daily presence target</span>
          <span className="text-xs font-semibold text-[#BA954F]">30-Day Rolling Window</span>
        </div>
      </div>
    </div>
  );
};

