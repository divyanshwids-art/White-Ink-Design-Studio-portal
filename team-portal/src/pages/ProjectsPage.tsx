import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Project, Client, User } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ProjectModal } from '../components/projects/ProjectModal';
import { ClientProjectRequestModal } from '../components/projects/ClientProjectRequestModal';
import {
  FolderKanban,
  Search,
  Plus,
  Building2,
  Calendar,
  Edit2,
  Trash2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  X,
} from 'lucide-react';

interface ProjectsPageProps {
  onNavigateToProject: (id: string) => void;
  openCreateModalDirectly?: boolean;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  onNavigateToProject,
  openCreateModalDirectly = false,
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(openCreateModalDirectly);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectsData, clientsData, usersData] = await Promise.all([
        api.getProjects({ search, status: statusFilter, priority: priorityFilter }),
        api.getClients(),
        canManage ? api.getUsers() : Promise.resolve([]),
      ]);
      setProjects(projectsData);
      setClients(clientsData);
      setTeamMembers(usersData.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN'));
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, priorityFilter, canManage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    setIsDeleting(true);
    try {
      await api.deleteProject(deletingProject.id);
      setDeletingProject(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Metrics counters
  const metrics = useMemo(() => {
    const total = projects.length;
    const active = projects.filter((p) => p.status === 'ACTIVE').length;
    const planning = projects.filter((p) => p.status === 'PLANNING' || p.status === 'PENDING').length;
    const completed = projects.filter((p) => p.status === 'COMPLETED').length;
    return { total, active, planning, completed };
  }, [projects]);

  const statusPills = [
    { label: 'All Projects', value: 'ALL' },
    { label: 'Active', value: 'ACTIVE' },
    { label: 'Planning', value: 'PLANNING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'On Hold', value: 'ON_HOLD' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-[#EDE7DD] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1917]">
              Projects
            </h1>

          </div>
          <p className="text-xs sm:text-sm text-[#78716C] font-normal mt-1">
            Manage creative deliverables, track milestone progress, and allocate team talent.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingProject(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer btn-hover-lift"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Create Project
            </button>
          )}

          {isClient && (
            <button
              type="button"
              onClick={() => setIsClientModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer btn-hover-lift"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Create New Project
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EDE7DD] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name..."
            className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E] hover:text-[#1C1917] p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Priority Filter */}
        <div className="w-full md:w-auto shrink-0">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full md:w-auto px-3.5 py-2 text-xs font-semibold bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <LoadingSpinner message="Fetching projects catalog..." />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects found"
          description="No projects match your current filters. Create a new project to start tracking deliverables."
          icon={FolderKanban}
          actionLabel={canManage ? 'Create Project' : isClient ? 'Create New Project' : undefined}
          onAction={() => {
            if (canManage) {
              setEditingProject(null);
              setIsModalOpen(true);
            } else if (isClient) {
              setIsClientModalOpen(true);
            }
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs hover:border-[#DFD5C6] transition-all flex flex-col justify-between overflow-hidden group card-hover-lift"
            >
              <div className="p-5 space-y-3.5">
                {/* Top badges & actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={project.status} size="sm" />
                    {!isClient && <PriorityBadge priority={project.priority} size="sm" />}
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingProject(project);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
                        title="Edit Project"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingProject(project);
                        }}
                        className="p-1.5 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FDF2F0] rounded-lg transition-colors cursor-pointer"
                        title="Delete Project"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Project Title & Client */}
                <div>
                  <h3
                    onClick={() => onNavigateToProject(project.id)}
                    className="text-base font-bold text-[#1C1917] group-hover:text-[#BA954F] transition-colors cursor-pointer line-clamp-1"
                  >
                    {project.name}
                  </h3>
                  <p className="text-xs text-[#78716C] flex items-center gap-1.5 mt-1 font-normal">
                    <Building2 className="h-3.5 w-3.5 text-[#BA954F] shrink-0" />
                    <span className="font-semibold text-[#1C1917] truncate">
                      {project.client?.company || project.client?.name || 'Client Org'}
                    </span>
                  </p>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-xs text-[#57534E] line-clamp-2 leading-relaxed font-normal">
                    {project.description}
                  </p>
                )}

                {/* Progress bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#78716C] font-medium">Calculated Progress</span>
                    <span className="font-bold text-[#BA954F]">{project.progress}%</span>
                  </div>
                  <ProgressBar progress={project.progress} size="md" showLabel={false} />
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3.5 bg-[#FAF7F2] border-t border-[#EDE7DD] flex items-center justify-between gap-3 text-xs">
                {/* Team avatar stack */}
                <div className="flex items-center -space-x-1.5 overflow-hidden">
                  {project.members && project.members.length > 0 ? (
                    project.members.slice(0, 4).map((member) => (
                      <img
                        key={member.id}
                        src={
                          member.profileImage ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            member.name
                          )}`
                        }
                        alt={member.name}
                        title={`${member.name} (${member.role})`}
                        className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover shadow-2xs"
                      />
                    ))
                  ) : (
                    <span className="text-[11px] text-[#A8A29E] font-normal">No members</span>
                  )}
                  {project.members && project.members.length > 4 && (
                    <span className="h-6 w-6 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0] font-bold text-[10px] flex items-center justify-center ring-2 ring-white">
                      +{project.members.length - 4}
                    </span>
                  )}
                </div>

                {/* Due Date & Open link */}
                <div className="flex items-center gap-3">
                  {project.dueDate && (
                    <span className="text-[#78716C] text-[11px] flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#BA954F]" />
                      {new Date(project.dueDate).toLocaleDateString()}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigateToProject(project.id)}
                    className="p-1 text-[#78716C] hover:text-[#BA954F] font-bold cursor-pointer"
                    title="View Project Details"
                  >
                    <ArrowRight className="h-4 w-4 stroke-[2]" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Project Modal (Admin / Team) */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        onSuccess={loadData}
        project={editingProject}
        clients={clients}
        teamMembers={teamMembers}
      />

      {/* Client Project Request Modal (CLIENT role) */}
      <ClientProjectRequestModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSuccess={loadData}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingProject)}
        onClose={() => setDeletingProject(null)}
        onConfirm={handleDeleteProject}
        title="Delete Project?"
        message={`Are you sure you want to delete "${deletingProject?.name}"? All associated tasks, member assignments, and comments will be permanently removed.`}
        confirmLabel="Delete Project"
        isLoading={isDeleting}
      />
    </div>
  );
};
