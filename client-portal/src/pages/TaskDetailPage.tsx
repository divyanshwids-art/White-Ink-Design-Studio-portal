import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Task, Comment } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { DeadlineCountdownBadge } from '../components/tasks/DeadlineCountdownBadge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Send,
  ExternalLink,
  Briefcase,
  FileCheck,
  Check,
  XCircle,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface TaskDetailPageProps {
  taskId: string;
  onBack: () => void;
  onNavigate?: (path: string) => void;
}

export const TaskDetailPage: React.FC<TaskDetailPageProps> = ({
  taskId,
  onBack,
}) => {
  const { user } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client Review State
  const [isApproving, setIsApproving] = useState(false);
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [revisionPriority, setRevisionPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [revisionTargetDate, setRevisionTargetDate] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadTaskData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [allTasks, taskComments] = await Promise.all([
        api.getTasks(),
        api.getTaskComments(taskId).catch(() => []),
      ]);
      const found = allTasks.find((t) => t.id === taskId);
      if (found) {
        setTask(found);
      } else {
        setErrorMessage('Task not found or you do not have permission to view it.');
      }
      setComments(taskComments);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load task details.');
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    loadTaskData();
  }, [loadTaskData]);

  const handleApprove = async () => {
    if (!task) return;
    setIsApproving(true);
    setActionSuccess(null);
    try {
      await api.approveTask(task.id);
      setActionSuccess('Deliverable has been approved successfully!');
      await loadTaskData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve task.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRequestRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !revisionFeedback.trim()) return;
    setIsRequestingChanges(true);
    setActionSuccess(null);
    try {
      await api.submitRevisionRequest(task.id, {
        feedback: revisionFeedback,
        priority: revisionPriority,
        targetDate: revisionTargetDate || undefined,
        files: [],
      });
      setShowRevisionForm(false);
      setRevisionFeedback('');
      setActionSuccess('Revision request submitted to the studio team.');
      await loadTaskData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit revision request.');
    } finally {
      setIsRequestingChanges(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !commentText.trim()) return;
    setIsPostingComment(true);
    try {
      await api.addTaskComment(task.id, commentText.trim());
      setCommentText('');
      const updatedComments = await api.getTaskComments(task.id);
      setComments(updatedComments);
    } catch (err: any) {
      alert(err.message || 'Failed to post comment.');
    } finally {
      setIsPostingComment(false);
    }
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading deliverable details..." size="lg" />;
  }

  if (errorMessage || !task) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl border border-[#EDE7DD] shadow-xs text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-[#B91C1C] mx-auto" />
        <h2 className="text-lg font-bold text-[#1C1917]">Unable to load task</h2>
        <p className="text-xs text-[#78716C]">{errorMessage || 'Task not found.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const isApproved = task.clientApprovalStatus === 'APPROVED' || task.status === 'COMPLETED';
  const isReviewPending = task.status === 'REVIEW' || task.clientApprovalStatus === 'PENDING';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-gold-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#78716C] hover:text-[#1C1917] p-2 hover:bg-white rounded-xl transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Projects
        </button>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} size="sm" />
          <StatusBadge status={task.status} size="sm" />
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#166534] text-xs flex items-center gap-2 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[#16A34A]" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#78716C] mb-1.5 font-medium">
            <Briefcase className="h-3.5 w-3.5 text-[#BA954F]" />
            <span>{task.projectName || 'White Ink Studio Project'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
            {task.title}
          </h1>
          {task.dueDate && (
            <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-[#78716C]">
              <Calendar className="h-3.5 w-3.5 text-[#BA954F]" />
              <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
              <DeadlineCountdownBadge dueDate={task.dueDate} status={task.status} size="sm" />
            </div>
          )}
        </div>

        {task.description && (
          <div className="border-t border-[#F5EFE6] pt-4">
            <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider mb-2">
              Deliverable Scope & Instructions
            </h3>
            <p className="text-sm text-[#443B30] leading-relaxed whitespace-pre-wrap">
              {task.description}
            </p>
          </div>
        )}

        {/* Deliverable Proof / Files Section */}
        <div className="border-t border-[#F5EFE6] pt-5 space-y-3">
          <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
            <FileCheck className="h-4 w-4 text-[#BA954F]" />
            Studio Submission & Deliverables
          </h3>

          {task.deliverableUrl ? (
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE7DD] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-[#78716C] block">
                  Deliverable Link / Preview:
                </span>
                <a
                  href={task.deliverableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#BA954F] hover:underline flex items-center gap-1 truncate mt-0.5"
                >
                  {task.deliverableUrl}
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </a>
              </div>
              <a
                href={task.deliverableUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl transition-all shrink-0 inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                Open Deliverable <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EDE7DD] text-xs text-[#78716C] text-center">
              The design team is actively working on this deliverable. Files will appear here once submitted.
            </div>
          )}

          {task.submissionDescription && (
            <div className="p-4 rounded-xl bg-white border border-[#EDE7DD] text-xs text-[#443B30] space-y-1">
              <span className="font-bold text-[#1C1917] block">Designer Notes:</span>
              <p className="whitespace-pre-wrap">{task.submissionDescription}</p>
            </div>
          )}
        </div>

        {/* Client Review & Approval Actions */}
        <div className="border-t border-[#F5EFE6] pt-6 space-y-4">
          <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
            Review & Sign-Off
          </h3>

          {isApproved ? (
            <div className="p-4 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] flex items-center gap-3">
              <div className="p-2 rounded-full bg-[#DCFCE7] text-[#16A34A]">
                <Check className="h-5 w-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#166534]">Deliverable Approved</h4>
                <p className="text-xs text-[#15803D] mt-0.5">
                  This deliverable has been accepted and signed off.
                </p>
              </div>
            </div>
          ) : isReviewPending ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  disabled={isApproving}
                  onClick={handleApprove}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-[#2D6A4F] hover:bg-[#1B4332] rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs btn-hover-lift disabled:opacity-50"
                >
                  <Check className="h-4 w-4 stroke-[2]" />
                  {isApproving ? 'Approving...' : 'Approve & Sign Off'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRevisionForm(!showRevisionForm)}
                  className="px-4 py-2.5 text-xs font-semibold text-[#B91C1C] hover:text-white bg-[#FDF2F0] hover:bg-[#B91C1C] border border-[#F5D5D0] rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <XCircle className="h-4 w-4" />
                  {showRevisionForm ? 'Cancel Changes Request' : 'Request Revisions'}
                </button>
              </div>

              {showRevisionForm && (
                <form
                  onSubmit={handleRequestRevision}
                  className="p-5 rounded-2xl bg-[#FAF7F2] border border-[#EDE7DD] space-y-4 animate-gold-fade-in"
                >
                  <div>
                    <label className="block text-xs font-bold text-[#1C1917] mb-1">
                      Revision Feedback & Required Changes
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={revisionFeedback}
                      onChange={(e) => setRevisionFeedback(e.target.value)}
                      placeholder="Specify the adjustments or changes required..."
                      className="w-full p-3 text-xs bg-white border border-[#DFD5C6] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1C1917] mb-1">Priority</label>
                      <select
                        value={revisionPriority}
                        onChange={(e) => setRevisionPriority(e.target.value as any)}
                        className="w-full p-2.5 text-xs bg-white border border-[#DFD5C6] rounded-xl"
                      >
                        <option value="LOW">Low Priority</option>
                        <option value="MEDIUM">Medium Priority</option>
                        <option value="HIGH">High / Urgent</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#1C1917] mb-1">Target Date</label>
                      <input
                        type="date"
                        value={revisionTargetDate}
                        onChange={(e) => setRevisionTargetDate(e.target.value)}
                        className="w-full p-2 text-xs bg-white border border-[#DFD5C6] rounded-xl"
                      >
                      </input>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isRequestingChanges}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    {isRequestingChanges ? 'Sending Request...' : 'Submit Revision Request'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <p className="text-xs text-[#78716C]">
              This task is currently in <strong className="text-[#1C1917]">{task.status}</strong> stage. Review actions will be available once deliverables are submitted.
            </p>
          )}
        </div>
      </div>

      {/* Task Discussion / Comments */}
      <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-xs p-6 space-y-5">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#BA954F]" />
          <h3 className="text-sm font-bold text-[#1C1917]">Deliverable Discussion</h3>
          <span className="text-xs text-[#78716C] font-semibold">({comments.length})</span>
        </div>

        <div className="divide-y divide-[#F5EFE6]">
          {comments.length === 0 ? (
            <p className="text-xs text-[#78716C] py-4 text-center">
              No feedback comments yet. Write a message below to communicate directly with the team.
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="py-3.5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#1C1917]">
                    {comment.user?.name || (comment.userId === user?.id ? user?.name : 'Studio Member')}
                  </span>
                  <span className="text-[11px] text-[#78716C]">
                    {new Date(comment.createdAt).toLocaleDateString()}{' '}
                    {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-[#443B30] leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Add comment form */}
        <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2">
          <input
            type="text"
            required
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Type your feedback or note for the studio team..."
            className="flex-1 px-3.5 py-2.5 text-xs bg-white border border-[#DFD5C6] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
          />
          <button
            type="submit"
            disabled={isPostingComment}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};
