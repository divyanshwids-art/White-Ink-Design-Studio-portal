import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ClientApproval, Project, ApprovalStatus, Task } from '../types';
import { RequestChangesModal } from '../components/tasks/RequestChangesModal';
import { ClientTaskDetailModal } from '../components/tasks/ClientTaskDetailModal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  FileCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  FolderKanban,
  User,
  MessageSquare,
  Trash2,
  Calendar,
  X,
} from 'lucide-react';

interface ApprovalsPageProps {
  onNavigate?: (path: string) => void;
}

export const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const isClient = role === 'CLIENT' || role === 'CLIENT_ADMIN';
  const isSuperAdminOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const canRequestApproval = !isClient;
  const canDelete = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const [approvals, setApprovals] = useState<ClientApproval[]>([]);
  const [taskApprovals, setTaskApprovals] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Submit Approval Modal
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    title: '',
    description: '',
    projectId: '',
    deliverableUrl: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Review / Decision Modal (For Client or Admin)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<ClientApproval | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewComments, setReviewComments] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [taskActionLoading, setTaskActionLoading] = useState<string | null>(null);
  const [requestChangesTask, setRequestChangesTask] = useState<Task | null>(null);
  const [clientViewTask, setClientViewTask] = useState<Task | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [approvalsRes, projectsRes, tasksRes] = await Promise.all([
        api.getApprovals({
          projectId: selectedProject,
          status: selectedStatus,
          search: search || undefined,
        }),
        api.getProjects(),
        isClient
          ? api.getTasks({ projectId: selectedProject, search: search || undefined })
          : Promise.resolve([] as Task[]),
      ]);
      setApprovals(approvalsRes);
      setProjects(projectsRes);
      setTaskApprovals(
        tasksRes.filter(
          (task) =>
            Boolean(task.submittedAt) &&
            ['REVIEW', 'REVISION_REQUESTED', 'COMPLETED'].includes(task.status)
        )
      );
    } catch (err) {
      console.error('Error loading approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProject, selectedStatus, search]);

  const handleOpenSubmit = () => {
    setSubmitForm({
      title: '',
      description: '',
      projectId: projects[0]?.id || '',
      deliverableUrl: '',
    });
    setSubmitError('');
    setIsSubmitModalOpen(true);
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitForm.title.trim()) {
      setSubmitError('Deliverable title is required');
      return;
    }
    if (!submitForm.projectId) {
      setSubmitError('Please choose an associated project');
      return;
    }

    try {
      setSubmitLoading(true);
      setSubmitError('');

      await api.createApproval({
        title: submitForm.title.trim(),
        description: submitForm.description.trim() || undefined,
        projectId: submitForm.projectId,
        deliverableUrl: submitForm.deliverableUrl.trim() || undefined,
      });

      setIsSubmitModalOpen(false);
      loadData();
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit deliverable');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleOpenReview = (item: ClientApproval, decision: 'APPROVED' | 'REJECTED') => {
    setReviewItem(item);
    setReviewDecision(decision);
    setReviewComments(item.comments || '');
    setReviewError('');
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem) return;

    try {
      setReviewLoading(true);
      setReviewError('');

      await api.updateApproval(reviewItem.id, {
        status: reviewDecision,
        comments: reviewComments.trim() || undefined,
      });

      setReviewModalOpen(false);
      loadData();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove approval request "${title}"?`)) return;
    try {
      await api.deleteApproval(id);
      setApprovals((prev) => prev.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete approval');
    }
  };

  const handleApproveTask = async (task: Task) => {
    if (
      task.progress !== 100 ||
      !task.submittedAt ||
      !task.submissionDescription?.trim() ||
      !task.proofDetails?.trim()
    ) {
      alert(
        'Task must reach 100% completion with submission description and proof details before approval.'
      );
      return;
    }
    if (!window.confirm(`Approve task "${task.title}"?`)) return;
    try {
      setTaskActionLoading(task.id);
      await api.approveTask(task.id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve task');
    } finally {
      setTaskActionLoading(null);
    }
  };

  const taskStatus = (task: Task): ApprovalStatus => {
    if (task.clientApprovalStatus === 'APPROVED') return 'APPROVED';
    if (task.status === 'REVISION_REQUESTED') return 'REJECTED';
    return 'PENDING';
  };

  const filteredTaskApprovals = taskApprovals.filter((task) => {
    const statusMatches = selectedStatus === 'ALL' || taskStatus(task) === selectedStatus;
    const searchValue = search.toLowerCase();
    const searchMatches =
      !searchValue ||
      task.title.toLowerCase().includes(searchValue) ||
      (task.description || '').toLowerCase().includes(searchValue);
    return statusMatches && searchMatches;
  });

  const taskApprovalsByProject = filteredTaskApprovals.reduce<Record<string, Task[]>>(
    (groups, task) => {
      (groups[task.projectId] ||= []).push(task);
      return groups;
    },
    {}
  );

  // KPIs
  const totalCount = approvals.length + filteredTaskApprovals.length;
  const pendingCount =
    approvals.filter((a) => a.status === 'PENDING').length +
    filteredTaskApprovals.filter((t) => taskStatus(t) === 'PENDING').length;
  const approvedCount =
    approvals.filter((a) => a.status === 'APPROVED').length +
    filteredTaskApprovals.filter((t) => taskStatus(t) === 'APPROVED').length;
  const rejectedCount =
    approvals.filter((a) => a.status === 'REJECTED').length +
    filteredTaskApprovals.filter((t) => taskStatus(t) === 'REJECTED').length;
  const hasApprovalItems = approvals.length > 0 || filteredTaskApprovals.length > 0;

  const getStatusPill = (status: ApprovalStatus) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD]">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#2D6A4F]" /> Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FDF2F0] text-[#B91C1C] border border-[#F5D5D0]">
            <XCircle className="h-3.5 w-3.5" /> Needs Revisions
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0]">
            <Clock className="h-3.5 w-3.5" /> Pending Review
          </span>
        );
    }
  };

  const renderFilterToolbar = () => (
    <div className="bg-white/95 backdrop-blur-xs p-3.5 sm:p-4 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="relative w-full md:w-80">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
        <input
          type="text"
          placeholder="Search deliverables..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] bg-white text-[#1C1917] placeholder-[#A8A29E]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
        {/* Project Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#8C7E72]" />
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-xs font-semibold py-2 px-3.5 bg-white border border-[#DFD5C6] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#BA954F] text-[#1C1917] shadow-2xs cursor-pointer"
          >
            <option value="ALL">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="text-xs font-semibold py-2 px-3.5 bg-white border border-[#DFD5C6] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#BA954F] text-[#1C1917] shadow-2xs cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending Review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Needs Revision</option>
        </select>
      </div>
    </div>
  );

  const renderKPISummary = () => (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex items-center gap-3.5 card-hover-lift">
        <div className="p-2.5 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl shrink-0 shadow-2xs">
          <FileCheck className="h-5 w-5 stroke-[1.75]" />
        </div>
        <div>
          <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
            Total Deliverables
          </div>
          <div className="text-2xl font-serif font-bold text-[#1C1917] mt-0.5">{totalCount}</div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex items-center gap-3.5 card-hover-lift">
        <div className="p-2.5 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl shrink-0 shadow-2xs">
          <Clock className="h-5 w-5 stroke-[1.75]" />
        </div>
        <div>
          <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
            Pending Review
          </div>
          <div className="text-2xl font-serif font-bold text-[#BA954F] mt-0.5">{pendingCount}</div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex items-center gap-3.5 card-hover-lift">
        <div className="p-2.5 bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD] rounded-xl shrink-0 shadow-2xs">
          <CheckCircle2 className="h-5 w-5 stroke-[1.75]" />
        </div>
        <div>
          <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
            Approved
          </div>
          <div className="text-2xl font-serif font-bold text-[#2D6A4F] mt-0.5">{approvedCount}</div>
        </div>
      </div>

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#EDE7DD] shadow-xs flex items-center gap-3.5 card-hover-lift">
        <div className="p-2.5 bg-[#FDF2F0] text-[#B91C1C] border border-[#F5D5D0] rounded-xl shrink-0 shadow-2xs">
          <XCircle className="h-5 w-5 stroke-[1.75]" />
        </div>
        <div>
          <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wider">
            Revisions
          </div>
          <div className="text-2xl font-serif font-bold text-[#B91C1C] mt-0.5">{rejectedCount}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1C1917] flex items-center gap-2.5">
            <FileCheck className="h-6 w-6 text-[#BA954F] stroke-[2]" />
            Deliverables & Approvals
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] font-normal mt-1">
            {isClient
              ? 'Review, provide feedback, and approve deliverables submitted for your projects'
              : 'Submit milestones, design drafts, and creative assets for sign-off'}
          </p>
        </div>

        {canRequestApproval && (
          <button
            type="button"
            onClick={handleOpenSubmit}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer btn-hover-lift"
          >
            <Plus className="h-4 w-4 stroke-[2]" />
            Submit Deliverable
          </button>
        )}
      </div>

      {/* For client: Filter Toolbar goes above the 4 KPI Summary cards */}
      {isClient ? (
        <>
          {renderFilterToolbar()}
          {renderKPISummary()}
        </>
      ) : (
        renderFilterToolbar()
      )}

      {/* Deliverables List */}
      {loading ? (
        <LoadingSpinner message="Loading approval requests..." />
      ) : !hasApprovalItems ? (
        <div className="p-12 text-center text-[#78716C] bg-white rounded-2xl border border-[#EDE7DD] shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF4EC] border border-[#EDE3D4] flex items-center justify-center text-[#BA954F] mx-auto mb-3 shadow-2xs">
            <FileCheck className="h-6 w-6 stroke-[1.75]" />
          </div>
          <h3 className="text-base font-serif font-bold text-[#1C1917]">No deliverables to display</h3>
          <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto font-normal">
            {search || selectedProject !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No approval requests match the selected filters.'
              : 'Deliverables requested for sign-off will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(Object.entries(taskApprovalsByProject) as [string, Task[]][]).map(
            ([projectId, tasks]) => {
              const project = projects.find((item) => item.id === projectId);

              return (
                <section key={projectId} className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <FolderKanban className="h-4 w-4 text-[#BA954F]" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#1C1917]">
                      {project?.name || 'Project'}
                    </h2>
                    <span className="text-[11px] font-mono text-[#78716C]">
                      ({tasks.length} {tasks.length === 1 ? 'task request' : 'task requests'})
                    </span>
                  </div>

                  {tasks.map((task) => {
                    const status = taskStatus(task);
                    const isPending = status === 'PENDING';

                    return (
                      <div
                        key={`task-${task.id}`}
                        onClick={() => isClient && setClientViewTask(task)}
                        className={`bg-white rounded-2xl border border-[#EDE7DD] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all ${
                          isClient
                            ? 'cursor-pointer hover:border-[#DFD5C6] hover:shadow-md'
                            : ''
                        }`}
                      >
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            {getStatusPill(status)}
                            <span className="text-[10px] font-semibold text-[#BA954F] bg-[#FAF4EC] px-2.5 py-0.5 rounded-full border border-[#EDE3D4]">
                              Task approval
                            </span>
                            {task.createdAt && (
                              <span className="text-xs text-[#A8A29E] flex items-center gap-1 font-mono">
                                <Calendar className="h-3 w-3" />
                                Updated{' '}
                                {new Date(task.updatedAt || task.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-[#1C1917] leading-snug">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-xs text-[#78716C] leading-relaxed max-w-2xl font-normal">
                              {task.description}
                            </p>
                          )}
                          {task.submissionDescription && (
                            <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#EDE7DD] text-xs mt-2 space-y-1">
                              <div className="font-semibold text-[#1C1917]">Completion details</div>
                              <p className="text-[#57534E] font-normal">{task.submissionDescription}</p>
                              <div className="font-semibold text-[#1C1917] pt-1">Proof</div>
                              <p className="text-[#57534E] font-normal">{task.proofDetails}</p>
                              {task.deliverableUrl && (
                                <a
                                  href={
                                    task.deliverableUrl.startsWith('http')
                                      ? task.deliverableUrl
                                      : `https://${task.deliverableUrl}`
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-[#BA954F] font-semibold pt-1 hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" /> View deliverable
                                </a>
                              )}
                            </div>
                          )}
                          {task.revisionRequest && (
                            <div className="p-3.5 bg-[#FDF2F0] rounded-xl border border-[#F5D5D0] text-xs mt-2">
                              <div className="font-semibold text-[#B91C1C] mb-1">
                                Revision request
                              </div>
                              <p className="text-[#7F1D1D] font-normal">{task.revisionRequest.feedback}</p>
                            </div>
                          )}
                        </div>

                        {isClient && (
                          <div
                            className="flex items-center gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#EDE7DD]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setClientViewTask(task)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#FAF7F2] text-[#443B30] border border-[#DFD5C6] text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-2xs"
                            >
                              Review Details
                            </button>
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveTask(task)}
                                  disabled={
                                    taskActionLoading === task.id ||
                                    !task.submittedAt ||
                                    !task.submissionDescription?.trim() ||
                                    !task.proofDetails?.trim() ||
                                    task.status !== 'REVIEW' ||
                                    task.clientApprovalStatus !== 'PENDING'
                                  }
                                  title={
                                    !task.submittedAt
                                      ? 'Task must be submitted before approval'
                                      : undefined
                                  }
                                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed btn-hover-lift"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  {taskActionLoading === task.id
                                    ? 'Approving...'
                                    : !task.submittedAt
                                    ? 'Not Submitted'
                                    : 'Approve'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRequestChangesTask(task)}
                                  disabled={taskActionLoading === task.id}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FDF2F0] hover:bg-[#FCE7E4] text-[#B91C1C] border border-[#F5D5D0] text-xs font-semibold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Request Changes
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </section>
              );
            }
          )}

          {approvals.length > 0 && (
            <div className="pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1C1917] px-1 mb-3">
                Deliverable requests
              </h2>
            </div>
          )}
          {approvals.map((item) => {
            const project = item.project || projects.find((p) => p.id === item.projectId);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#EDE7DD] p-5 shadow-xs hover:border-[#DFD5C6] transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 card-hover-lift"
              >
                {/* Left details */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getStatusPill(item.status)}
                    {project && (
                      <button
                        type="button"
                        onClick={() => onNavigate && onNavigate(`/projects/${project.id}`)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#BA954F] bg-[#FAF4EC] hover:bg-[#F5EFE6] px-2.5 py-0.5 rounded-full border border-[#EDE3D4] transition-colors"
                      >
                        <FolderKanban className="h-3 w-3 text-[#BA954F]" />
                        <span>{project.name}</span>
                      </button>
                    )}
                    <span className="text-xs text-[#A8A29E] flex items-center gap-1 font-mono">
                      <Calendar className="h-3 w-3" />
                      Submitted {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#1C1917] leading-snug">
                    {item.title}
                  </h3>

                  {item.description && (
                    <p className="text-xs text-[#78716C] leading-relaxed max-w-2xl font-normal">
                      {item.description}
                    </p>
                  )}

                  {/* Deliverable URL */}
                  {item.deliverableUrl && (
                    <div className="pt-1">
                      <a
                        href={
                          item.deliverableUrl.startsWith('http')
                            ? item.deliverableUrl
                            : `https://${item.deliverableUrl}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] bg-[#FAF4EC] hover:bg-[#F5EFE6] px-3 py-1.5 rounded-xl border border-[#EDE3D4] transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>View Deliverable Link / Asset</span>
                      </a>
                    </div>
                  )}

                  {/* Requester & Reviewer metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-[#78716C] pt-1 font-normal">
                    {item.requestedBy && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3 text-[#BA954F]" />
                        Submitted by{' '}
                        <span className="font-semibold text-[#1C1917]">{item.requestedBy.name}</span>
                      </span>
                    )}
                    {item.reviewedBy && (
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-[#2D6A4F]" />
                        Reviewed by{' '}
                        <span className="font-semibold text-[#1C1917]">{item.reviewedBy.name}</span>
                      </span>
                    )}
                  </div>

                  {/* Feedback comments box */}
                  {item.comments && (
                    <div className="p-3.5 bg-[#FAF7F2] rounded-xl border border-[#EDE7DD] text-xs mt-2">
                      <div className="font-semibold text-[#1C1917] flex items-center gap-1.5 mb-1">
                        <MessageSquare className="h-3.5 w-3.5 text-[#BA954F]" />
                        Review Feedback:
                      </div>
                      <p className="text-[#57534E] italic font-normal">"{item.comments}"</p>
                    </div>
                  )}
                </div>

                {/* Right action buttons */}
                <div className="flex items-center gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#EDE7DD]">
                  {/* Actions for Client or Admin on Pending Items */}
                  {item.status === 'PENDING' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReview(item, 'APPROVED')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer btn-hover-lift"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenReview(item, 'REJECTED')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#FDF2F0] hover:bg-[#FCE7E4] text-[#B91C1C] border border-[#F5D5D0] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Request Revisions
                      </button>
                    </div>
                  )}

                  {/* Admin Delete */}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-2 text-[#A8A29E] hover:text-[#B91C1C] hover:bg-[#FDF2F0] rounded-xl transition-colors"
                      title="Delete Deliverable Request"
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

      {/* Submit Deliverable Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EDE7DD] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE7DD] pb-3.5">
              <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-[#BA954F] stroke-[2]" />
                Submit Deliverable for Sign-Off
              </h2>
              <button
                type="button"
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-xl cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs font-medium rounded-xl">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmitDeliverable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Deliverable Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design System Figma v1, Staging Build Deployment"
                  value={submitForm.title}
                  onChange={(e) => setSubmitForm({ ...submitForm, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] focus:outline-none bg-white text-[#1C1917]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Project *
                </label>
                <select
                  required
                  value={submitForm.projectId}
                  onChange={(e) => setSubmitForm({ ...submitForm, projectId: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] focus:outline-none bg-white text-[#1C1917] cursor-pointer shadow-2xs"
                >
                  <option value="" disabled>
                    Select Project
                  </option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Deliverable URL / Preview Link
                </label>
                <input
                  type="url"
                  placeholder="https://figma.com/... or https://staging.app.com"
                  value={submitForm.deliverableUrl}
                  onChange={(e) =>
                    setSubmitForm({ ...submitForm, deliverableUrl: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] focus:outline-none bg-white text-[#1C1917]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Description & Context
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain what was accomplished and what specific points should be inspected..."
                  value={submitForm.description}
                  onChange={(e) =>
                    setSubmitForm({ ...submitForm, description: e.target.value })
                  }
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] focus:outline-none bg-white text-[#1C1917]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EDE7DD]">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs btn-hover-lift"
                >
                  {submitLoading ? 'Submitting...' : 'Send for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review / Decision Modal */}
      {reviewModalOpen && reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#EDE7DD] space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE7DD] pb-3.5">
              <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
                {reviewDecision === 'APPROVED' ? (
                  <CheckCircle2 className="h-5 w-5 text-[#2D6A4F]" />
                ) : (
                  <XCircle className="h-5 w-5 text-[#B91C1C]" />
                )}
                {reviewDecision === 'APPROVED'
                  ? 'Approve Deliverable'
                  : 'Request Deliverable Revisions'}
              </h2>
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-xl cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {reviewError && (
              <div className="p-3 bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs font-medium rounded-xl">
                {reviewError}
              </div>
            )}

            <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#EDE7DD]">
              <div className="text-xs text-[#78716C] font-medium">Deliverable</div>
              <div className="text-sm font-serif font-bold text-[#1C1917]">{reviewItem.title}</div>
              {reviewItem.deliverableUrl && (
                <a
                  href={
                    reviewItem.deliverableUrl.startsWith('http')
                      ? reviewItem.deliverableUrl
                      : `https://${reviewItem.deliverableUrl}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#BA954F] font-semibold inline-flex items-center gap-1 mt-1 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" /> Inspect Asset Link
                </a>
              )}
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                  Feedback & Comments {reviewDecision === 'REJECTED' && '*'}
                </label>
                <textarea
                  rows={3}
                  required={reviewDecision === 'REJECTED'}
                  placeholder={
                    reviewDecision === 'APPROVED'
                      ? 'Optional note (e.g., "Looks great, ready for production!")'
                      : 'Specify the required adjustments, visual feedback, or revision notes...'
                  }
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] focus:outline-none bg-white text-[#1C1917]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EDE7DD]">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewLoading}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs btn-hover-lift ${
                    reviewDecision === 'APPROVED'
                      ? 'bg-[#BA954F] hover:bg-[#A17B2F] text-white'
                      : 'bg-[#B91C1C] hover:bg-[#991B1B] text-white'
                  }`}
                >
                  {reviewLoading
                    ? 'Submitting...'
                    : reviewDecision === 'APPROVED'
                    ? 'Confirm Approval'
                    : 'Submit Revision Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {requestChangesTask && (
        <RequestChangesModal
          task={requestChangesTask}
          onClose={() => setRequestChangesTask(null)}
          onSubmitted={() => {
            setRequestChangesTask(null);
            loadData();
          }}
        />
      )}

      {clientViewTask && (
        <ClientTaskDetailModal
          task={clientViewTask}
          onClose={() => setClientViewTask(null)}
          onApproved={() => {
            setClientViewTask(null);
            loadData();
          }}
          onRequestChanges={(t) => {
            setClientViewTask(null);
            setRequestChangesTask(t);
          }}
        />
      )}
    </div>
  );
};
