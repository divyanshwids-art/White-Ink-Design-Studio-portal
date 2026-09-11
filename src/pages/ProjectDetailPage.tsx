import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Project, Task, Comment, User, Client, TaskStatus, Milestone, ClientApproval } from '../types';
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
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Video,
} from 'lucide-react';
import { FinalHandoverView } from '../components/projects/FinalHandoverView';
import { SubmitTaskModal } from '../components/tasks/SubmitTaskModal';
import { ImportTasksModal } from '../components/tasks/ImportTasksModal';
import { ProjectMeetingsView } from '../components/projects/ProjectMeetingsView';
import { FileSpreadsheet } from 'lucide-react';

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
  onNavigateToKanban?: () => void;
}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = ({
  projectId,
  onBack,
  onNavigateToKanban,
}) => {
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'milestones' | 'approvals' | 'meetings' | 'team' | 'comments'>('tasks');
  const [viewMode, setViewMode] = useState<'handover' | 'workspace' | null>(null);

  const isFullyCompleted = project?.handoverEligibility?.eligible ?? project?.handoverEligible ?? false;

  useEffect(() => {
    if (project) {
      const isComplete = project.handoverEligibility?.eligible ?? project.handoverEligible ?? false;
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
      alert('Team members cannot directly mark tasks as In Review or Completed. Please submit for client review at 100% progress.');
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Nav */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-bold text-black hover:text-gold-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
          Back to Projects
        </button>

        <div className="flex items-center gap-2">
          {isFullyCompleted && (
            <button
              type="button"
              onClick={() => setViewMode('handover')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#8C6D23] bg-[#FAF6ED] hover:bg-[#F5EDD6] border border-[#DFCE9F] rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Final Handover View
            </button>
          )}

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setIsEditProjectOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-white hover:bg-gold-100 border border-gold-300 rounded-lg transition-colors cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit Project
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setIsTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg shadow-sm transition-colors cursor-pointer btn-hover-lift"
              >
                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                Add Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Completion Banner when viewing workspace */}
      {isFullyCompleted && (
        <div className="bg-[#FAF6ED] border border-[#DFCE9F] p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F5EDD6] border border-[#DFCE9F] flex items-center justify-center text-[#8C6D23] shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1E1B18]">100% Mandatory Tasks Complete</h4>
              <p className="text-[11px] text-[#7A7162]">
                This project has reached final handover readiness. All deliverable requirements are signed off.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setViewMode('handover')}
            className="px-3.5 py-1.5 bg-[#8C6D23] hover:bg-[#7A5F1E] text-white text-xs font-bold rounded-lg transition-colors shadow-2xs shrink-0 cursor-pointer"
          >
            Switch to Handover View
          </button>
        </div>
      )}

      {/* Project Banner Card */}
      <div className="bg-white rounded-xl border border-gold-300 shadow-sm p-6 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={project.status} />
              {!isClient && <PriorityBadge priority={project.priority} />}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
              {project.name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-black/70 pt-1 font-medium">
              <span className="flex items-center gap-1.5 font-bold text-black">
                <Building2 className="h-4 w-4 text-gold-600" />
                {project.client?.company || project.client?.name || 'Client Org'}
              </span>
              {project.startDate && (
                <span className="flex items-center gap-1.5 font-semibold">
                  <Calendar className="h-4 w-4 text-gold-600" />
                  Started {new Date(project.startDate).toLocaleDateString()}
                </span>
              )}
              {project.dueDate && (
                <span className="flex items-center gap-1.5 text-black font-bold">
                  <Clock className="h-4 w-4 text-gold-600" />
                  Due {new Date(project.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Progress Gauge */}
          <div className="w-full lg:w-72 bg-gold-50/70 p-4 rounded-lg border border-gold-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-black">Deliverable Progress</span>
              <span className="font-extrabold text-black text-sm">{project.progress}%</span>
            </div>
            <ProgressBar progress={project.progress} size="md" showLabel={false} />
            <div className="flex justify-between text-[11px] text-black/70 font-semibold pt-1">
              <span>{project.completedTaskCount || 0} of {project.taskCount || 0} tasks done</span>
              {!isClient && (
                <span>{project.taskCount ? Math.round(((project.completedTaskCount || 0) / project.taskCount) * 100) : 0}%</span>
              )}
            </div>
          </div>
        </div>

        {project.description && (
          <div className="pt-3 border-t border-gold-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-black mb-1">
              Scope & Objectives
            </h3>
            <p className="text-sm text-black/80 leading-relaxed whitespace-pre-line">
              {project.description}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gold-300 pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'tasks'
              ? 'border-gold-600 text-black bg-gold-100/50 rounded-t-lg'
              : 'border-transparent text-black/60 hover:text-black'
          }`}
        >
          <CheckSquare className="h-4 w-4 text-gold-600" />
          Tasks ({project.tasks?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('milestones')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'milestones'
              ? 'border-gold-600 text-black bg-gold-100/50 rounded-t-lg'
              : 'border-transparent text-black/60 hover:text-black'
          }`}
        >
          <Flag className="h-4 w-4 text-gold-600" />
          Milestones ({project.milestones?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'approvals'
              ? 'border-gold-600 text-black bg-gold-100/50 rounded-t-lg'
              : 'border-transparent text-black/60 hover:text-black'
          }`}
        >
          <FileCheck className="h-4 w-4 text-gold-600" />
          Approvals ({project.approvals?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('meetings')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'meetings'
              ? 'border-gold-600 text-black bg-gold-100/50 rounded-t-lg'
              : 'border-transparent text-black/60 hover:text-black'
          }`}
        >
          <Video className="h-4 w-4 text-gold-600" />
          Meetings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'team'
              ? 'border-gold-600 text-black bg-gold-100/50 rounded-t-lg'
              : 'border-transparent text-black/60 hover:text-black'
          }`}
        >
          <Users className="h-4 w-4 text-gold-600" />
          Team Members ({project.members?.length || 0})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'comments'
              ? 'border-gold-600 text-black bg-gold-100/50 rounded-t-lg'
              : 'border-transparent text-black/60 hover:text-black'
          }`}
        >
          <MessageSquare className="h-4 w-4 text-gold-600" />
          Discussion ({comments.length})
        </button>
      </div>

      {/* Tab 1: Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-black">Project Deliverables & Tasks</h3>
            {canManage && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-white hover:bg-gold-100 border border-gold-300 rounded-lg transition-colors cursor-pointer shadow-xs"
                  title="Import multiple tasks from Excel file"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-gold-700" />
                  Import from Excel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTask(null);
                    setIsTaskModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors cursor-pointer btn-hover-lift"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  Add Task
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gold-300 shadow-sm divide-y divide-gold-200 overflow-hidden">
            {!project.tasks || project.tasks.length === 0 ? (
              <div className="p-12 text-center text-sm text-black/50 font-medium">
                No tasks created for this project yet.
              </div>
            ) : (
              project.tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={isClient ? () => setClientViewTask(task) : undefined}
                  className={`p-4 sm:p-5 hover:bg-gold-50/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4${isClient ? ' cursor-pointer' : ''}`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <PriorityBadge priority={task.priority} size="sm" />
                      <span className="text-sm font-bold text-black">{task.title}</span>
                      {task.status === 'REVISION_REQUESTED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                          Revision Requested
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-black/70 line-clamp-1">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-black/70 pt-0.5 font-medium">
                      {task.assignedTo ? (
                        <span className="flex items-center gap-1 font-semibold text-black">
                          <img
                            src={
                              task.assignedTo.profileImage ||
                              `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                task.assignedTo.name
                              )}`
                            }
                            alt={task.assignedTo.name}
                            className="h-4 w-4 rounded-full ring-1 ring-gold-400"
                          />
                          {task.assignedTo.name}
                        </span>
                      ) : (
                        <span className="text-black/40">Unassigned</span>
                      )}
                      {task.dueDate && (
                        <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    {isClient ? (
                      <StatusBadge status={task.status} size="sm" />
                    ) : user?.role === 'TEAM_MEMBER' ? (
                      <div className="flex items-center gap-2">
                        {task.status !== 'REVIEW' && task.status !== 'COMPLETED' && task.assignedToId === user?.id && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSubmitTask(task); }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg cursor-pointer shadow-xs btn-hover-lift"
                          >
                            <Send className="h-3 w-3" />
                            Submit for Client Approval
                          </button>
                        )}

                        {task.status === 'REVIEW' && task.clientApprovalStatus === 'PENDING' && (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                            Awaiting Client Approval
                          </span>
                        )}

                        {task.clientApprovalStatus === 'APPROVED' && (
                          <span className="text-[11px] font-bold text-black bg-gold-200 border border-gold-400 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                            Client Approved
                          </span>
                        )}

                        <select
                          value={task.status}
                          onChange={(e) => handleQuickTaskStatus(task.id, e.target.value as TaskStatus)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={task.status === 'REVIEW' || task.status === 'COMPLETED'}
                          className="text-xs font-bold py-1.5 px-2.5 rounded-lg border border-gold-300 bg-white text-black cursor-pointer focus:ring-1 focus:ring-gold-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          {task.status === 'REVIEW' && <option value="REVIEW" disabled>Review</option>}
                          {task.status === 'COMPLETED' && <option value="COMPLETED" disabled>Completed</option>}
                          {task.status === 'REVISION_REQUESTED' && <option value="REVISION_REQUESTED">Revision Requested</option>}
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {task.status === 'REVIEW' && task.clientApprovalStatus === 'PENDING' && (
                          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                            Awaiting Client Approval
                          </span>
                        )}

                        {task.clientApprovalStatus === 'APPROVED' && (
                          <span className="text-[11px] font-bold text-black bg-gold-200 border border-gold-400 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
                            Client Approved
                          </span>
                        )}

                        <select
                          value={task.status}
                          onChange={(e) => handleQuickTaskStatus(task.id, e.target.value as TaskStatus)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-bold py-1.5 px-2.5 rounded-lg border border-gold-300 bg-white text-black cursor-pointer focus:ring-1 focus:ring-gold-500"
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
                          className="p-1 text-black/60 hover:text-black hover:bg-gold-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTask(task);
                          }}
                          className="p-1 text-black/60 hover:text-rose-700 hover:bg-gold-100 rounded-md transition-colors cursor-pointer"
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
            <h3 className="text-sm font-bold text-black">Key Deliverable Milestones</h3>
            <span className="text-xs text-black/70 font-semibold">
              {project.milestones?.filter((m) => m.status === 'COMPLETED').length || 0} of {project.milestones?.length || 0} achieved
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gold-300 shadow-sm divide-y divide-gold-200 overflow-hidden">
            {!project.milestones || project.milestones.length === 0 ? (
              <div className="p-12 text-center text-sm text-black/50 font-medium">
                <Flag className="h-8 w-8 text-gold-400 mx-auto mb-2" />
                No milestones recorded for this project.
              </div>
            ) : (
              project.milestones.map((m) => (
                <div key={m.id} className="p-4 sm:p-5 hover:bg-gold-50/40 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-black">{m.name}</h4>
                      {m.description && (
                        <p className="text-xs text-black/70 mt-0.5">{m.description}</p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        m.status === 'COMPLETED'
                          ? 'bg-gold-200 text-black border-gold-400'
                          : m.status === 'DELAYED'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-gold-100 text-black border-gold-400'
                      }`}
                    >
                      {m.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 pt-1">
                    <div className="w-48">
                      <ProgressBar progress={m.progress} size="sm" />
                    </div>
                    <span className="text-xs text-black/70 font-semibold">
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
            <h3 className="text-sm font-bold text-black">Client Sign-Off & Deliverables</h3>
            <span className="text-xs text-black/70 font-semibold">
              {project.approvals?.filter((a) => a.status === 'APPROVED').length || 0} approved
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gold-300 shadow-sm divide-y divide-gold-200 overflow-hidden">
            {!project.approvals || project.approvals.length === 0 ? (
              <div className="p-12 text-center text-sm text-black/50 font-medium">
                <FileCheck className="h-8 w-8 text-gold-400 mx-auto mb-2" />
                No deliverable sign-offs requested for this project yet.
              </div>
            ) : (
              project.approvals.map((a) => (
                <div key={a.id} className="p-4 sm:p-5 hover:bg-gold-50/40 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-bold text-black">{a.title}</h4>
                      {a.description && (
                        <p className="text-xs text-black/70 mt-0.5">{a.description}</p>
                      )}
                      {a.deliverableUrl && (
                        <a
                          href={a.deliverableUrl.startsWith('http') ? a.deliverableUrl : `https://${a.deliverableUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-black font-bold hover:text-gold-700 underline mt-1"
                        >
                          <ExternalLink className="h-3 w-3 text-gold-600" /> View Asset
                        </a>
                      )}
                    </div>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        a.status === 'APPROVED'
                          ? 'bg-gold-200 text-black border-gold-400'
                          : a.status === 'REJECTED'
                          ? 'bg-rose-50 text-rose-800 border-rose-300'
                          : 'bg-gold-100 text-black border-gold-400'
                      }`}
                    >
                      {a.status === 'PENDING' ? 'Pending Review' : a.status === 'APPROVED' ? 'Approved' : 'Needs Revisions'}
                    </span>
                  </div>

                  {a.comments && (
                    <div className="p-2.5 bg-gold-50 rounded-lg text-xs text-black/80 font-medium italic border border-gold-200">
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
            <h3 className="text-sm font-bold text-black">Project Staffing</h3>
            {canManage && (
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors cursor-pointer btn-hover-lift"
              >
                <UserPlus className="h-3.5 w-3.5 stroke-[2.5]" />
                Assign Member
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {!project.members || project.members.length === 0 ? (
              <div className="col-span-full p-8 text-center text-sm text-black/50 bg-white rounded-xl border border-gold-300">
                No team members assigned yet.
              </div>
            ) : (
              project.members.map((member) => (
                <div
                  key={member.id}
                  className="bg-white p-4 rounded-xl border border-gold-300 shadow-sm flex items-center justify-between gap-3 card-hover-lift"
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
                      className="h-10 w-10 rounded-lg border border-gold-300 object-cover"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-black truncate">{member.name}</h4>
                      <p className="text-xs text-black/70 font-medium truncate">{member.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-gold-100 text-black border border-gold-300">
                        {member.role.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      className="p-1.5 text-black/60 hover:text-rose-700 hover:bg-gold-100 rounded-lg transition-colors cursor-pointer"
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
          <div className="bg-white p-6 rounded-xl border border-gold-300 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-black">Project Discussion Feed</h3>

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
                className="h-9 w-9 rounded-lg border border-gold-300 object-cover shrink-0"
              />
              <div className="flex-1 space-y-2">
                <textarea
                  rows={2}
                  required
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Share a milestone update, feedback, or note..."
                  className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-medium placeholder-black/40 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
                />
                <button
                  type="submit"
                  disabled={isPostingComment || !commentText.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg shadow-sm transition-colors disabled:opacity-50 cursor-pointer btn-hover-lift"
                >
                  <Send className="h-3.5 w-3.5 stroke-[2.5]" />
                  {isPostingComment ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3 pt-4 border-t border-gold-200">
              {comments.length === 0 ? (
                <div className="p-8 text-center text-xs text-black/50 font-medium">
                  No discussion comments yet. Start the conversation!
                </div>
              ) : (
                comments.map((comment) => {
                  const isAuthor = comment.userId === user?.id;
                  const canDelete = isAuthor || canManage;

                  return (
                    <div
                      key={comment.id}
                      className="p-4 rounded-lg bg-gold-50/60 border border-gold-200 space-y-2"
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
                            className="h-7 w-7 rounded-md border border-gold-300 object-cover"
                          />
                          <div>
                            <span className="text-xs font-bold text-black">
                              {comment.user?.name}
                            </span>
                            {comment.user?.role && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-gold-200 text-black font-bold">
                                {comment.user.role}
                              </span>
                            )}
                            <span className="ml-2 text-[11px] text-black/60 font-semibold">
                              {new Date(comment.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-black/60 hover:text-rose-700 p-1 rounded transition-colors cursor-pointer"
                            title="Delete comment"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-black/90 pl-9 whitespace-pre-line leading-relaxed font-medium">
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
          onSubmitted={() => { setSubmitTask(null); loadProjectDetails(); }}
        />
      )}

      {/* Add Member Simple Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-gold-300 space-y-4">
            <h3 className="text-base font-extrabold text-black">Assign Member to {project.name}</h3>
            <p className="text-xs text-black/70 font-medium">
              Select a team member to add to this project.
            </p>

            <select
              value={selectedNewMemberId}
              onChange={(e) => setSelectedNewMemberId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
            >
              <option value="">Select Team Member</option>
              {availableUsersToAdd.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace('_', ' ')})
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddMemberOpen(false)}
                className="px-3.5 py-2 text-xs font-bold text-black bg-white hover:bg-gold-100 border border-gold-300 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMember}
                disabled={!selectedNewMemberId}
                className="px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 cursor-pointer btn-hover-lift"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Client Task Detail Modal */}
      {clientViewTask && isClient && (
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
