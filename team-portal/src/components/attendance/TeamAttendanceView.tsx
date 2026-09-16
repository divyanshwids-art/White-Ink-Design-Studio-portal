import React, { useState, useEffect } from 'react';
import { Attendance, User } from '../../types';
import { api } from '../../services/api';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import { AttendanceHistoryTable } from './AttendanceHistoryTable';
import {
  Users,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  Coffee,
  AlertCircle,
  PlayCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

interface TeamAttendanceViewProps {
  teamMembers: User[];
}

export const TeamAttendanceView: React.FC<TeamAttendanceViewProps> = ({ teamMembers }) => {
  const [range, setRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTeamData = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTeamAttendance({
        range,
        startDate: range === 'custom' ? startDate : undefined,
        endDate: range === 'custom' ? endDate : undefined,
        employeeId: selectedEmployeeId !== 'ALL' ? selectedEmployeeId : undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        search: search.trim() || undefined,
      });
      setRecords(data);
    } catch (err) {
      console.error('Failed to load team attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamData();
  }, [range, selectedEmployeeId, selectedStatus, startDate, endDate]);

  // Compute live team glance metrics for Today
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.date === todayStr);

  const workingNow = todayRecords.filter((r) => r.isCurrentlyWorking || (r.clockIn && !r.clockOut && !r.activeBreak));
  const onBreakNow = todayRecords.filter((r) => !!r.activeBreak);
  const shiftCompleted = todayRecords.filter((r) => !!r.clockOut);
  const clockedInTotal = todayRecords.filter((r) => !!r.clockIn);

  return (
    <div className="space-y-6">
      {/* Top Live Team Glance (Today) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-1">
            <span>Currently Working</span>
            <PlayCircle className="h-4 w-4 text-[#2D6A4F] animate-pulse" />
          </div>
          <div className="text-2xl font-bold font-serif text-neutral-900">{workingNow.length}</div>
          <div className="text-[11px] text-neutral-500 font-medium mt-1">Active on duty right now</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-1">
            <span>On Break</span>
            <Coffee className="h-4 w-4 text-[#B45309]" />
          </div>
          <div className="text-2xl font-bold font-serif text-neutral-900">{onBreakNow.length}</div>
          <div className="text-[11px] text-neutral-500 font-medium mt-1">Temporary pause</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-1">
            <span>Completed Shift</span>
            <CheckCircle2 className="h-4 w-4 text-[#BA954F]" />
          </div>
          <div className="text-2xl font-bold font-serif text-neutral-900">{shiftCompleted.length}</div>
          <div className="text-[11px] text-neutral-500 font-medium mt-1">Clocked out today</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between text-xs text-neutral-600 font-semibold mb-1">
            <span>Total Clocked-In</span>
            <Users className="h-4 w-4 text-[#BA954F]" />
          </div>
          <div className="text-2xl font-bold font-serif text-neutral-900">
            {clockedInTotal.length}{' '}
            <span className="text-xs font-normal text-neutral-500">
              / {teamMembers.length} staff
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 font-medium mt-1">
            {teamMembers.length - clockedInTotal.length} not yet logged
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white rounded-2xl border border-[#EDE7DD] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Preset Range Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setRange('today')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                range === 'today' ? 'bg-[#BA954F] text-white shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setRange('week')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                range === 'week' ? 'bg-[#BA954F] text-white shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              This Week
            </button>
            <button
              type="button"
              onClick={() => setRange('month')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                range === 'month' ? 'bg-[#BA954F] text-white shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => setRange('custom')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                range === 'custom' ? 'bg-[#BA954F] text-white shadow-xs font-semibold' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={fetchTeamData}
            disabled={isLoading}
            className="btn-gold-secondary px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#BA954F] ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync Live Records</span>
          </button>
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-[#EDE7DD] text-xs">
          {/* Employee Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5">
              Filter by Member
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-neutral-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
            >
              <option value="ALL">All Team Members ({teamMembers.length})</option>
              {teamMembers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5">
              Status Filter
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-neutral-900 font-medium focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="LATE">Late</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="ON_LEAVE">On Leave</option>
              <option value="ABSENT">Absent</option>
            </select>
          </div>

          {/* Custom Date Pickers if custom selected */}
          {range === 'custom' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-neutral-900 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EDE7DD] bg-[#FAF7F2]/40 text-neutral-900 font-medium"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Team Attendance Table */}
      <AttendanceHistoryTable
        records={records}
        isLoading={isLoading}
        showUserColumn={true}
        onFilterChange={(filters) => {
          if (filters.search !== undefined) setSearch(filters.search);
          if (filters.status !== undefined) setSelectedStatus(filters.status);
          if (filters.startDate !== undefined) setStartDate(filters.startDate);
          if (filters.endDate !== undefined) setEndDate(filters.endDate);
        }}
      />
    </div>
  );
};

