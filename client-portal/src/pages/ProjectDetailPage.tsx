import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Project, Task, Comment, User, Client, TaskStatus } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { ProgressBar } from '../components/common/ProgressBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { ProjectModal } from '../components/projects/ProjectModal';
import { TaskModal } from '../components/tasks/TaskModal';
import { ClientTaskDetailModal } from '../components/tasks/ClientTaskDetailModal';
import { RequestChangesModal } from '../components/tasks/RequestChangesModal';
import {
  ArrowLeft,
  Calendar,
  Building2,
  Users,
  CheckSquare,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  UserPlus,
  Send,
  Clock,
  UserMinus,
  Flag,
  FileCheck,
  ExternalLink,
  Sparkles,
  Video,
  FileSpreadsheet,
} from 'lucide-react';
import { FinalHandoverView } from '../components/projects/FinalHandoverView';
import { SubmitTaskModal } from '../components/tasks/SubmitTaskModal';
import { ImportTasksModal } from '../components/tasks/ImportTasksModal';
import { ProjectMeetingsView } from '../components/projects/ProjectMeetingsView';

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
  onNavigateToKanban?: () => void;
  onNavigate?: (path: string) => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectId,
  onBack,
  onNavigate,
}) => {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'tasks' | 'milestones' | 'approvals' | 'meetings' | 'team' | 'comments'
  >('tasks');
  const [viewMode, setViewMode] = useState<'handover' | 'workspace' | null>(null);

  const isFullyCompleted =
    project?.handoverEligibility?.eligible ?? project?.handoverEligible ?? false;

  useEffect(() => {
    if (project) {
      const isComplete =
        project.handoverEligibility?.eligible ?? project.handoverEligible ?? false;
      if (viewMode === null) {
        setViewMode(isComplete ? 'handover' : 'workspace');
      } else if (!isComplete && viewMode === 'handover') {
        setViewMode('workspace');
      }
    }
  }, [project, viewMode]);

  // Comment input
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);

  // Modals
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [clientViewTask, setClientViewTask] = useState<Task | null>(null);
  const [requestChangesTask, setRequestChangesTask] = useState<Task | null>(null);
  const [submitTask, setSubmitTask] = useState<Task | null>(null);

  // Add Member Modal
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedNewMemberId, setSelectedNewMemberId] = useState('');

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';

  const loadProjectDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projectData, commentsData, usersData, clientsData] = await Promise.all([
        api.getProjectById(projectId),
        api.getProjectComments(projectId),
        api.getUsers(),
        api.getClients(),
      ]);
      setProject(projectData);
      setComments(commentsData);
      setAllUsers(usersData);
      setClients(clientsData);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProjectDetails();
  }, [loadProjectDetails]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setIsPostingComment(true);
    try {
      const newComment = await api.addProjectComment(projectId, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await api.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleAddMember = async () => {
    if (!selectedNewMemberId) return;
    try {
      await api.addProjectMember(projectId, selectedNewMemberId);
      setIsAddMemberOpen(false);
      setSelectedNewMemberId('');
      await loadProjectDetails();
    } catch (err) {
      console.error('Failed to add member:', err);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Remove this team member from project?')) return;
    try {
      await api.removeProjectMember(projectId, userId);
      await loadProjectDetails();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleDeleteTask = async () => {
    if (!deletingTask) return;
    setIsDeletingTask(true);
    try {
      await api.deleteTask(deletingTask.id);
      setDeletingTask(null);
      await loadProjectDetails();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleQuickTaskStatus = async (taskId: string, status: TaskStatus) => {
    if (user?.role === 'TEAM_MEMBER' && (status === 'COMPLETED' || status === 'REVIEW')) {
      alert(
        'Team members cannot directly mark tasks as In Review or Completed. Please submit for client review at 100% progress.'
      );
      return;
    }
    try {
      await api.updateTaskStatus(taskId, status);
      await loadProjectDetails();
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  if (isLoading || !project) {
    return <LoadingSpinner message="Loading project workspace..." size="lg" />;
  }

  // Handover is available only after the server confirms every task is approved.
  const activeView = viewMode ?? (isFullyCompleted ? 'handover' : 'workspace');
  if (activeView === 'handover' && isFullyCompleted) {
    return (
      <FinalHandoverView
        project={project}
        currentUser={user}
        canManage={canManage}
        onBack={onBack}
        onSwitchToWorkspace={() => setViewMode('workspace')}
        onProjectUpdated={loadProjectDetails}
      />
    );
  }

  // Find users not yet members of this project
  const currentMemberIds = new Set(project.members?.map((m) => m.id) || []);
  const availableUsersToAdd = allUsers.filter(
    (u) => !currentMemberIds.has(u.id) && u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN'
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Top Breadcrumb & Nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 stroke-[2]" />
          Back to Projects
        </button>

        <div className="flex items-center gap-2.5">
          {isFullyCompleted && (
            <button
              type="button"
              onClick={() => setViewMode('handover')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#BA954F] bg-[#FAF4EC] hover:bg-[#F5EFE6] border border-[#EAE0D0] rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Final Handover View
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setIsTaskModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-colors cursor-pointer btn-hover-lift"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2]" />
            Add Task
          </button>
        </div>
      </div>

      {/* Completion Banner when viewing workspace */}
      {isFullyCompleted && (
        <div className="bg-[#FAF4EC] border border-[#EDE3D4] p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white border border-[#EDE3D4] flex items-center justify-center text-[#BA954F] shrink-0 shadow-2xs">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-serif font-bold text-[#1C1917]">
                100% Mandatory Tasks Complete
              </h4>
              <p className="text-[11px] text-[#78716C] font-normal">
                This project has reached final handover readiness. All deliverable requirements are signed off.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('handover')}
            className="px-4 py-2 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs shrink-0 cursor-pointer btn-hover-lift"
          >
            Switch to Handover View
          </button>
        </div>
      )}

      {/* Project Banner Card */}
      <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs p-6 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              {!isClient && <PriorityBadge priority={project.priority} />}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1C1917]">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#78716C] pt-1">
              <span className="flex items-center gap-1.5 font-semibold text-[#1C1917]">
                <Building2 className="h-4 w-4 text-[#BA954F]" />
                {project.client?.company || project.client?.name || 'Client Org'}
              </span>
              {project.startDate && (
                <span className="flex items-center gap-1.5 font-mono">
                  <Calendar className="h-4 w-4 text-[#BA954F]" />
                  Started {new Date(project.startDate).toLocaleDateString()}
                </span>
              )}
              {project.dueDate && (
                <span className="flex items-center gap-1.5 font-mono text-[#1C1917] font-semibold">
                  <Clock className="h-4 w-4 text-[#BA954F]" />
                  Due {new Date(project.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Progress Gauge */}
          <div className="w-full lg:w-72 bg-[#FAF7F2] p-4 rounded-xl border border-[#EDE7DD] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1C1917]">Deliverable Progress</span>
              <span className="font-bold font-mono text-[#BA954F] text-sm">{project.progress}%</span>
            </div>
            <ProgressBar progress={project.progress} size="md" showLabel={false} />
            <div className="flex justify-between text-[11px] text-[#78716C] font-normal pt-1">
              <span>
                {project.completedTaskCount || 0} of {project.taskCount || 0} tasks done
              </span>
              {!isClient && (
                <span className="font-mono">
                  {project.taskCount
                    ? Math.round(((project.completedTaskCount || 0) / project.taskCount) * 100)
                    : 0}
                  %
                </span>
              )}
            </div>
          </div>
        </div>

        {project.description && (
          <div className="pt-3 border-t border-[#EDE7DD]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8C7E72] mb-1">
              Scope & Objectives
            </h3>
            <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed whitespace-pre-line font-normal">
              {project.description}
            </p>
          </div>
        )}
      </div>

      {/* Tabs - White Ink Underline / Pill Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EDE7DD] pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tasks'
              ? 'border-[#BA954F] text-[#BA954F] bg-[#FAF4EC]/60 rounded-t-xl'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          Tasks ({project.tasks?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'milestones'
              ? 'border-[#BA954F] text-[#BA954F] bg-[#FAF4EC]/60 rounded-t-xl'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <Flag className="h-4 w-4" />
          Milestones ({project.milestones?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'approvals'
              ? 'border-[#BA954F] text-[#BA954F] bg-[#FAF4EC]/60 rounded-t-xl'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          Approvals ({project.approvals?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('meetings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'meetings'
              ? 'border-[#BA954F] text-[#BA954F] bg-[#FAF4EC]/60 rounded-t-xl'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <Video className="h-4 w-4" />
          Meetings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'team'
              ? 'border-[#BA954F] text-[#BA954F] bg-[#FAF4EC]/60 rounded-t-xl'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <Users className="h-4 w-4" />
          Team ({project.members?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'comments'
              ? 'border-[#BA954F] text-[#BA954F] bg-[#FAF4EC]/60 rounded-t-xl'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          Discussion ({comments.length})
        </button>
      </div>

      {/* Tab 1: Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#1C1917]">Project Deliverables & Tasks</h3>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl transition-colors cursor-pointer shadow-xs btn-hover-lift"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2]" />
                Add Task
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs divide-y divide-[#F5EFE6] overflow-hidden">
            {!project.tasks || project.tasks.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#78716C] font-normal space-y-3">
                <p>No tasks or deliverables created for this project yet.</p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-xs btn-hover-lift"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2]" />
                  Add First Task Requirement
                </button>
              </div>
            ) : (
              project.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => onNavigate ? onNavigate(`/tasks/${task.id}`) : setClientViewTask(task)}
                  className="p-4 sm:p-5 hover:bg-[#FAF7F2] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PriorityBadge priority={task.priority} size="sm" />
                      <span className="text-xs sm:text-sm font-bold text-[#1C1917]">{task.title}</span>
                      {task.status === 'REVISION_REQUESTED' && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FDF2F0] text-[#B91C1C] border border-[#F5D5D0]">
                          Revision Requested
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-[#78716C] line-clamp-1 font-normal">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-[#78716C] pt-0.5 font-normal">
                      {task.assignedTo ? (
                        <span className="flex items-center gap-1 font-semibold text-[#1C1917]">
                          <img
                            src={
                              task.assignedTo.profileImage ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                task.assignedTo.name
                              )}`
                            }
                            alt={task.assignedTo.name}
                            className="h-4 w-4 rounded-full ring-1 ring-[#DFD5C6]"
                          />
                          {task.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-[#A8A29E]">Unassigned</span>
                      )}
                      {task.dueDate && (
                        <span className="font-mono">Due {new Date(task.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {isClient ? (
                      <StatusBadge status={task.status} size="sm" />
                    ) : user?.role === 'TEAM_MEMBER' ? (
                      <div className="flex items-center gap-2">
                        {task.status !== 'REVIEW' &&
                          task.status !== 'COMPLETED' &&
                          task.assignedToId === user?.id && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubmitTask(task);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl cursor-pointer shadow-xs btn-hover-lift"
                            >
                              <Send className="h-3 w-3" />
                              Submit for Client Approval
                            </button>
                          )}

                        {task.status === 'REVIEW' && task.clientApprovalStatus === 'PENDING' && (
                          <span className="text-[11px] font-semibold text-[#946B2D] bg-[#FAF2E6] border border-[#E8DCC8] rounded-xl px-2.5 py-1.5 whitespace-nowrap">
                            Awaiting Client Approval
                          </span>
                        )}

                        {task.clientApprovalStatus === 'APPROVED' && (
                          <span className="text-[11px] font-semibold text-[#2D6A4F] bg-[#F0F7F2] border border-[#D1E7DD] rounded-xl px-2.5 py-1.5 whitespace-nowrap">
                            Client Approved
                          </span>
                        )}

                        <select
                          value={task.status}
                          onChange={(e) => handleQuickTaskStatus(task.id, e.target.value as TaskStatus)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={task.status === 'REVIEW' || task.status === 'COMPLETED'}
                          className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-[#DFD5C6] bg-white text-[#1C1917] cursor-pointer focus:ring-1 focus:ring-[#BA954F] disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          {task.status === 'REVIEW' && <option value="REVIEW" disabled>Review</option>}
                          {task.status === 'COMPLETED' && <option value="COMPLETED" disabled>Completed</option>}
                          {task.status === 'REVISION_REQUESTED' && (
                            <option value="REVISION_REQUESTED">Revision Requested</option>
                          )}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {task.status === 'REVIEW' && task.clientApprovalStatus === 'PENDING' && (
                          <span className="text-[11px] font-semibold text-[#946B2D] bg-[#FAF2E6] border border-[#E8DCC8] rounded-xl px-2.5 py-1.5 whitespace-nowrap">
                            Awaiting Client Approval
                          </span>
                        )}

                        {task.clientApprovalStatus === 'APPROVED' && (
                          <span className="text-[11px] font-semibold text-[#2D6A4F] bg-[#F0F7F2] border border-[#D1E7DD] rounded-xl px-2.5 py-1.5 whitespace-nowrap">
                            Client Approved
                          </span>
                        )}

                        <select
                          value={task.status}
                          onChange={(e) => handleQuickTaskStatus(task.id, e.target.value as TaskStatus)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-semibold py-1.5 px-2.5 rounded-xl border border-[#DFD5C6] bg-white text-[#1C1917] cursor-pointer focus:ring-1 focus:ring-[#BA954F] shadow-2xs"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="REVIEW">Review</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="REVISION_REQUESTED">Revision Requested</option>
                        </select>
                      </div>
                    )}

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTask(task);
                            setIsTaskModalOpen(true);
                          }}
                          className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTask(task);
                          }}
                          className="p-1.5 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FDF2F0] rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#1C1917]">Key Deliverable Milestones</h3>
            <span className="text-xs text-[#78716C] font-mono">
              {project.milestones?.filter((m) => m.status === 'COMPLETED').length || 0} of{' '}
              {project.milestones?.length || 0} achieved
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs divide-y divide-[#F5EFE6] overflow-hidden">
            {!project.milestones || project.milestones.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#78716C] font-normal">
                <Flag className="h-7 w-7 text-[#B58E4E] mx-auto mb-2" />
                No milestones recorded for this project.
              </div>
            ) : (
              project.milestones.map((m) => (
                <div key={m.id} className="p-4 sm:p-5 hover:bg-[#FAF7F2] transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#1C1917]">{m.name}</h4>
                      {m.description && (
                        <p className="text-xs text-[#78716C] mt-0.5 font-normal">{m.description}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        m.status === 'COMPLETED'
                          ? 'bg-[#F0F7F2] text-[#2D6A4F] border-[#D1E7DD]'
                          : m.status === 'DELAYED'
                          ? 'bg-[#FDF2F0] text-[#B91C1C] border-[#F5D5D0]'
                          : 'bg-[#FAF4EC] text-[#BA954F] border-[#EAE0D0]'
                      }`}
                    >
                      {m.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="w-48">
                      <ProgressBar progress={m.progress} size="sm" />
                    </div>
                    <span className="text-xs text-[#78716C] font-mono">
                      {m.dueDate ? `Target: ${new Date(m.dueDate).toLocaleDateString()}` : 'No target date'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Client Approvals */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#1C1917]">Client Sign-Off & Deliverables</h3>
            <span className="text-xs text-[#78716C] font-mono">
              {project.approvals?.filter((a) => a.status === 'APPROVED').length || 0} approved
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs divide-y divide-[#F5EFE6] overflow-hidden">
            {!project.approvals || project.approvals.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#78716C] font-normal">
                <FileCheck className="h-7 w-7 text-[#B58E4E] mx-auto mb-2" />
                No deliverable sign-offs requested for this project yet.
              </div>
            ) : (
              project.approvals.map((a) => (
                <div key={a.id} className="p-4 sm:p-5 hover:bg-[#FAF7F2] transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#1C1917]">{a.title}</h4>
                      {a.description && (
                        <p className="text-xs text-[#78716C] mt-0.5 font-normal">{a.description}</p>
                      )}
                      {a.deliverableUrl && (
                        <a
                          href={
                            a.deliverableUrl.startsWith('http')
                              ? a.deliverableUrl
                              : `https://${a.deliverableUrl}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#BA954F] font-semibold hover:underline mt-1"
                        >
                          <ExternalLink className="h-3 w-3" /> View Asset
                        </a>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        a.status === 'APPROVED'
                          ? 'bg-[#F0F7F2] text-[#2D6A4F] border-[#D1E7DD]'
                          : a.status === 'REJECTED'
                          ? 'bg-[#FDF2F0] text-[#B91C1C] border-[#F5D5D0]'
                          : 'bg-[#FAF4EC] text-[#BA954F] border-[#EAE0D0]'
                      }`}
                    >
                      {a.status === 'PENDING'
                        ? 'Pending Review'
                        : a.status === 'APPROVED'
                        ? 'Approved'
                        : 'Needs Revisions'}
                    </span>
                  </div>

                  {a.comments && (
                    <div className="p-3 bg-[#FAF7F2] rounded-xl text-xs text-[#57534E] italic border border-[#EDE7DD]">
                      Client feedback: "{a.comments}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab: Project Meetings */}
      {activeTab === 'meetings' && (
        <ProjectMeetingsView
          projectId={projectId}
          projectName={project.name}
          fallbackMeetingLink={project.meetingLink}
          canManage={canManage}
          isClient={isClient}
        />
      )}

      {/* Tab 2: Team Members */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-serif font-bold text-[#1C1917]">Project Staffing</h3>
            {canManage && (
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl transition-colors cursor-pointer shadow-xs btn-hover-lift"
              >
                <UserPlus className="h-3.5 w-3.5 stroke-[2]" />
                Assign Member
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {!project.members || project.members.length === 0 ? (
              <div className="col-span-full p-8 text-center text-xs text-[#78716C] bg-white rounded-2xl border border-[#EDE7DD]">
                No team members assigned yet.
              </div>
            ) : (
              project.members.map((member) => (
                <div
                  key={member.id}
                  className="bg-white p-4 rounded-2xl border border-[#EDE7DD] shadow-xs flex items-center justify-between gap-3 card-hover-lift"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        member.profileImage ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                          member.name
                        )}`
                      }
                      alt={member.name}
                      className="h-10 w-10 rounded-xl border border-[#DFD5C6] object-cover shadow-2xs"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-[#1C1917] truncate">{member.name}</h4>
                      <p className="text-xs text-[#78716C] truncate font-normal">{member.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
                        {member.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1.5 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FDF2F0] rounded-xl transition-colors cursor-pointer"
                      title="Remove from project"
                    >
                      <UserMinus className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Comments & Discussion */}
      {activeTab === 'comments' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-[#EDE7DD] shadow-xs space-y-4">
            <h3 className="text-sm font-serif font-bold text-[#1C1917]">Project Discussion Feed</h3>

            {/* Post Comment */}
            <form onSubmit={handleAddComment} className="flex gap-3 items-start">
              <img
                src={
                  user?.profileImage ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    user?.name || 'User'
                  )}`
                }
                alt={user?.name}
                className="h-9 w-9 rounded-xl border border-[#DFD5C6] object-cover shrink-0 shadow-2xs"
              />
              <div className="flex-1 space-y-2">
                <textarea
                  rows={2}
                  required
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share a milestone update, feedback, or creative note..."
                  className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F]"
                />
                <button
                  type="submit"
                  disabled={isPostingComment || !commentText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer btn-hover-lift"
                >
                  <Send className="h-3.5 w-3.5 stroke-[2]" />
                  {isPostingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3 pt-4 border-t border-[#EDE7DD]">
              {comments.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#78716C] font-normal">
                  No discussion comments yet. Start the conversation!
                </div>
              ) : (
                comments.map((comment) => {
                  const isAuthor = comment.userId === user?.id;
                  const canDelete = isAuthor || canManage;

                  return (
                    <div
                      key={comment.id}
                      className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE7DD] space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={
                              comment.user?.profileImage ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                comment.user?.name || 'User'
                              )}`
                            }
                            alt={comment.user?.name}
                            className="h-7 w-7 rounded-lg border border-[#DFD5C6] object-cover shadow-2xs"
                          />
                          <div>
                            <span className="text-xs font-bold text-[#1C1917]">
                              {comment.user?.name}
                            </span>
                            {comment.user?.role && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[#FAF4EC] text-[#BA954F] font-semibold border border-[#EDE3D4]">
                                {comment.user.role}
                              </span>
                            )}
                            <span className="ml-2 text-[11px] text-[#A8A29E] font-mono">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-[#78716C] hover:text-[#B91C1C] p-1 rounded transition-colors cursor-pointer"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-[#57534E] pl-9 whitespace-pre-line leading-relaxed font-normal">
                        {comment.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      <ProjectModal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        onSuccess={loadProjectDetails}
        project={project}
        clients={clients}
        teamMembers={allUsers.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN')}
      />

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSuccess={loadProjectDetails}
        task={editingTask}
        projects={project ? [project] : []}
        users={allUsers}
        defaultProjectId={project?.id}
      />

      {/* Import Tasks Modal */}
      {project && (
        <ImportTasksModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={loadProjectDetails}
          projects={[project]}
          defaultProjectId={project.id}
        />
      )}

      {submitTask && (
        <SubmitTaskModal
          task={submitTask}
          onClose={() => setSubmitTask(null)}
          onSubmitted={() => {
            setSubmitTask(null);
            loadProjectDetails();
          }}
        />
      )}

      {/* Add Member Simple Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-[#EDE7DD] space-y-4">
            <h3 className="text-base font-serif font-bold text-[#1C1917]">
              Assign Member to {project.name}
            </h3>
            <p className="text-xs text-[#78716C] font-normal">
              Select a team member to add to this project.
            </p>

            <select
              value={selectedNewMemberId}
              onChange={(e) => setSelectedNewMemberId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] font-medium focus:outline-none focus:ring-1 focus:ring-[#BA954F] cursor-pointer shadow-2xs"
            >
              <option value="">Select Team Member</option>
              {availableUsersToAdd.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!selectedNewMemberId}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl transition-colors disabled:opacity-50 cursor-pointer btn-hover-lift"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Task Detail Modal */}
      {clientViewTask && (
        <ClientTaskDetailModal
          task={clientViewTask}
          onClose={() => setClientViewTask(null)}
          onApproved={() => {
            setClientViewTask(null);
            loadProjectDetails();
          }}
          onRequestChanges={(task) => {
            setClientViewTask(null);
            setRequestChangesTask(task);
          }}
          onSubmitTask={(task) => {
            setSubmitTask(task);
          }}
          onEditTask={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onStatusChange={async (taskId, status) => {
            await handleQuickTaskStatus(taskId, status);
            setClientViewTask((prev) => (prev && prev.id === taskId ? { ...prev, status } : prev));
          }}
        />
      )}

      {/* Request Changes Modal */}
      {requestChangesTask && (
        <RequestChangesModal
          task={requestChangesTask}
          onClose={() => setRequestChangesTask(null)}
          onSubmitted={() => {
            setRequestChangesTask(null);
            loadProjectDetails();
          }}
        />
      )}

      {/* Delete Task Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingTask)}
        onClose={() => setDeletingTask(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task?"
        message={`Are you sure you want to delete task "${deletingTask?.title}"?`}
        isLoading={isDeletingTask}
      />
    </div>
  );
};
