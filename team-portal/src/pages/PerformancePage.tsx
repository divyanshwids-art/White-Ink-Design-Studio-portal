import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PerformanceReview, ReviewStatus, User } from '../types';
import { exportToCsv } from '../utils/csvExport';
import {
  Award,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Download,
  User as UserIcon,
  Trash2,
  Edit2,
  X,
  TrendingUp,
  ThumbsUp,
  ShieldCheck,
} from 'lucide-react';

export const PerformancePage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const isAdminOrManager = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('ALL');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [form, setForm] = useState({
    employeeId: '',
    reviewPeriod: 'Q1 2026',
    score: 85,
    strengths: '',
    improvements: '',
    notes: '',
  });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [ackLoading, setAckLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reviewsData, usersData] = await Promise.all([
        api.getPerformanceReviews({
          employeeId: selectedUser !== 'ALL' ? selectedUser : undefined,
        }),
        isAdminOrManager ? api.getUsers() : Promise.resolve([]),
      ]);
      setReviews(reviewsData);
      setUsers(usersData.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN'));
    } catch (err) {
      console.error('Error loading performance reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedUser]);

  const handleOpenCreate = () => {
    setForm({
      employeeId: users[0]?.id || '',
      reviewPeriod: 'Q1 ' + new Date().getFullYear(),
      score: 85,
      strengths: '',
      improvements: '',
      notes: '',
    });
    setIsEditing(false);
    setCurrentId(null);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rev: PerformanceReview) => {
    setForm({
      employeeId: rev.employeeId,
      reviewPeriod: rev.reviewPeriod,
      score: rev.score,
      strengths: rev.strengths || '',
      improvements: rev.improvements || '',
      notes: rev.notes || '',
    });
    setIsEditing(true);
    setCurrentId(rev.id);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.employeeId) {
      setModalError('Please choose an employee to review.');
      return;
    }
    if (!form.reviewPeriod.trim()) {
      setModalError('Review period is required.');
      return;
    }
    if (form.score < 0 || form.score > 100) {
      setModalError('Score must be between 0 and 100.');
      return;
    }

    try {
      setModalLoading(true);
      setModalError('');

      if (isEditing && currentId) {
        await api.updatePerformanceReview(currentId, {
          score: Number(form.score),
          reviewPeriod: form.reviewPeriod.trim(),
          strengths: form.strengths.trim() || undefined,
          improvements: form.improvements.trim() || undefined,
          notes: form.notes.trim() || undefined,
        });
      } else {
        await api.createPerformanceReview({
          employeeId: form.employeeId,
          score: Number(form.score),
          reviewPeriod: form.reviewPeriod.trim(),
          strengths: form.strengths.trim() || undefined,
          improvements: form.improvements.trim() || undefined,
          notes: form.notes.trim() || undefined,
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save review');
    } finally {
      setModalLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      setAckLoading(id);
      await api.acknowledgePerformanceReview(id);
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 'ACKNOWLEDGED' as ReviewStatus } : r
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to sign review');
    } finally {
      setAckLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this appraisal?')) return;
    try {
      await api.deletePerformanceReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete appraisal');
    }
  };

  const handleExportCSV = () => {
    const rows = filteredReviews.map((r) => ({
      id: r.id,
      employee: r.employee?.name || 'Unknown',
      period: r.reviewPeriod,
      score: r.score,
      status: r.status,
      reviewer: r.reviewer?.name || 'Manager',
      createdAt: new Date(r.createdAt).toLocaleDateString(),
    }));

    exportToCsv('Performance_Appraisals_' + new Date().toISOString().split('T')[0], rows, [
      { key: 'employee', label: 'Employee Name' },
      { key: 'period', label: 'Review Period' },
      { key: 'score', label: 'Score (100)' },
      { key: 'status', label: 'Status' },
      { key: 'reviewer', label: 'Evaluated By' },
      { key: 'createdAt', label: 'Evaluation Date' },
    ]);
  };

  const filteredReviews = reviews.filter((r) => {
    const empName = r.employee?.name || '';
    const empEmail = r.employee?.email || '';
    const notes = r.notes || '';
    const query = search.toLowerCase();
    return (
      empName.toLowerCase().includes(query) ||
      empEmail.toLowerCase().includes(query) ||
      notes.toLowerCase().includes(query) ||
      r.reviewPeriod.toLowerCase().includes(query)
    );
  });

  const totalReviews = filteredReviews.length;
  const avgScore =
    totalReviews > 0
      ? Math.round(filteredReviews.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalReviews)
      : 0;
  const acknowledgedCount = filteredReviews.filter((r) => r.status === 'ACKNOWLEDGED').length;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-black bg-gold-200 border-gold-400 font-extrabold';
    if (score >= 75) return 'text-black bg-gold-100 border-gold-300 font-bold';
    if (score >= 60) return 'text-black/90 bg-gold-50 border-gold-200 font-semibold';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-heading text-heading flex items-center gap-2.5">
            <Award className="h-6 w-6 text-gold-600" />
            Performance Appraisals & Reviews
          </h1>
          <p className="muted mt-1">
            Conduct 360 studio appraisals, measure design KPIs, give structured feedback, and track acknowledgments.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-gold-50 text-heading text-sm font-semibold rounded-lg border border-gold-300 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-gold-700" />
            Export CSV
          </button>
          {isAdminOrManager && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-primary btn-hover-lift inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Conduct Review
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card p-4 rounded-xl border border-gold-200 shadow-xs flex items-center gap-3 card-hover-lift">
          <div className="p-2.5 bg-gold-100 text-gold-800 rounded-lg shrink-0 border border-gold-300">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gold-700">Total Reviews Conducted</div>
            <div className="text-xl font-extrabold text-heading">{totalReviews}</div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-gold-200 shadow-xs flex items-center gap-3 card-hover-lift">
          <div className="p-2.5 bg-gold-200 text-black rounded-lg shrink-0 border border-gold-300">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gold-700">Team Average Score</div>
            <div className="text-xl font-extrabold text-black">{avgScore} / 100</div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-xl border border-gold-200 shadow-xs flex items-center gap-3 card-hover-lift">
          <div className="p-2.5 bg-gold-100 text-gold-800 rounded-lg shrink-0 border border-gold-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gold-700">Employee Acknowledged</div>
            <div className="text-xl font-extrabold text-black">{acknowledgedCount}</div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-card p-4 rounded-xl border border-gold-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gold-700" />
          <input
            type="text"
            placeholder="Search employee, period, or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-gold-500"
          />
        </div>

        {isAdminOrManager && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <UserIcon className="h-4 w-4 text-gold-700" />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="text-xs font-medium py-2 px-3 bg-gold-50/40 border border-gold-300 rounded-lg focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-gold-500 text-heading cursor-pointer"
            >
              <option value="ALL">All Team Members</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Reviews Cards */}
      {loading ? (
        <div className="p-12 text-center text-gold-700 bg-card rounded-xl border border-gold-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gold-500 border-t-transparent mb-3" />
          <p className="text-sm font-medium">Loading appraisals...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-12 text-center text-gold-700 bg-card rounded-xl border border-gold-200">
          <Award className="h-10 w-10 text-gold-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-heading">No performance appraisals found</h3>
          <p className="text-xs text-gold-700 mt-1 max-w-sm mx-auto">
            {search
              ? 'No evaluations match your search query.'
              : 'Quarterly or annual performance evaluations will appear here.'}
          </p>
          {isAdminOrManager && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-primary btn-hover-lift mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Conduct First Review
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredReviews.map((rev) => {
            const isEmployeeSelf = user?.id === rev.employeeId;
            const canAck = isEmployeeSelf && rev.status !== 'ACKNOWLEDGED';

            return (
              <div
                key={rev.id}
                className="bg-card rounded-xl border border-gold-200 p-5 shadow-xs hover:border-gold-400 card-hover-lift transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top line with Period & Score */}
                  <div className="flex items-center justify-between gap-3 border-b border-gold-100 pb-3">
                    <div>
                      <div className="text-xs font-bold text-gold-700 uppercase tracking-wider">
                        {rev.reviewPeriod}
                      </div>
                      <h3 className="text-base font-bold text-heading mt-0.5">
                        {rev.employee?.name || 'Employee'}
                      </h3>
                      <div className="text-xs text-gold-700">{rev.employee?.email}</div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div
                        className={`text-xl font-extrabold px-3 py-1 rounded-xl border ${getScoreColor(
                          rev.score
                        )}`}
                      >
                        {rev.score} / 100
                      </div>
                      <span className="text-[10px] font-semibold text-gold-800 mt-1">
                        {rev.score >= 90
                          ? 'Exceptional'
                          : rev.score >= 75
                          ? 'Meets Expectations'
                          : 'Needs Attention'}
                      </span>
                    </div>
                  </div>

                  {/* Strengths & Improvements */}
                  {rev.strengths && (
                    <div className="p-3 bg-gold-50/70 rounded-lg border border-gold-200 text-xs">
                      <div className="font-bold text-heading flex items-center gap-1.5 mb-1">
                        <ThumbsUp className="h-3.5 w-3.5 text-gold-700" /> Key Strengths
                      </div>
                      <p className="text-gold-900 leading-relaxed">{rev.strengths}</p>
                    </div>
                  )}

                  {rev.improvements && (
                    <div className="p-3 bg-gold-100/60 rounded-lg border border-gold-300 text-xs">
                      <div className="font-bold text-heading flex items-center gap-1.5 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-gold-700" /> Areas for Growth & Development
                      </div>
                      <p className="text-gold-900 leading-relaxed">{rev.improvements}</p>
                    </div>
                  )}

                  {rev.notes && (
                    <div className="text-xs text-gold-900 bg-white p-3 rounded-lg border border-gold-200 italic leading-relaxed">
                      "{rev.notes}"
                    </div>
                  )}
                </div>

                {/* Footer status & actions */}
                <div className="pt-3 border-t border-gold-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    {rev.status === 'ACKNOWLEDGED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-black bg-gold-200 px-2.5 py-0.5 rounded-full border border-gold-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-gold-800" /> Acknowledged by Employee
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gold-900 bg-gold-50 px-2.5 py-0.5 rounded-full border border-gold-300">
                        <Clock className="h-3.5 w-3.5 text-gold-700" /> Awaiting Acknowledgment
                      </span>
                    )}
                    <span className="text-gold-700">
                      Evaluated by {rev.reviewer?.name || 'Manager'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {canAck && (
                      <button
                        type="button"
                        disabled={ackLoading === rev.id}
                        onClick={() => handleAcknowledge(rev.id)}
                        className="btn-primary btn-hover-lift inline-flex items-center gap-1 px-3 py-1.5 font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {ackLoading === rev.id ? 'Signing...' : 'Acknowledge Review'}
                      </button>
                    )}

                    {isAdminOrManager && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(rev)}
                          className="p-1.5 text-black/60 hover:text-black hover:bg-gold-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Review"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(rev.id)}
                          className="p-1.5 text-black/40 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Review"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Conduct/Edit Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gold-300 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <h2 className="text-lg font-bold text-heading flex items-center gap-2">
                <Award className="h-5 w-5 text-gold-600" />
                {isEditing ? 'Edit Performance Appraisal' : 'Conduct Performance Appraisal'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-black/50 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label block mb-1">
                  Employee *
                </label>
                <select
                  disabled={isEditing}
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden disabled:opacity-60 cursor-pointer"
                >
                  <option value="" disabled>
                    Select Employee
                  </option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role?.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label block mb-1">
                    Review Period *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q1 2026, Annual 2025"
                    value={form.reviewPeriod}
                    onChange={(e) => setForm({ ...form, reviewPeriod: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="form-label block mb-1">
                    Overall Score (0 - 100) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={form.score}
                    onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="form-label block mb-1">
                  Key Strengths & High-Impact Contributions
                </label>
                <textarea
                  rows={2}
                  placeholder="Detail consistent high standards, project leadership, technical excellence..."
                  value={form.strengths}
                  onChange={(e) => setForm({ ...form, strengths: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="form-label block mb-1">
                  Areas of Improvement & Development Goals
                </label>
                <textarea
                  rows={2}
                  placeholder="Specific processes, communication habits, or architectural areas to sharpen..."
                  value={form.improvements}
                  onChange={(e) => setForm({ ...form, improvements: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="form-label block mb-1">
                  General Summary & Reviewer Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Additional context or career advancement remarks..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-heading bg-white hover:bg-gold-50 border border-gold-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="btn-primary btn-hover-lift px-4 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {modalLoading ? 'Saving...' : isEditing ? 'Update Appraisal' : 'Publish Appraisal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
