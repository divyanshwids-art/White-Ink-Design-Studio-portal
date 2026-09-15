import React, { useState } from 'react';
import { Attendance } from '../../types';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';
import {
  Search,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  Coffee,
  Clock,
  User as UserIcon,
  Download,
  AlertCircle,
} from 'lucide-react';

interface AttendanceHistoryTableProps {
  records: Attendance[];
  isLoading: boolean;
  showUserColumn?: boolean;
  onFilterChange?: (filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  }) => void;
}

export const AttendanceHistoryTable: React.FC<AttendanceHistoryTableProps> = ({
  records,
  isLoading,
  showUserColumn = false,
  onFilterChange,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onFilterChange) {
      onFilterChange({
        search,
        status: statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    if (onFilterChange) {
      onFilterChange({
        search,
        status: newStatus,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    }
  };

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    if (onFilterChange) {
      onFilterChange({
        search,
        status: statusFilter,
        startDate: start || undefined,
        endDate: end || undefined,
      });
    }
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setStartDate('');
    setEndDate('');
    if (onFilterChange) {
      onFilterChange({
        search: '',
        status: 'ALL',
        startDate: undefined,
        endDate: undefined,
      });
    }
  };

  const formatShortTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatMinutes = (mins: number) => {
    if (!mins) return '0h 0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const toggleRow = (id: string) => {
    setExpandedRowId((prev) => (prev === id ? null : id));
  };

  // Export to CSV helper
  const exportToCSV = () => {
    if (!records || records.length === 0) return;
    const headers = [
      'Date',
      ...(showUserColumn ? ['Employee Name', 'Email'] : []),
      'Clock In',
      'Clock In Reason',
      'Clock Out',
      'Clock Out / Early Reason',
      'Total Working (mins)',
      'Total Break (mins)',
      'Effective Working (mins)',
      'Status',
    ];

    const rows = records.map((r) => [
      r.date,
      ...(showUserColumn ? [r.user?.name || 'Unknown', r.user?.email || ''] : []),
      r.clockIn ? formatShortTime(r.clockIn) : 'N/A',
      r.clockInReason ? `"${r.clockInReason.replace(/"/g, '""')}"` : 'N/A',
      r.clockOut ? formatShortTime(r.clockOut) : 'N/A',
      (r.clockOutReason || r.earlyClockOutReason) ? `"${(r.clockOutReason || r.earlyClockOutReason || '').replace(/"/g, '""')}"` : 'N/A',
      r.totalWorkingMinutes || 0,
      r.totalBreakMinutes || 0,
      r.effectiveWorkingMinutes || 0,
      r.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-5 border-b border-[#EDE7DD] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by date, employee name..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-[#EDE7DD] focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] bg-[#FAF7F2]/40 text-neutral-900 placeholder:text-neutral-400 transition-all"
            />
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={exportToCSV}
              disabled={records.length === 0}
              className="btn-gold-secondary px-3.5 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5 text-[#BA954F]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-neutral-500 font-semibold flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5 text-[#BA954F]" /> Status:
            </span>
            {['ALL', 'PRESENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'ABSENT'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                  statusFilter === st
                    ? 'bg-[#BA954F] border-[#BA954F] text-white shadow-xs'
                    : 'bg-white border-[#EDE7DD] text-neutral-600 hover:bg-[#FAF7F2] hover:text-neutral-900'
                }`}
              >
                {st === 'ALL' ? 'All Records' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-[#BA954F]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange(e.target.value, endDate)}
              className="px-2.5 py-1 border border-[#EDE7DD] rounded-lg text-xs bg-[#FAF7F2]/40 text-neutral-800"
              title="Start Date"
            />
            <span className="text-neutral-400 font-medium">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange(startDate, e.target.value)}
              className="px-2.5 py-1 border border-[#EDE7DD] rounded-lg text-xs bg-[#FAF7F2]/40 text-neutral-800"
              title="End Date"
            />
            {(startDate || endDate || statusFilter !== 'ALL' || search) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-[#BA954F] font-semibold hover:underline ml-1 cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF7F2] border-b border-[#EDE7DD] text-neutral-600 font-semibold uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4">Date</th>
              {showUserColumn && <th className="py-3.5 px-4">Employee</th>}
              <th className="py-3.5 px-4">Clock In</th>
              <th className="py-3.5 px-4">Clock Out</th>
              <th className="py-3.5 px-4">Total Work</th>
              <th className="py-3.5 px-4">Total Break</th>
              <th className="py-3.5 px-4">Effective Hours</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EDE7DD]">
            {isLoading ? (
              <tr>
                <td colSpan={showUserColumn ? 9 : 8} className="py-12 text-center text-neutral-500">
                  <div className="inline-flex items-center gap-2 font-medium">
                    <div className="w-4 h-4 border-2 border-[#BA954F] border-t-transparent rounded-full animate-spin" />
                    <span>Loading attendance records...</span>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={showUserColumn ? 9 : 8} className="py-12 text-center text-neutral-500">
                  <AlertCircle className="h-8 w-8 text-[#BA954F] mx-auto mb-2 opacity-60" />
                  <p className="font-serif text-base font-bold text-neutral-900">No attendance records found</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Try adjusting your filters or search query.
                  </p>
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const isExpanded = expandedRowId === record.id;
                const hasBreaks = record.breaks && record.breaks.length > 0;

                return (
                  <React.Fragment key={record.id}>
                    <tr
                      className={`hover:bg-[#FAF7F2]/60 transition-colors ${
                        isExpanded ? 'bg-[#FAF7F2]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-neutral-900 whitespace-nowrap">
                        {new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {showUserColumn && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#FAF7F2] text-[#BA954F] border border-[#EDE7DD] flex items-center justify-center font-bold text-xs uppercase shrink-0 font-serif">
                              {record.user?.name?.charAt(0) || <UserIcon className="h-3.5 w-3.5" />}
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900">{record.user?.name || 'User'}</div>
                              <div className="text-[11px] text-neutral-500">{record.user?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="py-3.5 px-4 font-mono text-neutral-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{formatShortTime(record.clockIn)}</span>
                          {record.clockInReason && (
                            <span
                              title={`Clock-In Note: "${record.clockInReason}"`}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF7F2] text-[#BA954F] border border-[#EDE7DD] cursor-help"
                            >
                              Note
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-neutral-800 whitespace-nowrap">
                        {record.clockOut ? (
                          <div className="flex items-center gap-1.5">
                            <span>{formatShortTime(record.clockOut)}</span>
                            {(record.clockOutReason || record.earlyClockOutReason) && (
                              <span
                                title={`Clock-Out Note: "${record.clockOutReason || record.earlyClockOutReason}"`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDF6E9] text-[#B45309] border border-[#F9E2AF] cursor-help"
                              >
                                {record.earlyClockOutReason ? 'Early' : 'Note'}
                              </span>
                            )}
                          </div>
                        ) : record.clockIn ? (
                          <span className="text-[#BA954F] font-semibold">Active Shift</span>
                        ) : (
                          '--:--'
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-700 font-medium whitespace-nowrap">
                        {formatMinutes(record.totalWorkingMinutes || record.liveWorkingMinutes || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-neutral-700 font-medium whitespace-nowrap">
                        {formatMinutes(record.totalBreakMinutes || record.liveBreakMinutes || 0)}
                      </td>

                      <td className="py-3.5 px-4 font-bold text-neutral-900 whitespace-nowrap">
                        {formatMinutes(record.effectiveWorkingMinutes || record.liveEffectiveMinutes || 0)}
                      </td>

                      <td className="py-3.5 px-4">
                        <AttendanceStatusBadge status={record.status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleRow(record.id)}
                          className="btn-gold-secondary inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg"
                        >
                          <span>{hasBreaks ? `${record.breaks.length} Break(s)` : 'View'}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Accordion for Details & Breaks */}
                    {isExpanded && (
                      <tr className="bg-[#FAF7F2]/50">
                        <td colSpan={showUserColumn ? 9 : 8} className="p-4">
                          <div className="bg-white rounded-xl border border-[#EDE7DD] p-4 shadow-xs space-y-3">
                            <div className="flex items-center justify-between text-xs border-b border-[#EDE7DD] pb-2">
                              <span className="font-bold text-neutral-900 flex items-center gap-1.5 font-serif">
                                <Clock className="h-4 w-4 text-[#BA954F]" />
                                Session Details for {record.date}
                              </span>
                              <span className="text-neutral-400 font-mono text-[11px]">ID: {record.id}</span>
                            </div>

                            {/* Clock In Reason if present */}
                            {record.clockInReason && (
                              <div className="p-3 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl text-xs text-neutral-800 flex items-start gap-2.5">
                                <AlertCircle className="h-4 w-4 text-[#BA954F] shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-[#BA954F]">Clock-In Explanation / Note: </span>
                                  <span className="italic text-neutral-700">&ldquo;{record.clockInReason}&rdquo;</span>
                                </div>
                              </div>
                            )}

                            {/* Clock-Out / Early Reason if present */}
                            {(record.clockOutReason || record.earlyClockOutReason) && (
                              <div className="p-3 bg-[#FDF6E9] border border-[#F9E2AF] rounded-xl text-xs text-[#B45309] flex items-start gap-2.5">
                                <AlertCircle className="h-4 w-4 text-[#B45309] shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-[#B45309]">
                                    {record.earlyClockOutReason ? 'Early Clock-Out Reason: ' : 'Clock-Out Reason: '}
                                  </span>
                                  <span className="italic text-amber-950">
                                    &ldquo;{record.clockOutReason || record.earlyClockOutReason}&rdquo;
                                  </span>
                                </div>
                              </div>
                            )}

                            {hasBreaks ? (
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5">
                                  <Coffee className="h-3.5 w-3.5 text-[#BA954F]" />
                                  Logged Breaks ({record.breaks.length})
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {record.breaks.map((b, idx) => (
                                    <div
                                      key={b.id || idx}
                                      className="p-2.5 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl text-xs flex items-center justify-between"
                                    >
                                      <div>
                                        <div className="font-semibold text-neutral-900">
                                          Break #{idx + 1}
                                        </div>
                                        <div className="text-neutral-500 text-[11px]">
                                          {formatShortTime(b.startTime)} -{' '}
                                          {b.endTime ? formatShortTime(b.endTime) : 'Ongoing'}
                                        </div>
                                      </div>
                                      <div className="font-bold text-[#BA954F]">
                                        {b.endTime ? `${b.durationMinutes}m` : 'In progress'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-neutral-400 italic font-medium">
                                No break sessions were logged during this shift.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

