import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { LeaveRequest, LeaveType, LeaveStatus, User } from '../types';
import { exportToCsv } from '../utils/csvExport';
import {
  CalendarDays,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  AlertCircle,
  Calendar,
  User as UserIcon,
  Trash2,
  X,
  Briefcase,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

interface LeavesPageProps {
  onNavigate?: (path: string) => void;
}

export const LeavesPage: React.FC<LeavesPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const isAdminOrManager = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(isAdminOrManager ? 'ALL' : user?.id || 'ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  // Request Modal
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    userId: user?.id || '',
    leaveType: 'CASUAL' as LeaveType,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
    isBackdated: false,
  });
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState('');

  // Rejection Dialog
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingLeave, setRejectingLeave] = useState<LeaveRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [leavesRes, usersRes] = await Promise.all([
        api.getLeaves({
          userId: isAdminOrManager ? selectedUser : user?.id,
          status: selectedStatus,
        }),
        isAdminOrManager ? api.getUsers().catch(() => []) : Promise.resolve([]),
      ]);
      setLeaves(leavesRes);
      setUsers(usersRes);
    } catch (err) {
      console.error('Error loading leaves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedUser, selectedStatus, search]);

  const handleOpenApply = () => {
    const today = new Date().toISOString().split('T')[0];
    setApplyForm({
      userId: user?.id || '',
      leaveType: 'CASUAL',
      startDate: today,
      endDate: today,
      reason: '',
      isBackdated: false,
    });
    setApplyError('');
    setIsApplyModalOpen(true);
  };

  const handleCalculateDays = (start: string, end: string) => {
    if (!start || !end) return 1;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  const handleSubmitApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.reason.trim()) {
      setApplyError('Please provide a reason for the leave application.');
      return;
    }

    try {
      setApplyLoading(true);
      setApplyError('');

      const totalDays = handleCalculateDays(applyForm.startDate, applyForm.endDate);

      await api.createLeave({
        userId: isAdminOrManager && applyForm.userId ? applyForm.userId : user?.id,
        leaveType: applyForm.leaveType,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        totalDays,
        reason: applyForm.reason.trim(),
        isBackdated: applyForm.isBackdated,
      });

      setIsApplyModalOpen(false);
      loadData();
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit leave request');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm('Approve this leave request? Attendance will automatically update to ON_LEAVE.')) return;
    try {
      setActionLoading(true);
      await api.approveLeave(id);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve leave request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (item: LeaveRequest) => {
    setRejectingLeave(item);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingLeave) return;
    if (!rejectionReason.trim()) {
      alert('Please specify a rejection reason for the employee.');
      return;
    }

    try {
      setActionLoading(true);
      await api.rejectLeave(rejectingLeave.id, rejectionReason.trim());
      setIsRejectModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject leave request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this leave record?')) return;
    try {
      await api.deleteLeave(id);
      setLeaves((prev) => prev.filter((l) => l.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete leave record');
    }
  };

  const handleExportCSV = () => {
    const rows = filteredLeaves.map((l) => ({
      id: l.id,
      employeeName: l.user?.name || 'Unknown',
      employeeEmail: l.user?.email || 'N/A',
      leaveType: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      totalDays: l.totalDays,
      status: l.status,
      isBackdated: l.isBackdated ? 'Yes' : 'No',
      reason: l.reason,
      rejectionReason: l.rejectionReason || '',
      approvedBy: l.approvedBy?.name || '',
      appliedAt: new Date(l.createdAt).toLocaleString(),
    }));

    exportToCsv('Leaves_Report_' + new Date().toISOString().split('T')[0], rows, [
      { key: 'employeeName', label: 'Employee Name' },
      { key: 'employeeEmail', label: 'Employee Email' },
      { key: 'leaveType', label: 'Leave Type' },
      { key: 'startDate', label: 'Start Date' },
      { key: 'endDate', label: 'End Date' },
      { key: 'totalDays', label: 'Total Days' },
      { key: 'status', label: 'Status' },
      { key: 'isBackdated', label: 'Backdated / Retroactive' },
      { key: 'reason', label: 'Reason' },
      { key: 'rejectionReason', label: 'Rejection Notes' },
      { key: 'approvedBy', label: 'Approved/Reviewed By' },
      { key: 'appliedAt', label: 'Applied At' },
    ]);
  };

  // Filtered List
  const filteredLeaves = leaves.filter((l) => {
    const matchesSearch =
      !search ||
      l.reason.toLowerCase().includes(search.toLowerCase()) ||
      (l.user?.name && l.user.name.toLowerCase().includes(search.toLowerCase())) ||
      l.leaveType.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedType === 'ALL' || l.leaveType === selectedType;

    return matchesSearch && matchesType;
  });

  // KPIs
  const totalCount = filteredLeaves.length;
  const pendingCount = filteredLeaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = filteredLeaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = filteredLeaves.filter((l) => l.status === 'REJECTED').length;
  const totalDaysTaken = filteredLeaves
    .filter((l) => l.status === 'APPROVED')
    .reduce((acc, curr) => acc + (curr.totalDays || 1), 0);

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-0.5 rounded-full bg-[#EBF3ED] text-[#2D6A4F] border border-[#D1E7D8]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#2D6A4F]" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-0.5 rounded-full bg-[#FDF0ED] text-[#9E2A2B] border border-[#F5D0C5]">
            <XCircle className="h-3.5 w-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-0.5 rounded-full bg-[#FDF6E9] text-[#B45309] border border-[#F9E2AF]">
            <Clock className="h-3.5 w-3.5 text-[#B45309]" /> Pending Review
          </span>
        );
    }
  };

  const getLeaveTypeBadge = (type: LeaveType) => {
    const map: Record<string, { label: string; color: string }> = {
      CASUAL: { label: 'Casual Leave', color: 'bg-[#FAF7F2] text-[#BA954F] border-[#EDE7DD] font-semibold' },
      SICK: { label: 'Sick / Medical', color: 'bg-[#FDF6E9] text-[#B45309] border-[#F9E2AF] font-semibold' },
      ANNUAL: { label: 'Annual Vacation', color: 'bg-[#EBF3ED] text-[#2D6A4F] border-[#D1E7D8] font-semibold' },
      UNPAID: { label: 'Unpaid Leave', color: 'bg-[#FAF7F2] text-neutral-600 border-[#EDE7DD] font-medium' },
      EMERGENCY: { label: 'Emergency', color: 'bg-[#FDF0ED] text-[#9E2A2B] border-[#F5D0C5] font-semibold' },
      MATERNITY_PATERNITY: { label: 'Parental', color: 'bg-[#FAF7F2] text-[#BA954F] border-[#EDE7DD] font-semibold' },
      OTHER: { label: 'Other', color: 'bg-[#FAF7F2] text-neutral-600 border-[#EDE7DD] font-medium' },
    };
    const item = map[type] || { label: type, color: 'bg-[#FAF7F2] text-neutral-600 border-[#EDE7DD]' };
    return (
      <span className={`text-[11px] px-2.5 py-0.5 rounded-full border ${item.color}`}>
        {item.label}
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold tracking-widest uppercase text-[#BA954F]">
            Absence & Vacation Administration
          </span>
          <h1 className="font-serif text-3xl font-bold text-neutral-900 tracking-tight mt-1 flex items-center gap-2.5">
            <CalendarDays className="h-7 w-7 text-[#BA954F]" />
            Time Off & Leave Management
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Apply for studio leave, monitor approvals, and synchronize time-off records directly with daily attendance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            className="btn-gold-secondary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2"
          >
            <Download className="h-3.5 w-3.5 text-[#BA954F]" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={handleOpenApply}
            className="btn-gold-primary px-4 py-2 text-xs font-semibold inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="p-3 bg-[#FAF7F2] text-[#BA954F] rounded-xl border border-[#EDE7DD] shrink-0">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500">Total Applications</div>
            <div className="text-2xl font-bold font-serif text-neutral-900 mt-0.5">{totalCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="p-3 bg-[#FDF6E9] text-[#B45309] rounded-xl border border-[#F9E2AF] shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500">Pending Review</div>
            <div className="text-2xl font-bold font-serif text-neutral-900 mt-0.5">{pendingCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="p-3 bg-[#EBF3ED] text-[#2D6A4F] rounded-xl border border-[#D1E7D8] shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500">Approved Leaves</div>
            <div className="text-2xl font-bold font-serif text-neutral-900 mt-0.5">{approvedCount}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex items-center gap-4">
          <div className="p-3 bg-[#FAF7F2] text-[#BA954F] rounded-xl border border-[#EDE7DD] shrink-0">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-neutral-500">Total Approved Days</div>
            <div className="text-2xl font-bold font-serif text-neutral-900 mt-0.5">{totalDaysTaken} Days</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search reasons, employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {isAdminOrManager && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-[#BA954F]" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="text-xs font-medium py-2 px-3 bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#BA954F] text-neutral-900 cursor-pointer"
              >
                <option value="ALL">All Employees</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs font-medium py-2 px-3 bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#BA954F] text-neutral-900 cursor-pointer"
          >
            <option value="ALL">All Leave Types</option>
            <option value="CASUAL">Casual Leave</option>
            <option value="SICK">Sick / Medical</option>
            <option value="ANNUAL">Annual Vacation</option>
            <option value="UNPAID">Unpaid</option>
            <option value="EMERGENCY">Emergency</option>
            <option value="MATERNITY_PATERNITY">Parental</option>
            <option value="OTHER">Other</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs font-medium py-2 px-3 bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#BA954F] text-neutral-900 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Leaves List */}
      {loading ? (
        <div className="p-12 text-center text-neutral-500 bg-white rounded-2xl border border-[#EDE7DD]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-[#BA954F] border-t-transparent mb-3" />
          <p className="text-sm font-medium">Loading leave records...</p>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="p-12 text-center text-neutral-500 bg-white rounded-2xl border border-[#EDE7DD]">
          <CalendarDays className="h-10 w-10 text-[#BA954F] mx-auto mb-3 opacity-60" />
          <h3 className="font-serif text-base font-bold text-neutral-900">No leave requests found</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
            {search || selectedStatus !== 'ALL' || selectedType !== 'ALL'
              ? 'No records match the active filter criteria.'
              : 'Submitted leave requests and time-off tracking records will appear here.'}
          </p>
          <button
            type="button"
            onClick={handleOpenApply}
            className="btn-gold-primary mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl"
          >
            <Plus className="h-3.5 w-3.5" />
            Apply for Leave
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLeaves.map((item) => {
            const isOwner = user?.id === item.userId;
            const canApprove = isAdminOrManager && item.status === 'PENDING';

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#EDE7DD] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:border-[#BA954F]/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left details */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getStatusBadge(item.status)}
                    {getLeaveTypeBadge(item.leaveType)}
                    {item.isBackdated && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#B45309] bg-[#FDF6E9] px-2.5 py-0.5 rounded-full border border-[#F9E2AF]">
                        <AlertTriangle className="h-3 w-3" /> Retroactive / Backdated
                      </span>
                    )}
                    <span className="text-xs text-neutral-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#BA954F]" />
                      Applied on {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-serif text-lg font-bold text-neutral-900">
                      {item.startDate === item.endDate
                        ? item.startDate
                        : `${item.startDate} to ${item.endDate}`}
                    </span>
                    <span className="text-xs font-semibold text-[#BA954F] bg-[#FAF7F2] px-2.5 py-0.5 rounded-full border border-[#EDE7DD]">
                      {item.totalDays} {item.totalDays === 1 ? 'Day' : 'Days'}
                    </span>
                  </div>

                  <p className="text-sm text-neutral-700 leading-relaxed max-w-2xl bg-[#FAF7F2]/60 p-3 rounded-xl border border-[#EDE7DD]">
                    "{item.reason}"
                  </p>

                  {/* Metadata & Rejection note */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 pt-1">
                    {item.user && (
                      <span className="flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5 text-[#BA954F]" />
                        Staff: <span className="font-semibold text-neutral-900">{item.user.name}</span>
                        <span className="text-neutral-400">({item.user.email})</span>
                      </span>
                    )}
                    {item.approvedBy && (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#2D6A4F]" />
                        Reviewed by: <span className="font-semibold text-neutral-900">{item.approvedBy.name}</span>
                      </span>
                    )}
                  </div>

                  {item.rejectionReason && (
                    <div className="p-3 bg-[#FDF0ED] rounded-xl border border-[#F5D0C5] text-xs text-[#9E2A2B] flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-[#9E2A2B] mt-0.5" />
                      <div>
                        <span className="font-semibold">Rejection Note: </span>
                        {item.rejectionReason}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#EDE7DD]">
                  {canApprove && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleApprove(item.id)}
                        className="btn-gold-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve Leave
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleOpenReject(item)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#FDF0ED] hover:bg-[#FBE5E0] text-[#9E2A2B] border border-[#F5D0C5] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </div>
                  )}

                  {(isAdminOrManager || (isOwner && item.status === 'PENDING')) && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-neutral-400 hover:text-[#9E2A2B] hover:bg-[#FDF0ED] rounded-xl transition-colors cursor-pointer"
                      title="Delete Leave Application"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EDE7DD] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE7DD] pb-3">
              <h2 className="font-serif text-lg font-bold text-neutral-900 flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#BA954F]" />
                Apply for Leave / Time Off
              </h2>
              <button
                type="button"
                onClick={() => setIsApplyModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {applyError && (
              <div className="p-3 bg-[#FDF0ED] border border-[#F5D0C5] text-[#9E2A2B] text-xs rounded-xl">
                {applyError}
              </div>
            )}

            <form onSubmit={handleSubmitApply} className="space-y-4">
              {isAdminOrManager && users.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Employee Account
                  </label>
                  <select
                    value={applyForm.userId}
                    onChange={(e) => setApplyForm({ ...applyForm, userId: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Leave Category <span className="text-[#BA954F]">*</span>
                </label>
                <select
                  required
                  value={applyForm.leaveType}
                  onChange={(e) => setApplyForm({ ...applyForm, leaveType: e.target.value as LeaveType })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer"
                >
                  <option value="CASUAL">Casual Leave</option>
                  <option value="SICK">Sick / Medical Leave</option>
                  <option value="ANNUAL">Annual Vacation Leave</option>
                  <option value="UNPAID">Unpaid Time Off</option>
                  <option value="EMERGENCY">Family Emergency</option>
                  <option value="MATERNITY_PATERNITY">Parental Leave</option>
                  <option value="OTHER">Other Purpose</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    Start Date <span className="text-[#BA954F]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={applyForm.startDate}
                    onChange={(e) => setApplyForm({ ...applyForm, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                    End Date <span className="text-[#BA954F]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={applyForm.startDate}
                    value={applyForm.endDate}
                    onChange={(e) => setApplyForm({ ...applyForm, endDate: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-[#FAF7F2] rounded-xl border border-[#EDE7DD]">
                <span className="text-xs text-neutral-600 font-medium">Calculated Duration:</span>
                <span className="text-sm font-bold font-serif text-neutral-900">
                  {handleCalculateDays(applyForm.startDate, applyForm.endDate)} Working Day(s)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="backdated"
                  checked={applyForm.isBackdated}
                  onChange={(e) => setApplyForm({ ...applyForm, isBackdated: e.target.checked })}
                  className="rounded border-[#EDE7DD] text-[#BA954F] focus:ring-[#BA954F]"
                />
                <label htmlFor="backdated" className="text-xs text-neutral-700 select-none font-medium">
                  Retroactive / Backdated Leave (Already taken due to emergency or medical reason)
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Reason & Notes <span className="text-[#BA954F]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the purpose or reason for the requested time off..."
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm({ ...applyForm, reason: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE7DD]">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="btn-gold-secondary px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applyLoading}
                  className="btn-gold-primary px-4 py-2 text-xs font-semibold disabled:opacity-50"
                >
                  {applyLoading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {isRejectModalOpen && rejectingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#EDE7DD] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE7DD] pb-3">
              <h2 className="font-serif text-lg font-bold text-neutral-900 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-[#9E2A2B]" />
                Reject Leave Request
              </h2>
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1">
                  Reason for Rejection <span className="text-[#9E2A2B]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide clarity on why the leave request could not be approved..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:ring-1 focus:ring-[#9E2A2B]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EDE7DD]">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="btn-gold-secondary px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#9E2A2B] hover:bg-[#831F20] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
