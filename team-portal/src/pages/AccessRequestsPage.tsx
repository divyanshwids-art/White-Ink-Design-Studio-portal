import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { AccessRequest, AccessRequestStatus } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { Modal } from '../components/common/Modal';
import {
  UserCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Mail,
  User,
  Shield,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  KeyRound,
  Filter,
} from 'lucide-react';

export const AccessRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AccessRequestStatus>('PENDING');

  // Approval Credential Modal State
  const [approvedCreds, setApprovedCreds] = useState<{
    name: string;
    email: string;
    role: string;
    company?: string | null;
    plaintextPassword: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);

  // Reject Modal State
  const [rejectingRequest, setRejectingRequest] = useState<AccessRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // Action Loading
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getAccessRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load access requests:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleApprove = async (req: AccessRequest) => {
    setApprovingId(req.id);
    try {
      const res = await api.approveAccessRequest(req.id);
      setApprovedCreds({
        name: req.name,
        email: req.email,
        role: req.requestedRole,
        company: req.companyName,
        plaintextPassword: res.plaintextPassword,
      });
      setIsCopied(false);
      setShowPassword(true);
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to approve request.');
    } finally {
      setApprovingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setIsRejecting(true);
    try {
      await api.rejectAccessRequest(rejectingRequest.id, rejectReason.trim());
      setRejectingRequest(null);
      setRejectReason('');
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to reject request.');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!approvedCreds) return;
    const text = `Portal Access Credentials - White Ink Design Studio\nEmail: ${approvedCreds.email}\nTemporary Password: ${approvedCreds.plaintextPassword}\nRole: ${approvedCreds.role}\n(You will be prompted to set a permanent password upon first login)`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  // Filtered requests
  const filtered = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchEmail = r.email.toLowerCase().includes(q);
      const matchCompany = r.companyName ? r.companyName.toLowerCase().includes(q) : false;
      return matchName || matchEmail || matchCompany;
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gold-100 rounded-lg border border-gold-300 text-gold-700">
              <UserCheck className="h-5 w-5 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-heading">Access Requests & Approvals</h1>
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            Review top-level access applications for Admins and Client Admins before generating authorized accounts
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'border-gold-500 bg-gold-50/80 shadow-xs'
              : 'border-gold-200 bg-white hover:border-gold-400'
          }`}
        >
          <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Total Requests</div>
          <div className="text-2xl font-extrabold text-heading mt-1">{requests.length}</div>
        </div>
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'PENDING'
              ? 'border-gold-500 bg-gold-50/80 shadow-xs'
              : 'border-gold-200 bg-white hover:border-gold-400'
          }`}
        >
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Pending Review
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{pendingCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'APPROVED'
              ? 'border-gold-500 bg-gold-50/80 shadow-xs'
              : 'border-gold-200 bg-white hover:border-gold-400'
          }`}
        >
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" /> Approved
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{approvedCount}</div>
        </div>
        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'REJECTED'
              ? 'border-gold-500 bg-gold-50/80 shadow-xs'
              : 'border-gold-200 bg-white hover:border-gold-400'
          }`}
        >
          <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5" /> Rejected
          </div>
          <div className="text-2xl font-extrabold text-rose-700 mt-1">{rejectedCount}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-card p-3.5 rounded-xl border border-gold-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-700" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or company..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-gold-50/50 border border-gold-200 rounded-lg text-heading focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-3.5 w-3.5 text-gold-700 hidden sm:inline" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-1.5 text-xs font-semibold bg-gold-50/50 border border-gold-200 rounded-lg text-heading focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      {isLoading ? (
        <LoadingSpinner message="Fetching access requests..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No access requests found"
          description={
            search || statusFilter !== 'ALL'
              ? 'No requests match your selected filters. Try clearing search or changing the filter.'
              : 'There are currently no access requests pending review.'
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gold-300 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gold-50 border-b border-gold-200 text-xs uppercase tracking-wider text-black/80 font-bold">
                <tr>
                  <th className="px-5 py-3.5">Applicant</th>
                  <th className="px-5 py-3.5">Requested Role</th>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">Submitted</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-200 text-heading">
                {filtered.map((req) => (
                  <tr key={req.id} className="hover:bg-gold-50/40 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-black">{req.name}</div>
                      <div className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-gold-600" />
                        {req.email}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {req.requestedRole === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-gold-200 text-black border border-gold-400">
                          <Shield className="h-3 w-3" />
                          Admin (White Ink)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full bg-gold-400 text-black border border-gold-600 shadow-2xs">
                          <Building2 className="h-3 w-3" />
                          Client Admin
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {req.companyName ? (
                        <span className="font-semibold text-black flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-neutral-500" />
                          {req.companyName}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-500 italic">White Ink Design Studio</span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-xs text-neutral-600 whitespace-nowrap">
                      <div>{new Date(req.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                      <div className="text-[11px] text-neutral-500">
                        {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {req.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                      {req.status === 'APPROVED' && (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Approved
                          </span>
                          {req.reviewedAt && (
                            <div className="text-[10px] text-neutral-500 mt-1">
                              {new Date(req.reviewedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      )}
                      {req.status === 'REJECTED' && (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-900 border border-rose-300">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                          {req.rejectionReason && (
                            <div className="text-[11px] text-neutral-600 mt-1 italic max-w-xs truncate" title={req.rejectionReason}>
                              "{req.rejectionReason}"
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {req.status === 'PENDING' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={approvingId === req.id}
                            onClick={() => handleApprove(req)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-black bg-gold-400 hover:bg-gold-500 border border-gold-600 transition-colors shadow-2xs cursor-pointer btn-hover-lift disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {approvingId === req.id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingRequest(req);
                              setRejectReason('');
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-colors cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">Completed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* One-Time Credential Display Modal */}
      {approvedCreds && (
        <Modal
          isOpen={true}
          onClose={() => setApprovedCreds(null)}
          title="Account Generated Successfully"
          subtitle="One-time display of auto-generated login credentials"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 leading-relaxed font-medium">
                The access request has been approved. An authorized account has been provisioned with forced password change on first login.
              </div>
            </div>

            <div className="bg-gold-50/50 p-4 rounded-xl border border-gold-300 space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                  Applicant
                </label>
                <div className="font-bold text-black text-sm">{approvedCreds.name}</div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                  Login Email
                </label>
                <div className="font-mono text-sm text-black bg-white px-3 py-1.5 rounded-lg border border-gold-200 select-all">
                  {approvedCreds.email}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                  Temporary Generated Password
                </label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    readOnly
                    value={approvedCreds.plaintextPassword}
                    className="w-full font-mono text-base font-bold bg-white px-3 py-2 pr-10 rounded-lg border border-gold-400 text-black focus:outline-none select-all tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-1 cursor-pointer"
                    title={showPassword ? 'Mask password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {approvedCreds.company && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                    Assigned Client Company
                  </label>
                  <div className="text-xs font-semibold text-black">{approvedCreds.company}</div>
                </div>
              )}
            </div>

            <div className="p-3 bg-gold-100/70 border border-gold-300 rounded-xl flex items-center gap-2.5 text-xs text-black font-medium">
              <KeyRound className="h-4 w-4 text-gold-800 shrink-0" />
              <span>
                These credentials are also archived in your <strong>Credentials Vault</strong> so you can retrieve them anytime.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer btn-hover-lift shadow-xs"
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {isCopied ? 'Copied to Clipboard!' : 'Copy Credentials'}
              </button>
              <button
                type="button"
                onClick={() => setApprovedCreds(null)}
                className="px-4 py-2 text-xs font-semibold text-black bg-white border border-gold-300 hover:bg-gold-50 rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Confirmation Modal */}
      {rejectingRequest && (
        <Modal
          isOpen={true}
          onClose={() => {
            setRejectingRequest(null);
            setRejectReason('');
          }}
          title="Reject Access Request"
          subtitle={`Decline application for ${rejectingRequest.name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900 font-medium">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                Declining this request will prevent account creation. You may specify an optional reason for the record.
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1.5">
                Rejection Reason (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g., Unverified corporate domain / requires direct sponsor referral"
                className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-black focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
              <button
                type="button"
                onClick={() => {
                  setRejectingRequest(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-xs font-semibold text-black bg-white border border-gold-300 hover:bg-gold-50 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRejecting}
                onClick={handleConfirmReject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 border border-rose-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
