import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Task, TaskStatus, Comment } from '../../types';
import { api } from '../../services/api';
import { PriorityBadge } from '../common/PriorityBadge';
import { StatusBadge } from '../common/StatusBadge';
import { DeadlineCountdownBadge } from './DeadlineCountdownBadge';
import { isTaskOrProjectOverdue } from '@shared';
import {
  X,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Send,
  MessageSquare,
  AlertTriangle,
  Timer,
  ExternalLink,
  Edit2,
  Briefcase,
  FileCheck2,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

export interface ClientTaskDetailModalProps {
  task: Task | null;
  isOpen?: boolean;
  onClose: () => void;
  onApproved?: () => void;
  onRequestChanges?: (task: Task) => void;
  onStartTimer?: (task: Task) => void;
  onSubmitTask?: (task: Task) => void;
  onExplainDelay?: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => Promise<void> | void;
}

export const ClientTaskDetailModal: React.FC<ClientTaskDetailModalProps> = ({
  task,
  isOpen = true,
  onClose,
  onApproved,
  onRequestChanges,
  onStartTimer,
  onSubmitTask,
  onExplainDelay,
  onEditTask,
  onStatusChange,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);

  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';
  const isAdminOrSuper = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isTeamMember = user?.role === 'TEAM_MEMBER';
  const isAssignee = task?.assignedToId === user?.id;

  const loadComments = useCallback(async () => {
    if (!task?.id) return;
    setLoadingComments(true);
    try {
      const data = await api.getTaskComments(task.id);
      setComments(data);
    } catch {
      // silently fail
    } finally {
      setLoadingComments(false);
    }
  }, [task?.id]);

  useEffect(() => {
    if (task?.id && isOpen) {
      loadComments();
    }
  }, [task?.id, isOpen, loadComments]);

  if (!task || !isOpen) return null;

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsPosting(true);
    try {
      const newComment = await api.addTaskComment(task.id, commentText.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch {
      // silently fail
    } finally {
      setIsPosting(false);
    }
  };

  const handleApprove = async () => {
    if (!task) return;
    setIsApproving(true);
    try {
      await api.approveTask(task.id);
      onApproved?.();
    } catch {
      // silently fail
    } finally {
      setIsApproving(false);
    }
  };

  const handleAdminApprove = async () => {
    if (!task) return;
    setIsApproving(true);
    try {
      await api.adminApproveTask(task.id);
      onApproved?.();
    } catch {
      // silently fail
    } finally {
      setIsApproving(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isAlreadyApproved = task.clientApprovalStatus === 'APPROVED';
  const isRevisionRequested = task.status === 'REVISION_REQUESTED';
  const isSubmitted = Boolean(task.submittedAt);
  const hasSubmissionDetails = Boolean(task.submissionDescription?.trim());
  const canApprove =
    isSubmitted &&
    hasSubmissionDetails &&
    task.status === 'REVIEW' &&
    task.clientApprovalStatus === 'PENDING';

  const isOverdue = isTaskOrProjectOverdue(task.dueDate, task.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-gold-fade-in">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-2xl shadow-2xl border border-[#EDE7DD] flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#EDE7DD] bg-white shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 flex-1 min-w-0">
              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#BA954F] bg-[#FAF4EC] px-2.5 py-0.5 rounded-full border border-[#EDE3D4]">
                  <Briefcase className="h-3 w-3 text-[#BA954F]" />
                  {task.project?.name || 'Project'}
                </span>
                <PriorityBadge priority={task.priority} size="sm" />
                <StatusBadge status={task.status} size="sm" />
                {task.clientApprovalStatus === 'INTERNAL_REVIEW' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF2E6] text-[#946B2D] border border-[#E8DCC8]">
                    Pending Admin Review
                  </span>
                )}
                {task.clientApprovalStatus === 'PENDING' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF2E6] text-[#946B2D] border border-[#E8DCC8]">
                    Awaiting Client Sign-Off
                  </span>
                )}
                {task.clientApprovalStatus === 'APPROVED' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD]">
                    Client Approved
                  </span>
                )}
                {task.dueDate && (
                  <DeadlineCountdownBadge dueDate={task.dueDate} status={task.status} size="sm" />
                )}
              </div>

              {/* Title */}
              <h2 className="text-base sm:text-xl font-bold text-[#1C1917] leading-snug">
                {task.title}
              </h2>

              {/* Meta Row: Assignee and Due Date */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#78716C] pt-0.5">
                <div className="flex items-center gap-1.5">
                  <img
                    src={
                      task.assignedTo?.profileImage ||
                      `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                        task.assignedTo?.name || 'Assignee'
                      )}`
                    }
                    alt={task.assignedTo?.name || 'Assignee'}
                    className="h-5 w-5 rounded-full border border-[#DFD5C6] object-cover"
                  />
                  <span className="font-semibold text-[#1C1917]">
                    {task.assignedTo?.name || 'Unassigned'}
                  </span>
                </div>

                {task.dueDate && (
                  <div className="flex items-center gap-1 font-mono text-[#78716C]">
                    <Calendar className="h-3.5 w-3.5 text-[#BA954F]" />
                    <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                  </div>
                )}

                {task.updatedAt && (
                  <div className="flex items-center gap-1 text-[11px] text-[#A8A29E]">
                    <Clock className="h-3 w-3" />
                    <span>Updated {new Date(task.updatedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] border border-transparent hover:border-[#EDE7DD] transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 bg-[#FCFBF8]/40 divide-y divide-[#F5EFE6]">
          {/* Action Bar (Top CTAs for Team Member / Admin) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#8C7E72] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#BA954F]" />
                Task Actions & Tools
              </span>
              {isAdminOrSuper && onEditTask && (
                <button
                  type="button"
                  onClick={() => onEditTask(task)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#78716C] hover:text-[#BA954F] transition-colors cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit Task Details
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* 1. Focus Timer CTA (for internal team / admins) */}
              {!isClient && onStartTimer && (
                <button
                  type="button"
                  onClick={() => onStartTimer(task)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#FAF4EC] hover:bg-[#F5EBDD] text-[#BA954F] border border-[#EDE3D4] transition-all cursor-pointer shadow-2xs hover:shadow-xs group"
                  title="Run interactive LeetCode-style countdown timer with alarm"
                >
                  <Timer className="h-4 w-4 text-[#BA954F] group-hover:rotate-12 transition-transform" />
                  <span>Start Focus Timer (Alarm)</span>
                </button>
              )}

              {/* 2. Submit Task with Proof CTA (for team members / assignee) */}
              {!isClient && onSubmitTask && isAssignee && task.status !== 'COMPLETED' && (
                <button
                  type="button"
                  onClick={() => onSubmitTask(task)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#BA954F] hover:bg-[#A17B2F] text-white shadow-xs transition-all cursor-pointer btn-hover-lift"
                  title="Submit completed work with proof & deliverable link"
                >
                  <Send className="h-4 w-4" />
                  <span>Submit Deliverable for Internal Review</span>
                </button>
              )}

              {/* 3. Delay explanation button if overdue */}
              {!isClient && onExplainDelay && isOverdue && isAssignee && (
                <button
                  type="button"
                  onClick={() => onExplainDelay(task)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-[#B91C1C] hover:text-[#991B1B] bg-[#FDF2F0] hover:bg-[#FBE8E6] border border-[#F5D5D0] transition-colors cursor-pointer"
                  title="Submit or update overdue reason to Admin"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>{task.overdueReason ? 'Update Overdue Reason' : 'Explain Delay to Admin'}</span>
                </button>
              )}

              {/* 4. Quick status selector for internal staff */}
              {!isClient && onStatusChange && (
                <div className="flex items-center gap-2 bg-white border border-[#DFD5C6] rounded-xl px-3 py-1.5 shadow-2xs">
                  <span className="text-xs font-semibold text-[#78716C] whitespace-nowrap">Status:</span>
                  <select
                    value={task.status}
                    onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                    disabled={isTeamMember && (task.status === 'REVIEW' || task.status === 'COMPLETED')}
                    className="w-full text-xs font-semibold bg-transparent text-[#1C1917] focus:outline-none cursor-pointer disabled:opacity-60"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="REVIEW">In Review</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="REVISION_REQUESTED">Revision Requested</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section: Task Instructions / What to do */}
          <div className="pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917] uppercase tracking-wider">
              <Info className="h-4 w-4 text-[#BA954F]" />
              What to do / Task Instructions
            </div>
            <div className="bg-white border border-[#EDE7DD] rounded-2xl p-4 sm:p-5 shadow-xs">
              <p className="text-xs sm:text-sm text-[#3E3832] leading-relaxed whitespace-pre-wrap font-normal">
                {task.description?.trim() ? task.description : 'No specific description provided for this task.'}
              </p>
            </div>
          </div>

          {/* Overdue Delay Reason Banner (if exists) */}
          {task.overdueReason && (
            <div className="pt-4">
              <div className="p-4 rounded-2xl bg-[#FDF2F0] border border-[#F5D5D0] text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-[#B91C1C]">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Overdue Delay Reason ({task.assignedTo?.name || 'Assignee'})
                </div>
                <p className="text-[#7F1D1D] italic text-xs sm:text-sm pl-5 leading-relaxed">
                  &ldquo;{task.overdueReason}&rdquo;
                </p>
              </div>
            </div>
          )}

          {/* Revision Request Banner (if revision requested) */}
          {isRevisionRequested && task.revisionRequest && (
            <div className="pt-4">
              <div className="p-4 bg-[#FDF2F0] border border-[#F5D5D0] rounded-2xl space-y-2 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#B91C1C] uppercase tracking-wider flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 text-[#B91C1C]" />
                    Client Revision Feedback
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF2E6] text-[#946B2D] border border-[#E8DCC8]">
                    {task.revisionRequest.priority || 'NORMAL'} Priority
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#7F1D1D] leading-relaxed font-normal">
                  {task.revisionRequest.feedback}
                </p>
                {task.revisionRequest.targetDate && (
                  <p className="text-[11px] text-[#991B1B] font-mono font-semibold">
                    Target Revision Date: {new Date(task.revisionRequest.targetDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Submitted Work & Proof Details */}
          {isSubmitted && (
            <div className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-[#2D6A4F]" />
                  Submitted Work & Proof of Deliverable
                </span>
                {task.submittedAt && (
                  <span className="text-[11px] text-[#78716C] font-mono">
                    Submitted {formatTime(task.submittedAt)}
                  </span>
                )}
              </div>

              <div className="p-4 sm:p-5 bg-white border border-[#EDE7DD] rounded-2xl space-y-3 text-xs sm:text-sm text-[#1C1917] shadow-xs">
                {task.submissionDescription && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8C7E72] block mb-1">
                      Completion Summary:
                    </span>
                    <p className="text-xs sm:text-sm text-[#443B30] bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE7DD] whitespace-pre-wrap">
                      {task.submissionDescription}
                    </p>
                  </div>
                )}

                {task.proofDetails && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#8C7E72] block mb-1">
                      Proof of Work:
                    </span>
                    <p className="text-xs sm:text-sm text-[#443B30] bg-[#FAF7F2] p-3 rounded-xl border border-[#EDE7DD] whitespace-pre-wrap">
                      {task.proofDetails}
                    </p>
                  </div>
                )}

                {task.deliverableUrl && (
                  <div className="pt-1">
                    <a
                      href={task.deliverableUrl.startsWith('http') ? task.deliverableUrl : `https://${task.deliverableUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#BA954F] hover:text-[#A17B2F] bg-[#FAF4EC] hover:bg-[#F5EFE6] border border-[#EDE3D4] rounded-xl transition-colors cursor-pointer shadow-2xs"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Deliverable Asset / Link</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Admin Internal Review Action Panel (For Admins / Super Admin) */}
          {isAdminOrSuper && task.clientApprovalStatus === 'INTERNAL_REVIEW' && (
            <div className="pt-4 space-y-3">
              <div className="p-4 rounded-2xl bg-[#FAF4EC] border-2 border-[#BA954F]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#BA954F] uppercase tracking-wider flex items-center gap-1.5">
                    <FileCheck2 className="h-4 w-4" />
                    Internal Admin Review Required
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF2E6] text-[#946B2D] border border-[#E8DCC8] uppercase tracking-wider">
                    Internal Verification
                  </span>
                </div>
                <p className="text-xs text-[#443B30] leading-relaxed">
                  The team member submitted this deliverable for internal quality review. When verified, approve and forward it to the client for final sign-off.
                </p>
                <div>
                  <button
                    type="button"
                    onClick={handleAdminApprove}
                    disabled={isApproving}
                    className="px-5 py-2.5 bg-[#BA954F] hover:bg-[#A17B2F] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer btn-hover-lift inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isApproving ? 'Forwarding...' : 'Approve & Send to Client for Sign-Off'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Client Approval / Rejection Action Panel (For Clients) */}
          {isClient && (
            <div className="pt-4 space-y-3">
              <span className="text-xs font-bold text-[#8C7E72] uppercase tracking-wider block">
                Client Review & Sign-Off
              </span>
              {task.clientApprovalStatus === 'INTERNAL_REVIEW' ? (
                <div className="p-4 rounded-xl bg-[#FAF4EC] border border-[#EDE3D4] text-xs text-[#946B2D] flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 text-[#BA954F] shrink-0" />
                  <span>The deliverable is currently undergoing internal review by the studio lead.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isApproving || !canApprove}
                  title={!isSubmitted ? 'Task must be submitted before approval' : undefined}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    isAlreadyApproved
                      ? 'bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD] cursor-default'
                      : !canApprove
                      ? 'bg-[#FAF7F2] text-[#A8A29E] border border-[#EDE7DD] cursor-default'
                      : 'bg-[#BA954F] hover:bg-[#A17B2F] text-white shadow-xs btn-hover-lift'
                  } disabled:opacity-60`}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {isAlreadyApproved
                    ? 'Approved'
                    : isApproving
                    ? 'Approving...'
                    : !isSubmitted
                    ? 'Not Submitted'
                    : 'Approve Task'}
                </button>
                <button
                  type="button"
                  onClick={() => onRequestChanges?.(task)}
                  disabled={isAlreadyApproved || isRevisionRequested || !isSubmitted || task.status !== 'REVIEW' || !onRequestChanges}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-white hover:bg-[#FDF2F0] text-[#B91C1C] border border-[#F5D5D0] transition-all cursor-pointer btn-hover-lift disabled:opacity-40 disabled:cursor-default"
                >
                  <RefreshCw className="h-4 w-4 shrink-0" />
                  {isRevisionRequested ? 'Revision Requested' : 'Request Changes'}
                </button>
              </div>
              )}
            </div>
          )}

          {/* Collaboration / Discussion Comments Feed */}
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                <MessageSquare className="h-4 w-4 text-[#BA954F]" />
                Task Discussion Feed
              </div>
              {!loadingComments && (
                <span className="text-[11px] font-semibold text-[#78716C] bg-[#FAF7F2] border border-[#EDE7DD] px-2.5 py-0.5 rounded-full">
                  {comments.length} {comments.length === 1 ? 'Message' : 'Messages'}
                </span>
              )}
            </div>

            {/* Comments List */}
            <div className="space-y-3">
              {loadingComments ? (
                <div className="text-xs text-[#78716C] font-medium text-center py-4">Loading messages...</div>
              ) : comments.length === 0 ? (
                <div className="text-xs text-[#A8A29E] font-medium text-center py-5 bg-white border border-[#EDE7DD] rounded-2xl">
                  No comments on this task yet. Leave notes or ask questions below.
                </div>
              ) : (
                comments.map((comment) => {
                  const isMe = comment.userId === user?.id;
                  const avatarSrc =
                    comment.user?.profileImage ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                      comment.user?.name || 'User'
                    )}`;

                  return (
                    <div
                      key={comment.id}
                      className={`flex items-end gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <img
                        src={avatarSrc}
                        alt={comment.user?.name}
                        className="h-8 w-8 rounded-full border border-[#DFD5C6] object-cover shrink-0 shadow-2xs"
                      />
                      <div className={`max-w-[80%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[11px] font-bold text-[#1C1917]">
                            {isMe ? 'You' : comment.user?.name}
                          </span>
                          {comment.user?.role && (
                            <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
                              {comment.user.role.replace('_', ' ')}
                            </span>
                          )}
                          <span className="text-[10px] text-[#A8A29E] font-mono">
                            {formatTime(comment.createdAt)}
                          </span>
                        </div>
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed shadow-2xs ${
                            isMe
                              ? 'bg-[#BA954F] text-white rounded-br-xs'
                              : 'bg-white text-[#1C1917] border border-[#EDE7DD] rounded-bl-xs'
                          }`}
                        >
                          {comment.content}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="flex items-end gap-2 pt-2">
              <img
                src={
                  user?.profileImage ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'Me')}`
                }
                alt={user?.name}
                className="h-8 w-8 rounded-full border border-[#DFD5C6] object-cover shrink-0 shadow-2xs"
              />
              <div className="flex-1 flex items-end gap-2 bg-white border border-[#DFD5C6] rounded-2xl px-3.5 py-2 focus-within:ring-2 focus-within:ring-[#BA954F]/20 focus-within:border-[#BA954F] transition-all shadow-2xs">
                <textarea
                  rows={1}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (commentText.trim()) handlePostComment(e as any);
                    }
                  }}
                  placeholder="Type a message or note regarding this task... (Enter to send)"
                  className="flex-1 bg-transparent text-xs text-[#1C1917] placeholder-[#A8A29E] resize-none focus:outline-none leading-relaxed font-normal"
                  style={{ minHeight: '22px', maxHeight: '90px' }}
                />
                <button
                  type="submit"
                  disabled={isPosting || !commentText.trim()}
                  className="p-1.5 text-white bg-[#BA954F] hover:bg-[#A17B2F] disabled:opacity-40 rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Send Message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export const TaskDetailModal = ClientTaskDetailModal;
