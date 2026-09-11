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
      'Clock Out',
      'Early Clock-Out Reason',
      'Total Working (mins)',
      'Total Break (mins)',
      'Effective Working (mins)',
      'Status',
    ];

    const rows = records.map((r) => [
      r.date,
      ...(showUserColumn ? [r.user?.name || 'Unknown', r.user?.email || ''] : []),
      r.clockIn ? formatShortTime(r.clockIn) : 'N/A',
      r.clockOut ? formatShortTime(r.clockOut) : 'N/A',
      r.earlyClockOutReason ? `"${r.earlyClockOutReason.replace(/"/g, '""')}"` : 'N/A',
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
    <div className="bg-white rounded-xl border border-gold-300 shadow-sm overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-5 border-b border-gold-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by date, employee name..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gold-300 focus:outline-hidden focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white text-black placeholder:text-black/40"
            />
          </form>

          <div className="flex items-center gap-2 flex-wrap">
            {/* CSV Export Button */}
            <button
              type="button"
              onClick={exportToCSV}
              disabled={records.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-black bg-white border border-gold-300 rounded-lg hover:bg-gold-100 disabled:opacity-40 cursor-pointer shadow-xs transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-gold-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-black/70 font-bold flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-gold-600" /> Status:
            </span>
            {['ALL', 'PRESENT', 'LATE', 'HALF_DAY', 'ON_LEAVE', 'ABSENT'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatusChange(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer border ${
                  statusFilter === st
                    ? 'bg-gold-500 border-gold-600 text-black shadow-xs'
                    : 'bg-white border-gold-200 text-black/70 hover:bg-gold-50 hover:text-black'
                }`}
              >
                {st === 'ALL' ? 'All Records' : st.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-gold-600" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleDateChange(e.target.value, endDate)}
              className="px-2 py-1 border border-gold-300 rounded-md text-xs bg-white text-black"
              title="Start Date"
            />
            <span className="text-black/50 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleDateChange(startDate, e.target.value)}
              className="px-2 py-1 border border-gold-300 rounded-md text-xs bg-white text-black"
              title="End Date"
            />
            {(startDate || endDate || statusFilter !== 'ALL' || search) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-black hover:text-gold-700 font-bold underline ml-1 cursor-pointer"
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
          <thead className="bg-gold-50/70 border-b border-gold-200 text-black font-extrabold uppercase tracking-wider">
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
          <tbody className="divide-y divide-gold-200">
            {isLoading ? (
              <tr>
                <td colSpan={showUserColumn ? 9 : 8} className="py-12 text-center text-black/60">
                  <div className="inline-flex items-center gap-2 font-bold">
                    <div className="w-4 h-4 border-2 border-gold-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading attendance records...</span>
                  </div>
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={showUserColumn ? 9 : 8} className="py-12 text-center text-black/60">
                  <AlertCircle className="h-8 w-8 text-gold-500 mx-auto mb-2" />
                  <p className="font-bold text-black">No attendance records found</p>
                  <p className="text-xs text-black/50 mt-0.5 font-medium">
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
                      className={`hover:bg-gold-50/40 transition-colors ${
                        isExpanded ? 'bg-gold-50/70' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-black whitespace-nowrap">
                        {new Date(record.date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {showUserColumn && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gold-200 text-black border border-gold-400 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {record.user?.name?.charAt(0) || <UserIcon className="h-3.5 w-3.5" />}
                            </div>
                            <div>
                              <div className="font-bold text-black">{record.user?.name || 'User'}</div>
                              <div className="text-[11px] text-black/60 font-medium">{record.user?.email || ''}</div>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="py-3.5 px-4 font-mono font-bold text-black whitespace-nowrap">
                        {formatShortTime(record.clockIn)}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-black whitespace-nowrap">
                        {record.clockOut ? (
                          <div className="flex items-center gap-1.5">
                            <span>{formatShortTime(record.clockOut)}</span>
                            {record.earlyClockOutReason && (
                              <span
                                title={`Early Clock-Out: "${record.earlyClockOutReason}"`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 cursor-help"
                              >
                                Early
                              </span>
                            )}
                          </div>
                        ) : record.clockIn ? (
                          <span className="text-gold-700 font-extrabold">Active Shift</span>
                        ) : (
                          '--:--'
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-black font-semibold whitespace-nowrap">
                        {formatMinutes(record.totalWorkingMinutes || record.liveWorkingMinutes || 0)}
                      </td>

                      <td className="py-3.5 px-4 text-black font-semibold whitespace-nowrap">
                        {formatMinutes(record.totalBreakMinutes || record.liveBreakMinutes || 0)}
                      </td>

                      <td className="py-3.5 px-4 font-extrabold text-black whitespace-nowrap">
                        {formatMinutes(record.effectiveWorkingMinutes || record.liveEffectiveMinutes || 0)}
                      </td>

                      <td className="py-3.5 px-4">
                        <AttendanceStatusBadge status={record.status} size="xs" />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => toggleRow(record.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-black bg-gold-100 hover:bg-gold-200 border border-gold-300 rounded-md transition-colors cursor-pointer"
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
                      <tr className="bg-gold-50/50">
                        <td colSpan={showUserColumn ? 9 : 8} className="p-4">
                          <div className="bg-white rounded-lg border border-gold-300 p-4 shadow-xs space-y-3">
                            <div className="flex items-center justify-between text-xs border-b border-gold-200 pb-2">
                              <span className="font-extrabold text-black flex items-center gap-1.5">
                                <Clock className="h-4 w-4 text-gold-600" />
                                Session Details for {record.date}
                              </span>
                              <span className="text-black/60 font-medium">Record ID: {record.id}</span>
                            </div>

                            {/* Early Clock-Out Reason Callout if present */}
                            {record.earlyClockOutReason && (
                              <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
                                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-extrabold text-amber-900">Early Clock-Out Reason: </span>
                                  <span className="italic font-semibold text-amber-950">&ldquo;{record.earlyClockOutReason}&rdquo;</span>
                                </div>
                              </div>
                            )}

                            {hasBreaks ? (
                              <div className="space-y-2">
                                <div className="text-xs font-bold text-black flex items-center gap-1.5">
                                  <Coffee className="h-3.5 w-3.5 text-gold-700" />
                                  Logged Breaks ({record.breaks.length})
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                  {record.breaks.map((b, idx) => (
                                    <div
                                      key={b.id || idx}
                                      className="p-2.5 bg-gold-50 border border-gold-300 rounded-md text-xs flex items-center justify-between"
                                    >
                                      <div>
                                        <div className="font-extrabold text-black">
                                          Break #{idx + 1}
                                        </div>
                                        <div className="text-black/70 text-[11px] font-medium">
                                          {formatShortTime(b.startTime)} -{' '}
                                          {b.endTime ? formatShortTime(b.endTime) : 'Ongoing'}
                                        </div>
                                      </div>
                                      <div className="font-bold text-black">
                                        {b.endTime ? `${b.durationMinutes}m` : 'In progress'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-black/60 italic font-medium">
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
