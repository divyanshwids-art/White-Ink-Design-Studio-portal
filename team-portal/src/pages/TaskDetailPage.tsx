import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { Task, TaskStatus, Project, User } from '../types';
import { api } from '../services/api';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { StatusBadge } from '../components/common/StatusBadge';
import { DeadlineCountdownBadge } from '../components/tasks/DeadlineCountdownBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { TaskModal } from '../components/tasks/TaskModal';
import { TaskOverdueReasonModal } from '../components/tasks/TaskOverdueReasonModal';
import { soundAlerts } from '../utils/soundAlerts';
import { isTaskOrProjectOverdue } from '@shared';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Timer,
  Play,
  Pause,
  RotateCcw,
  Bell,
  BellOff,
  Volume2,
  Send,
  ExternalLink,
  Edit2,
  Trash2,
  Briefcase,
  User as UserIcon,
  Info,
  RefreshCw,
  FileCheck,
  Check,
  XCircle,
} from 'lucide-react';

interface TaskDetailPageProps {
  taskId: string;
  onBack: () => void;
  onNavigate?: (path: string) => void;
}

export const TaskDetailPage: React.FC<TaskDetailPageProps> = ({
  taskId,
  onBack,
  onNavigate,
}) => {
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';
  const isAdminOrSuper = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';

  const {
    activeFocusTask,
    focusTotalSeconds,
    focusSecondsRemaining,
    isFocusTimerActive,
    isFocusAlarmRinging,
    startFocusTimer,
    pauseFocusTimer,
    resumeFocusTimer,
    resetFocusTimer,
    setFocusMinutes,
    stopFocusAlarm,
    snoozeFocusTimer,
    logAndCloseFocusTimer,
  } = useTimer();

  // Redirect SUPER_ADMIN away from worker task detail page
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN') {
      onBack();
    }
  }, [user?.role, onBack]);

  const [task, setTask] = useState<Task | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Edit / Delete / Overdue modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isOverdueModalOpen, setIsOverdueModalOpen] = useState(false);

  // Focus Timer Local States
  const [timerMinutes, setTimerMinutes] = useState<number>(25);
  const [customTimerMinutes, setCustomTimerMinutes] = useState<string>('');
  const [timerNotes, setTimerNotes] = useState<string>('');
  const [isLoggingTime, setIsLoggingTime] = useState<boolean>(false);
  const [timeLoggedSuccess, setTimeLoggedSuccess] = useState<boolean>(false);

  const isCurrentTaskSession = activeFocusTask?.id === task?.id;
  const isTimerActive = isCurrentTaskSession ? isFocusTimerActive : false;
  const isAlarmRinging = isCurrentTaskSession ? isFocusAlarmRinging : false;
  const totalSeconds = isCurrentTaskSession ? focusTotalSeconds : timerMinutes * 60;
  const secondsRemaining = isCurrentTaskSession ? focusSecondsRemaining : timerMinutes * 60;
  const currentMinutes = isCurrentTaskSession ? Math.round(focusTotalSeconds / 60) : timerMinutes;

  // Deliverable Submission Form State
  const [submissionDescription, setSubmissionDescription] = useState('');
  const [proofDetails, setProofDetails] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Client Review State
  const [isApproving, setIsApproving] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [revisionPriority, setRevisionPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [revisionTargetDate, setRevisionTargetDate] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);

  // Load Task Data
  const loadTask = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [allTasks, projectsData, usersData] = await Promise.all([
        api.getTasks(),
        api.getProjects(),
        api.getUsers(),
      ]);
      setProjects(projectsData);
      setUsers(usersData);

      const found = allTasks.find((t) => t.id === taskId);
      if (found) {
        setTask(found);
        if (found.submissionDescription) setSubmissionDescription(found.submissionDescription);
        if (found.proofDetails) setProofDetails(found.proofDetails);
        if (found.deliverableUrl) setDeliverableUrl(found.deliverableUrl);
      } else {
        setErrorMessage('Task not found or you do not have permission to view it.');
      }
    } catch (err: any) {
      console.error('Failed to load task details:', err);
      setErrorMessage(err.message || 'Failed to load task details.');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTask();
  }, [loadTask]);

  // Timer controls
  const handleStartTimer = () => {
    if (!task) return;
    if (isCurrentTaskSession) {
      resumeFocusTimer();
    } else {
      startFocusTimer(task, timerMinutes);
    }
  };

  const handlePauseTimer = () => {
    pauseFocusTimer();
  };

  const handleResetTimer = () => {
    if (isCurrentTaskSession) {
      resetFocusTimer(timerMinutes);
    }
  };

  const handleSelectPreset = (mins: number) => {
    setTimerMinutes(mins);
    setCustomTimerMinutes('');
    if (isCurrentTaskSession) {
      setFocusMinutes(mins);
    }
  };

  const handleCustomTimerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(customTimerMinutes, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 300) {
      handleSelectPreset(parsed);
    }
  };

  const handleStopAlarm = () => {
    stopFocusAlarm();
  };

  const handleLogFocusTime = async () => {
    if (!task) return;
    handleStopAlarm();
    setIsLoggingTime(true);
    try {
      if (isCurrentTaskSession) {
        await logAndCloseFocusTimer(timerNotes);
      } else {
        const elapsedSeconds = totalSeconds - secondsRemaining;
        const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));

        await api.logTaskTime(task.id, {
          durationMinutes: elapsedMinutes,
          notes: timerNotes.trim() || `Focus Session (${currentMinutes}m target)`,
        });
      }

      setTimeLoggedSuccess(true);
      setTimeout(() => setTimeLoggedSuccess(false), 4000);
      await loadTask();
    } catch (err) {
      console.error('Failed to log time:', err);
    } finally {
      setIsLoggingTime(false);
    }
  };

  // Submit Deliverable for Internal Review
  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;
    if (!submissionDescription.trim()) {
      setSubmissionError('Please describe what was completed in this task.');
      return;
    }

    setIsSubmittingProof(true);
    setSubmissionError('');
    try {
      await api.submitTask(task.id, {
        submissionDescription: submissionDescription.trim(),
        deliverableUrl: deliverableUrl.trim() || undefined,
      });
      setSubmissionSuccess(true);
      setTimeout(() => setSubmissionSuccess(false), 4000);
      await loadTask();
    } catch (err: any) {
      setSubmissionError(err.message || 'Failed to submit deliverable.');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Admin Internal Review Approve & Send to Client
  const handleAdminApprove = async () => {
    if (!task) return;
    if (!window.confirm(`Approve deliverable and forward "${task.title}" to client for sign-off?`)) return;
    setIsApproving(true);
    try {
      await api.adminApproveTask(task.id);
      await loadTask();
    } catch (err) {
      console.error('Failed to approve task for client:', err);
    } finally {
      setIsApproving(false);
    }
  };

  // Client Approve
  const handleClientApprove = async () => {
    if (!task) return;
    if (!window.confirm(`Are you sure you want to approve "${task.title}"?`)) return;
    setIsApproving(true);
    try {
      await api.approveTask(task.id);
      await loadTask();
    } catch (err) {
      console.error('Failed to approve task:', err);
    } finally {
      setIsApproving(false);
    }
  };

  // Client Request Changes
  const handleClientRequestChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !revisionFeedback.trim()) return;
    setIsRequestingChanges(true);
    try {
      await api.submitRevisionRequest(task.id, {
        feedback: revisionFeedback.trim(),
        priority: revisionPriority as 'LOW' | 'MEDIUM' | 'HIGH',
        targetDate: revisionTargetDate || undefined,
        files: [],
      });
      setShowRevisionForm(false);
      setRevisionFeedback('');
      await loadTask();
    } catch (err) {
      console.error('Failed to request revision:', err);
    } finally {
      setIsRequestingChanges(false);
    }
  };

  // Status Change
  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;
    try {
      await api.updateTaskStatus(task.id, newStatus);
      await loadTask();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    if (!task) return;
    setIsDeleting(true);
    try {
      await api.deleteTask(task.id);
      onBack();
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTimerDigits = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <LoadingSpinner message="Loading task details..." size="lg" />
      </div>
    );
  }

  if (errorMessage || !task) {
    return (
      <div className="max-w-4xl mx-auto p-8 bg-white rounded-2xl border border-[#EDE7DD] text-center space-y-4 shadow-xs">
        <AlertTriangle className="h-10 w-10 text-[#B91C1C] mx-auto" />
        <h2 className="text-xl font-bold text-[#1C1917]">Task Unavailable</h2>
        <p className="text-xs sm:text-sm text-[#78716C] max-w-md mx-auto">
          {errorMessage || 'The requested task could not be found.'}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl cursor-pointer transition-colors shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tasks
        </button>
      </div>
    );
  }

  const isAssignee = task.assignedToId === user?.id;
  const isOverdue = isTaskOrProjectOverdue(task.dueDate, task.status);

  const isSubmitted = Boolean(task.submittedAt);
  const isRevisionRequested = task.status === 'REVISION_REQUESTED';
  const isClientApproved = task.clientApprovalStatus === 'APPROVED';
  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsRemaining) / totalSeconds) * 100 : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-gold-fade-in">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] shadow-2xs transition-all cursor-pointer w-fit"
        >
          <ArrowLeft className="h-4 w-4 text-[#BA954F]" />
          Back to Tasks
        </button>

        {/* Admin Quick Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {!isClient && (
            <div className="flex items-center gap-2 bg-white border border-[#DFD5C6] rounded-xl px-3 py-1.5 shadow-2xs">
              <span className="text-xs font-semibold text-[#78716C]">Status:</span>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                disabled={isTeamMember && (task.status === 'REVIEW' || task.status === 'COMPLETED')}
                className="text-xs font-semibold bg-transparent text-[#1C1917] focus:outline-none cursor-pointer disabled:opacity-60"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="REVIEW">In Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="REVISION_REQUESTED">Revision Requested</option>
              </select>
            </div>
          )}

          {isAdminOrSuper && (
            <>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5 text-[#BA954F]" />
                Edit Task
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="p-2 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FDF2F0] border border-transparent hover:border-[#F5D5D0] rounded-xl transition-colors cursor-pointer"
                title="Delete Task"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Task Hero Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#EDE7DD] shadow-xs space-y-5">
        {/* Badges Row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {task.project && (
            <span
              onClick={() => onNavigate && onNavigate(`/projects/${task.project?.id}`)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#BA954F] bg-[#FAF4EC] px-3 py-1 rounded-full border border-[#EDE3D4] cursor-pointer hover:bg-[#F5EFE6] transition-colors"
            >
              <Briefcase className="h-3.5 w-3.5 text-[#BA954F]" />
              {task.project.name}
            </span>
          )}
          <PriorityBadge priority={task.priority} size="md" />
          <StatusBadge status={task.status} size="md" />
          {task.dueDate && (
            <DeadlineCountdownBadge dueDate={task.dueDate} status={task.status} size="md" />
          )}
        </div>

        {/* Task Title */}
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] leading-tight">
          {task.title}
        </h1>

        {/* Meta Info Bar: Assignee, Due Date, Timestamps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#EDE7DD]">
          {/* Assignee */}
          <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD]">
            <img
              src={
                task.assignedTo?.profileImage ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                  task.assignedTo?.name || 'User'
                )}`
              }
              alt={task.assignedTo?.name || 'Assignee'}
              className="h-10 w-10 rounded-xl border border-[#DFD5C6] object-cover shadow-2xs"
            />
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#8C7E72] tracking-wider block">
                Assigned To
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#1C1917] truncate">
                {task.assignedTo?.name || 'Unassigned'}
              </div>
            </div>
          </div>

          {/* Due Date */}
          <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD]">
            <div className="h-10 w-10 rounded-xl bg-[#FAF4EC] border border-[#EDE3D4] flex items-center justify-center text-[#BA954F] shrink-0">
              <Calendar className="h-5 w-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#8C7E72] tracking-wider block">
                Target Due Date
              </span>
              <div className="text-xs sm:text-sm font-mono font-bold text-[#1C1917]">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
              </div>
            </div>
          </div>

          {/* Progress / Status Summary */}
          <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD]">
            <div className="h-10 w-10 rounded-xl bg-[#F0F7F2] border border-[#D1E7DD] flex items-center justify-center text-[#2D6A4F] shrink-0">
              <CheckCircle2 className="h-5 w-5 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#8C7E72] tracking-wider block">
                Deliverable State
              </span>
              <div className="text-xs sm:text-sm font-bold text-[#1C1917]">
                {isClientApproved
                  ? 'Client Approved'
                  : isSubmitted
                  ? 'Submitted for Review'
                  : task.status === 'COMPLETED'
                  ? 'Completed'
                  : 'In Progress'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Delay Reason Callout (if exists) */}
      {task.overdueReason && (
        <div className="p-5 rounded-3xl bg-[#FDF2F0] border border-[#F5D5D0] space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-[#B91C1C] text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Overdue Delay Reason ({task.assignedTo?.name || 'Team Member'}):</span>
            </div>
            {isAssignee && (
              <button
                type="button"
                onClick={() => setIsOverdueModalOpen(true)}
                className="text-xs font-semibold text-[#B91C1C] hover:underline cursor-pointer"
              >
                Update Reason
              </button>
            )}
          </div>
          <p className="text-xs sm:text-sm text-[#7F1D1D] italic pl-6 leading-relaxed">
            &ldquo;{task.overdueReason}&rdquo;
          </p>
        </div>
      )}

      {/* Client Revision Request Callout (if revision requested) */}
      {isRevisionRequested && task.revisionRequest && (
        <div className="p-5 bg-[#FDF2F0] border border-[#F5D5D0] rounded-3xl space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#B91C1C] uppercase tracking-wider flex items-center gap-1.5">
              <RefreshCw className="h-4 w-4 text-[#B91C1C]" />
              Client Requested Revisions
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF2E6] text-[#946B2D] border border-[#E8DCC8]">
              {task.revisionRequest.priority || 'NORMAL'} Priority
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#7F1D1D] leading-relaxed font-normal">
            {task.revisionRequest.feedback}
          </p>
          {task.revisionRequest.targetDate && (
            <p className="text-xs text-[#991B1B] font-mono font-semibold pt-1">
              Target Completion: {new Date(task.revisionRequest.targetDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (What to do & Proof of Work Submission) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: What to do / Task Instructions */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EDE7DD] shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDE7DD] pb-3">
              <h2 className="text-sm sm:text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
                <Info className="h-4 w-4 text-[#BA954F]" />
                What to do / Task Instructions
              </h2>
            </div>
            <div className="p-4 sm:p-5 bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD]">
              <p className="text-xs sm:text-sm text-[#3E3832] leading-relaxed whitespace-pre-wrap font-normal">
                {task.description?.trim() ? task.description : 'No detailed description provided for this task.'}
              </p>
            </div>
          </div>

          {/* Section 2: Submitted Work & Proof Details (If already submitted) */}
          {isSubmitted && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EDE7DD] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EDE7DD] pb-3">
                <h2 className="text-sm sm:text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-[#2D6A4F]" />
                  Submitted Deliverable & Proof of Work
                </h2>
                {task.submittedAt && (
                  <span className="text-[11px] text-[#78716C] font-mono">
                    Submitted on {new Date(task.submittedAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                {task.submissionDescription && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7E72] block mb-1">
                      Completion Summary:
                    </span>
                    <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD] text-xs sm:text-sm text-[#443B30] whitespace-pre-wrap">
                      {task.submissionDescription}
                    </div>
                  </div>
                )}

                {task.proofDetails && (
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7E72] block mb-1">
                      Proof of Work / Verification Details:
                    </span>
                    <div className="p-3.5 bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD] text-xs sm:text-sm text-[#443B30] whitespace-pre-wrap">
                      {task.proofDetails}
                    </div>
                  </div>
                )}

                {task.deliverableUrl && (
                  <div className="pt-2">
                    <a
                      href={
                        task.deliverableUrl.startsWith('http')
                          ? task.deliverableUrl
                          : `https://${task.deliverableUrl}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[#BA954F] hover:text-[#A17B2F] bg-[#FAF4EC] hover:bg-[#F5EFE6] border border-[#EDE3D4] rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Open Deliverable Asset / Live Preview Link</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Submit Work with Proof Form (For Assigned Member / Staff) */}
          {!isClient && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EDE7DD] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EDE7DD] pb-3">
                <h2 className="text-sm sm:text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
                  <Send className="h-4 w-4 text-[#BA954F]" />
                  {isSubmitted ? 'Update / Re-Submit Deliverable with Proof' : 'Submit Task Deliverable with Proof'}
                </h2>
              </div>

              {submissionSuccess && (
                <div className="p-4 bg-[#F0F7F2] border border-[#D1E7DD] text-[#2D6A4F] text-xs sm:text-sm font-semibold rounded-2xl flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  Task deliverable submitted successfully! Awaiting internal review.
                </div>
              )}

              {submissionError && (
                <div className="p-4 bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs sm:text-sm font-semibold rounded-2xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {submissionError}
                </div>
              )}

              <form onSubmit={handleSubmitDeliverable} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                    Completion Summary / Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={submissionDescription}
                    onChange={(e) => setSubmissionDescription(e.target.value)}
                    placeholder="Describe what was accomplished, deliverables created, and key highlights..."
                    className="w-full px-4 py-3 text-xs sm:text-sm bg-white border border-[#DFD5C6] rounded-2xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#1C1917] mb-1.5">
                    Deliverable Asset / Preview Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={deliverableUrl}
                    onChange={(e) => setDeliverableUrl(e.target.value)}
                    placeholder="https://figma.com/... or https://drive.google.com/..."
                    className="w-full px-4 py-2.5 text-xs sm:text-sm bg-white border border-[#DFD5C6] rounded-2xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingProof}
                    className="w-full sm:w-auto px-6 py-3 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition-all cursor-pointer btn-hover-lift flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    {isSubmittingProof ? 'Submitting Deliverable...' : 'Submit Deliverable for Internal Review'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Section 4a: Internal Admin Review (For Admin when status is INTERNAL_REVIEW) */}
          {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && task.clientApprovalStatus === 'INTERNAL_REVIEW' && (
            <div className="bg-[#FAF4EC] rounded-3xl p-6 sm:p-7 border-2 border-[#BA954F]/40 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#EDE3D4] pb-3">
                <h2 className="text-sm sm:text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-[#BA954F]" />
                  Internal Admin Review Required
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF2E6] text-[#946B2D] border border-[#E8DCC8] uppercase tracking-wider">
                  Internal Verification
                </span>
              </div>
              <p className="text-xs text-[#443B30] leading-relaxed">
                The assigned team member has finished work on this task and submitted it for internal quality review. Review the deliverable above. When verified, approve it to forward to the client for final sign-off.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAdminApprove}
                  disabled={isApproving}
                  className="px-6 py-3 bg-[#BA954F] hover:bg-[#A17B2F] text-white font-bold text-xs sm:text-sm rounded-2xl shadow-xs transition-all cursor-pointer btn-hover-lift inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isApproving ? 'Approving & Forwarding...' : 'Approve & Send to Client for Sign-Off'}
                </button>
              </div>
            </div>
          )}

          {/* Section 4b: Client Review & Approvals (For Client Role) */}
          {isClient && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EDE7DD] shadow-xs space-y-4">
              <h2 className="text-sm sm:text-base font-serif font-bold text-[#1C1917] flex items-center gap-2 border-b border-[#EDE7DD] pb-3">
                <CheckCircle2 className="h-4 w-4 text-[#BA954F]" />
                Client Review & Sign-Off
              </h2>

              {!isSubmitted ? (
                <div className="p-4 bg-[#FAF7F2] border border-[#EDE7DD] rounded-2xl text-xs text-[#78716C] font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#BA954F] shrink-0" />
                  <span>The assigned team member has not submitted a deliverable for this task yet.</span>
                </div>
              ) : task.clientApprovalStatus === 'INTERNAL_REVIEW' ? (
                <div className="p-4 bg-[#FAF4EC] border border-[#EDE3D4] rounded-2xl text-xs text-[#946B2D] font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#BA954F] shrink-0" />
                  <span>The deliverable is currently undergoing internal quality review by the studio lead before being submitted to you.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleClientApprove}
                      disabled={isApproving || isClientApproved}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        isClientApproved
                          ? 'bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD] cursor-default'
                          : 'bg-[#BA954F] hover:bg-[#A17B2F] text-white shadow-xs btn-hover-lift'
                      } disabled:opacity-60`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isClientApproved ? 'Task Approved' : isApproving ? 'Approving...' : 'Approve Task Deliverable'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowRevisionForm(!showRevisionForm)}
                      disabled={isClientApproved}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs sm:text-sm font-bold bg-white hover:bg-[#FDF2F0] text-[#B91C1C] border border-[#F5D5D0] transition-all cursor-pointer btn-hover-lift disabled:opacity-40"
                    >
                      <XCircle className="h-4 w-4" />
                      {showRevisionForm ? 'Cancel Revision' : 'Request Changes'}
                    </button>
                  </div>

                  {showRevisionForm && (
                    <form onSubmit={handleClientRequestChanges} className="p-5 bg-[#FAF7F2] rounded-2xl border border-[#EDE7DD] space-y-3.5 animate-gold-fade-in">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#B91C1C]">
                        Specify Requested Revisions
                      </h3>
                      <textarea
                        rows={3}
                        required
                        value={revisionFeedback}
                        onChange={(e) => setRevisionFeedback(e.target.value)}
                        placeholder="Detail specific modifications or additions needed..."
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-[#78716C] mb-1">
                            Revision Priority
                          </label>
                          <select
                            value={revisionPriority}
                            onChange={(e) => setRevisionPriority(e.target.value as any)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917]"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-[#78716C] mb-1">
                            Target Date (Optional)
                          </label>
                          <input
                            type="date"
                            value={revisionTargetDate}
                            onChange={(e) => setRevisionTargetDate(e.target.value)}
                            className="w-full px-3 py-1.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917]"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isRequestingChanges || !revisionFeedback.trim()}
                        className="px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isRequestingChanges ? 'Submitting...' : 'Send Revision Request'}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column (Focus Timer Widget & Task Stats) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Focus Timer Widget */}
          {!isClient && (
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#EDE7DD] shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-[#EDE7DD] pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl border ${
                    isAlarmRinging ? 'bg-[#B91C1C] text-white border-[#B91C1C]' : 'bg-[#FAF4EC] text-[#BA954F] border-[#EDE3D4]'
                  }`}>
                    {isAlarmRinging ? <Bell className="h-4 w-4 animate-bounce" /> : <Timer className="h-4 w-4 stroke-[2]" />}
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-[#1C1917]">
                      {isAlarmRinging ? '⏰ Focus Timer Expired!' : 'Task Focus Timer (Alarm)'}
                    </h2>
                    <p className="text-[11px] text-[#78716C]">LeetCode-style focus timer with audio alarm</p>
                  </div>
                </div>
              </div>

              {/* Preset Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider block">
                    Target Session Duration:
                  </span>
                  {task?.allocatedMinutes && task.allocatedMinutes > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
                      Allocated: {task.allocatedMinutes}m
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from(new Set([
                    ...(task?.allocatedMinutes && task.allocatedMinutes > 0 ? [task.allocatedMinutes] : []),
                    15, 25, 45, 60
                  ])).sort((a, b) => a - b).slice(0, 4).map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleSelectPreset(mins)}
                      disabled={isTimerActive}
                      className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer text-center ${
                        timerMinutes === mins && !customTimerMinutes
                          ? 'bg-[#BA954F] text-white shadow-xs'
                          : 'bg-[#FAF7F2] text-[#57534E] hover:bg-[#F5EFE6] border border-[#EDE7DD]'
                      } disabled:opacity-50`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>

                {/* Custom Minutes Input */}
                <form onSubmit={handleCustomTimerSubmit} className="flex gap-2 pt-1">
                  <input
                    type="number"
                    min={1}
                    max={300}
                    value={customTimerMinutes}
                    onChange={(e) => setCustomTimerMinutes(e.target.value)}
                    placeholder="Custom minutes (e.g. 90)..."
                    disabled={isTimerActive}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isTimerActive || !customTimerMinutes}
                    className="px-3 py-1.5 text-xs font-semibold text-[#443B30] bg-[#FAF7F2] hover:bg-[#F5EFE6] border border-[#EDE7DD] rounded-xl transition-colors cursor-pointer disabled:opacity-40"
                  >
                    Set
                  </button>
                </form>
              </div>

              {/* Timer Display Card */}
              <div className={`p-6 rounded-2xl border text-center transition-all ${
                isAlarmRinging
                  ? 'bg-[#FDF2F0] border-[#B91C1C] shadow-lg shadow-[#B91C1C]/10'
                  : isTimerActive
                  ? 'bg-[#FAF4EC]/60 border-[#BA954F]/40 shadow-sm'
                  : 'bg-[#FAF7F2] border-[#EDE7DD]'
              }`}>
                {isAlarmRinging && (
                  <div className="mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B91C1C] text-white text-xs font-bold animate-bounce shadow-md">
                    <Volume2 className="h-3.5 w-3.5" />
                    Alarm Ringing! Click Stop to dismiss
                  </div>
                )}

                <div className={`font-mono text-5xl font-extrabold tracking-tight ${
                  isAlarmRinging ? 'text-[#B91C1C]' : isTimerActive ? 'text-[#1C1917]' : 'text-[#443B30]'
                }`}>
                  {formatTimerDigits(secondsRemaining)}
                </div>

                <p className="text-xs text-[#78716C] mt-2 font-medium">
                  {isTimerActive
                    ? '⚡ Focus in progress · Keep going!'
                    : secondsRemaining === 0
                    ? 'Session target reached!'
                    : 'Ready to begin focus session'}
                </p>

                {/* Progress bar */}
                <div className="w-full bg-[#EDE7DD] h-2 rounded-full mt-4 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isAlarmRinging ? 'bg-[#B91C1C]' : 'bg-[#BA954F]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Timer Buttons */}
              <div className="flex items-center justify-center gap-3">
                {isAlarmRinging ? (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      type="button"
                      onClick={handleStopAlarm}
                      className="flex-1 py-2.5 rounded-xl bg-[#B91C1C] hover:bg-[#991B1B] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                    >
                      <BellOff className="h-4 w-4" />
                      Stop Alarm
                    </button>
                    {user?.role === 'TEAM_MEMBER' && (
                      <button
                        type="button"
                        onClick={() => snoozeFocusTimer(15)}
                        className="flex-1 py-2.5 rounded-xl bg-[#BA954F] hover:bg-[#A17B2F] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer btn-hover-lift"
                      >
                        <Clock className="h-4 w-4" />
                        Snooze 15m
                      </button>
                    )}
                  </div>
                ) : !isTimerActive ? (
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="flex-1 py-2.5 rounded-xl bg-[#BA954F] hover:bg-[#A17B2F] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer btn-hover-lift"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {secondsRemaining < totalSeconds && secondsRemaining > 0 ? 'Resume' : 'Start Focus'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseTimer}
                    className="flex-1 py-2.5 rounded-xl bg-[#443B30] hover:bg-[#2C241B] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Pause className="h-4 w-4 fill-current" />
                    Pause
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleResetTimer}
                  className="p-2.5 rounded-xl bg-white hover:bg-[#FAF7F2] text-[#78716C] hover:text-[#1C1917] border border-[#EDE7DD] transition-colors cursor-pointer shadow-2xs"
                  title="Reset Timer"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>

              {/* Log Time Input */}
              <div className="space-y-2 pt-3 border-t border-[#EDE7DD]">
                <label className="text-xs font-bold text-[#443B30] block">
                  Session Notes:
                </label>
                <input
                  type="text"
                  value={timerNotes}
                  onChange={(e) => setTimerNotes(e.target.value)}
                  placeholder="e.g. Modeled elevation draft, fixed dimensions..."
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                />

                {timeLoggedSuccess && (
                  <div className="p-2 bg-[#F0F7F2] border border-[#D1E7DD] text-[#2D6A4F] text-xs font-semibold rounded-xl flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Time logged successfully to task & activity history!
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-[#78716C] font-mono">
                    Elapsed: {Math.max(1, Math.round((totalSeconds - secondsRemaining) / 60))} min
                  </span>
                  <button
                    type="button"
                    onClick={handleLogFocusTime}
                    disabled={isLoggingTime}
                    className="px-4 py-2 text-xs font-bold text-white bg-[#2D6A4F] hover:bg-[#22543D] rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isLoggingTime ? 'Logging...' : 'Save & Log Time'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Task Modal */}
      <TaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        task={task}
        projects={projects}
        users={users}
        onSuccess={loadTask}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete Task"
        message={`Are you sure you want to delete task "${task.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleDeleteTask}
        onCancel={() => setIsDeleteConfirmOpen(false)}
      />

      {/* Overdue Explanation Modal */}
      <TaskOverdueReasonModal
        isOpen={isOverdueModalOpen}
        onClose={() => setIsOverdueModalOpen(false)}
        task={task}
        onSuccess={loadTask}
      />
    </div>
  );
};
