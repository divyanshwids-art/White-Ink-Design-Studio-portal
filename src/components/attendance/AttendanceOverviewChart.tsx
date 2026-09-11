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

      {/* 7-Day Attendance Trend Chart */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EDE7DD] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-neutral-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#BA954F]" />
              7-Day Attendance Trajectory
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Daily turnout distribution across all active studio team members
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-medium text-neutral-600">
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

        {/* Bar Chart Visualization */}
        <div className="pt-4 pb-2">
          <div className="h-44 flex items-end justify-between gap-3 px-2">
            {stats.weeklyTrend.map((item, idx) => {
              const presentHeight = Math.round((item.present / maxWeeklyAttendance) * 100);
              const lateHeight = Math.round((item.late / maxWeeklyAttendance) * 100);
              const leaveHeight = Math.round((item.onLeave / maxWeeklyAttendance) * 100);

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                  {/* Tooltip on hover */}
                  <div className="absolute -top-10 bg-neutral-900 text-white text-[10px] font-medium px-2.5 py-1 rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-neutral-700">
                    {item.day} ({item.date}): {item.present} Present, {item.late} Late
                  </div>

                  {/* Bars Stack */}
                  <div className="w-full max-w-8 bg-[#FAF7F2] rounded-t-xl overflow-hidden flex flex-col justify-end h-36 border-b border-[#EDE7DD]">
                    {leaveHeight > 0 && (
                      <div
                        style={{ height: `${leaveHeight}%` }}
                        className="w-full bg-[#94A3B8]"
                        title={`Leave: ${item.onLeave}`}
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
                      className="w-full bg-gradient-to-t from-[#845F2F] to-[#BA954F] rounded-t-sm"
                      title={`Present: ${item.present}`}
                    />
                  </div>

                  {/* Label */}
                  <div className="text-[11px] font-semibold text-neutral-500 group-hover:text-neutral-900 transition-colors">
                    {item.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer meta */}
        <div className="text-[11px] text-neutral-500 border-t border-[#EDE7DD] pt-3 flex items-center justify-between">
          <span>Studio Standard: 90%+ daily presence target</span>
          <span>Synchronized automatically</span>
        </div>
      </div>
    </div>
  );
};

