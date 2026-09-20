import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Milestone, Project, MilestoneStatus } from '../types';
import {
  Flag,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  Edit2,
  Trash2,
  TrendingUp,
  X,
  User as UserIcon,
} from 'lucide-react';

interface MilestonesPageProps {
  onNavigate?: (path: string) => void;
}

export const MilestonesPage: React.FC<MilestonesPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const canManage = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const canUpdateProgress = role !== 'CLIENT' && role !== 'CLIENT_ADMIN';

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectId: '',
    dueDate: '',
    status: 'PENDING' as MilestoneStatus,
    progress: 0,
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [milestonesRes, projectsRes] = await Promise.all([
        api.getMilestones({
          projectId: selectedProject,
          status: selectedStatus,
          search: search || undefined,
        }),
        api.getProjects(),
      ]);
      setMilestones(milestonesRes);
      setProjects(projectsRes);
    } catch (err) {
      console.error('Error loading milestones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedProject, selectedStatus, search]);

  const handleOpenCreate = () => {
    setEditingMilestone(null);
    setFormData({
      name: '',
      description: '',
      projectId: projects[0]?.id || '',
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: 'PENDING',
      progress: 0,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: Milestone) => {
    setEditingMilestone(m);
    setFormData({
      name: m.name,
      description: m.description || '',
      projectId: m.projectId,
      dueDate: m.dueDate ? m.dueDate.split('T')[0] : '',
      status: m.status,
      progress: m.progress || 0,
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Please enter a milestone title');
      return;
    }
    if (!formData.projectId) {
      setModalError('Please select an associated project');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError('');

      if (editingMilestone) {
        await api.updateMilestone(editingMilestone.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          projectId: formData.projectId,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
          status: formData.status,
          progress: Number(formData.progress),
        });
      } else {
        await api.createMilestone({
          name: formData.name.trim(),
          description: formData.description.trim(),
          projectId: formData.projectId,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
          status: formData.status,
          progress: Number(formData.progress),
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save milestone');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete milestone "${name}"?`)) return;
    try {
      await api.deleteMilestone(id);
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete milestone');
    }
  };

  const handleQuickStatusChange = async (m: Milestone, newStatus: MilestoneStatus) => {
    try {
      const newProgress = newStatus === 'COMPLETED' ? 100 : m.progress;
      await api.updateMilestone(m.id, {
        status: newStatus,
        progress: newProgress,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  // Stats calculation
  const totalCount = milestones.length;
  const completedCount = milestones.filter((m) => m.status === 'COMPLETED').length;
  const inProgressCount = milestones.filter((m) => m.status === 'IN_PROGRESS').length;
  const delayedCount = milestones.filter((m) => {
    if (m.status === 'COMPLETED') return false;
    if (m.status === 'OVERDUE') return true;
    if (m.dueDate && new Date(m.dueDate).getTime() < Date.now()) return true;
    return false;
  }).length;

  const getStatusBadge = (status: MilestoneStatus, dueDate?: string | null) => {
    const isOverdue = dueDate && new Date(dueDate).getTime() < Date.now() && status !== 'COMPLETED';

    if (isOverdue || status === 'OVERDUE') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="h-3 w-3" /> Overdue
        </span>
      );
    }

    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gold-200 text-black border border-gold-400">
            <CheckCircle2 className="h-3 w-3 text-gold-800" /> Completed
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-gold-100 text-black border border-gold-300">
            <TrendingUp className="h-3 w-3 text-gold-700" /> In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-white text-black/70 border border-gold-300">
            <Clock className="h-3 w-3 text-gold-600" /> Pending
          </span>
        );
    }
  };

  const renderMilestoneCard = (m: Milestone, roleLabel: string, roleColor: string) => {
    const project = m.project || projects.find((p) => p.id === m.projectId);
    const progress = m.progress || (m.status === 'COMPLETED' ? 100 : 0);
    const handlerName = project?.createdBy?.name || user?.name || 'Studio Lead';

    return (
      <div
        key={m.id}
        className="bg-white rounded-xl border border-[#EDE7DD] p-3.5 shadow-2xs hover:border-[#BA954F] transition-all flex flex-col justify-between gap-2.5"
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              {project && (
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate(`/projects/${project.id}`)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#443B30] bg-[#FAF4EC] hover:bg-[#F2E8D8] px-1.5 py-0.5 rounded border border-[#EDE3D4] transition-colors cursor-pointer truncate max-w-full"
                >
                  <FolderKanban className="h-3 w-3 text-[#BA954F] shrink-0" />
                  <span className="truncate">{project.name}</span>
                </button>
              )}
              <h4 className="text-xs sm:text-sm font-bold text-[#1C1917] leading-tight pt-0.5 line-clamp-2">
                {m.name}
              </h4>
            </div>

            {canManage && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(m)}
                  className="p-1 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-md transition-colors cursor-pointer"
                  title="Edit Milestone"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id, m.name)}
                  className="p-1 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FDF2F0] rounded-md transition-colors cursor-pointer"
                  title="Delete Milestone"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {m.description && (
            <p className="text-[11px] text-[#78716C] line-clamp-2 leading-relaxed mt-1.5 font-normal">
              {m.description}
            </p>
          )}
        </div>

        {/* Handler & Target */}
        <div className="pt-2 border-t border-[#F5EFE6] space-y-2">
          <div className={`text-[11px] font-semibold flex items-center gap-1.5 ${roleColor}`}>
            <UserIcon className="h-3.5 w-3.5 shrink-0 text-[#BA954F]" />
            <span className="truncate">{roleLabel}: <span className="font-bold text-[#1C1917]">{handlerName}</span></span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#78716C]">
            <div className="flex items-center gap-1 font-medium">
              <Calendar className="h-3 w-3 text-[#BA954F]" />
              <span>{m.dueDate ? new Date(m.dueDate).toLocaleDateString() : 'No date'}</span>
            </div>
            <span className="font-bold text-[#1C1917] font-mono">{progress}%</span>
          </div>

          <div className="w-full bg-[#FAF7F2] h-1.5 rounded-full overflow-hidden border border-[#EDE7DD]">
            <div
              className={`h-full rounded-full transition-all ${
                m.status === 'COMPLETED'
                  ? 'bg-[#2D6A4F]'
                  : m.status === 'OVERDUE'
                  ? 'bg-[#B91C1C]'
                  : 'bg-[#BA954F]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="pt-1 flex items-center justify-between gap-2">
            {canUpdateProgress && (
              <select
                value={m.status}
                onChange={(e) => handleQuickStatusChange(m, e.target.value as MilestoneStatus)}
                className="text-[10px] font-semibold py-1 px-2 border border-[#EDE7DD] rounded-lg bg-[#FAF7F2] hover:bg-white text-[#1C1917] cursor-pointer w-full focus:ring-1 focus:ring-[#BA954F]"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="DELAYED">Delayed</option>
              </select>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-heading text-heading flex items-center gap-2.5">
            <Flag className="h-6 w-6 text-gold-600" />
            Group Milestones
          </h1>
          <p className="muted mt-1">
            Track key studio checkpoints, client sign-offs, and drawing package deliverables
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-primary btn-hover-lift inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            New Milestone
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-card p-4 rounded-xl border border-gold-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gold-700" />
          <input
            type="text"
            placeholder="Search milestones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Project Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gold-700" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="text-xs font-medium py-2 px-3 bg-gold-50/40 border border-gold-300 rounded-lg focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-gold-500 text-heading cursor-pointer"
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
            className="text-xs font-medium py-2 px-3 bg-gold-50/40 border border-gold-300 rounded-lg focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-gold-500 text-heading cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* 4 Vertical Columns Board */}
      {loading ? (
        <div className="p-12 text-center text-[#78716C] bg-white rounded-2xl border border-[#EDE7DD]">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#BA954F] border-t-transparent mb-3" />
            <p className="text-sm font-medium">Loading milestones...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {/* Column 1: Total Milestones */}
            <div className="bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD] p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#EDE7DD]">
                <div className="flex items-center gap-2 font-bold text-xs text-[#1C1917]">
                  <div className="p-1.5 rounded-lg bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
                    <Flag className="h-3.5 w-3.5 stroke-[2]" />
                  </div>
                  <span>Total Milestones</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#BA954F] border border-[#EDE7DD] shadow-2xs">
                  {milestones.length}
                </span>
              </div>
              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {milestones.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#78716C]">No milestones</div>
                ) : (
                  milestones.map((m) => renderMilestoneCard(m, 'Handled by', 'text-[#78716C]'))
                )}
              </div>
            </div>

            {/* Column 2: Completed */}
            <div className="bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD] p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#EDE7DD]">
                <div className="flex items-center gap-2 font-bold text-xs text-[#1C1917]">
                  <div className="p-1.5 rounded-lg bg-[#F0FDF4] text-[#16A34A] border border-[#DCFCE7]">
                    <CheckCircle2 className="h-3.5 w-3.5 stroke-[2]" />
                  </div>
                  <span>Completed</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#16A34A] border border-[#EDE7DD] shadow-2xs">
                  {milestones.filter((m) => m.status === 'COMPLETED').length}
                </span>
              </div>
              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {milestones.filter((m) => m.status === 'COMPLETED').length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#78716C]">No completed milestones</div>
                ) : (
                  milestones
                    .filter((m) => m.status === 'COMPLETED')
                    .map((m) => renderMilestoneCard(m, 'Completed by', 'text-[#2D6A4F]'))
                )}
              </div>
            </div>

            {/* Column 3: In Progress */}
            <div className="bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD] p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#EDE7DD]">
                <div className="flex items-center gap-2 font-bold text-xs text-[#1C1917]">
                  <div className="p-1.5 rounded-lg bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
                    <TrendingUp className="h-3.5 w-3.5 stroke-[2]" />
                  </div>
                  <span>In Progress</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#BA954F] border border-[#EDE7DD] shadow-2xs">
                  {milestones.filter((m) => m.status === 'IN_PROGRESS').length}
                </span>
              </div>
              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {milestones.filter((m) => m.status === 'IN_PROGRESS').length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#78716C]">No milestones in progress</div>
                ) : (
                  milestones
                    .filter((m) => m.status === 'IN_PROGRESS')
                    .map((m) => renderMilestoneCard(m, 'Working on it', 'text-[#BA954F]'))
                )}
              </div>
            </div>

            {/* Column 4: Overdue / Delayed */}
            <div className="bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD] p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#EDE7DD]">
                <div className="flex items-center gap-2 font-bold text-xs text-[#1C1917]">
                  <div className="p-1.5 rounded-lg bg-[#FDF2F0] text-[#B91C1C] border border-[#F5D5D0]">
                    <AlertTriangle className="h-3.5 w-3.5 stroke-[2]" />
                  </div>
                  <span>Overdue / Delayed</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-[#B91C1C] border border-[#EDE7DD] shadow-2xs">
                  {
                    milestones.filter(
                      (m) =>
                        m.status === 'OVERDUE' ||
                        (m.dueDate && new Date(m.dueDate).getTime() < Date.now() && m.status !== 'COMPLETED')
                    ).length
                  }
                </span>
              </div>
              <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                {milestones.filter(
                  (m) =>
                    m.status === 'OVERDUE' ||
                    (m.dueDate && new Date(m.dueDate).getTime() < Date.now() && m.status !== 'COMPLETED')
                ).length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#78716C]">No overdue milestones</div>
                ) : (
                  milestones
                    .filter(
                      (m) =>
                        m.status === 'OVERDUE' ||
                        (m.dueDate && new Date(m.dueDate).getTime() < Date.now() && m.status !== 'COMPLETED')
                    )
                    .map((m) => renderMilestoneCard(m, 'Responsible', 'text-[#B91C1C]'))
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Create / Edit Milestone Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gold-300 space-y-4">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <h2 className="text-lg font-bold text-heading flex items-center gap-2">
                <Flag className="h-5 w-5 text-gold-600" />
                {editingMilestone ? 'Edit Milestone' : 'Create New Milestone'}
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

            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div>
                <label className="form-label block mb-1">
                  Milestone Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Schematic Design Package Clearance, Client Sign-off Phase 2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="form-label block mb-1">
                  Associated Project *
                </label>
                <select
                  required
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden cursor-pointer"
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
                <label className="form-label block mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of architectural deliverables, criteria, and scope..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label block mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="form-label block mb-1">
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as MilestoneStatus })
                    }
                    className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden cursor-pointer"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="DELAYED">Delayed</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label">
                    Completion Progress ({formData.progress}%)
                  </label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
                  className="w-full accent-gold-500"
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
                  disabled={modalSubmitting}
                  className="btn-primary btn-hover-lift px-4 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {modalSubmitting ? 'Saving...' : editingMilestone ? 'Update Milestone' : 'Create Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
