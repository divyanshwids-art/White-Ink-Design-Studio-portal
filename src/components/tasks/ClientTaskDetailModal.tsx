import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Task, Comment } from '../../types';
import { api } from '../../services/api';
import {
  X,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Send,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';

interface ClientTaskDetailModalProps {
  task: Task;
  onClose: () => void;
  onApproved: () => void;
  onRequestChanges: (task: Task) => void;
}

export const ClientTaskDetailModal: React.FC<ClientTaskDetailModalProps> = ({
  task,
  onClose,
  onApproved,
  onRequestChanges,
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const data = await api.getTaskComments(task.id);
      setComments(data);
    } catch {
      // silently fail
    } finally {
      setLoadingComments(false);
    }
  }, [task.id]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

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
    setIsApproving(true);
    try {
      await api.approveTask(task.id);
      onApproved();
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
  const hasSubmissionDetails = Boolean(task.submissionDescription?.trim()) && Boolean(task.proofDetails?.trim());
  const canApprove =
    isSubmitted &&
    hasSubmissionDetails &&
    task.status === 'REVIEW' &&
    task.clientApprovalStatus === 'PENDING';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gold-300 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gold-200 shrink-0">
          <div className="space-y-1 pr-4">
            <h2 className="text-base font-extrabold text-black leading-snug">{task.title}</h2>
            {task.dueDate && (
              <div className="flex items-center gap-1.5 text-xs text-black/60 font-semibold">
                <Calendar className="h-3.5 w-3.5 text-gold-600" />
                {new Date(task.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-black/50 hover:text-black hover:bg-gold-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Revision Request Banner — shown to client when they've already requested changes */}
          {isRevisionRequested && task.revisionRequest && (
            <div className="mx-5 mt-5 p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Revision Requested</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  task.revisionRequest.priority === 'HIGH'
                    ? 'bg-rose-100 text-rose-700 border-rose-300'
                    : task.revisionRequest.priority === 'LOW'
                    ? 'bg-gold-100 text-black border-gold-300'
                    : 'bg-amber-100 text-amber-700 border-amber-300'
                }`}>
                  {task.revisionRequest.priority} Priority
                </span>
              </div>
              <p className="text-xs text-amber-900 font-medium leading-relaxed">{task.revisionRequest.feedback}</p>
              {task.revisionRequest.targetDate && (
                <p className="text-[11px] text-amber-700 font-semibold">
                  Target: {new Date(task.revisionRequest.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div className="px-5 pt-5 pb-4 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-black uppercase tracking-wider">
              <span className="w-4 h-4 rounded-full bg-gold-400 flex items-center justify-center text-[9px] text-black font-black">i</span>
              Description
            </div>
            <p className="text-sm text-black/80 leading-relaxed">
              {task.description || 'No description provided for this task.'}
            </p>
          </div>

          {isSubmitted && (
            <div className="px-5 pb-4 space-y-2">
              <div className="text-xs font-bold text-black uppercase tracking-wider">Submitted work</div>
              <div className="p-3 bg-gold-50 border border-gold-200 rounded-xl space-y-2 text-sm text-black/80">
                <div><span className="font-bold text-black">Completion:</span> {task.submissionDescription}</div>
                <div><span className="font-bold text-black">Proof:</span> {task.proofDetails}</div>
                {task.deliverableUrl && <a href={task.deliverableUrl.startsWith('http') ? task.deliverableUrl : `https://${task.deliverableUrl}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-gold-800"><Send className="h-3 w-3" /> Open deliverable</a>}
                {task.submittedAt && <div className="text-xs text-black/55">Submitted {formatTime(task.submittedAt)}</div>}
              </div>
            </div>
          )}

          {/* Warning note if not submitted */}
          {!isSubmitted && task.status !== 'COMPLETED' && (
            <div className="mx-5 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>This task has not yet been submitted for approval by the assigned team member.</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-5 pb-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleApprove}
              disabled={isApproving || !canApprove}
              title={!isSubmitted ? 'Task must be submitted before approval' : undefined}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                isAlreadyApproved
                  ? 'bg-gold-200 text-black border border-gold-400 cursor-default'
                  : !canApprove
                  ? 'bg-gold-100 text-black/40 border border-gold-200 cursor-default'
                  : 'bg-black hover:bg-gold-500 text-gold-400 hover:text-black border border-gold-400/50 shadow-sm btn-hover-lift'
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
              onClick={() => onRequestChanges(task)}
              disabled={isAlreadyApproved || isRevisionRequested || !isSubmitted || task.status !== 'REVIEW'}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold bg-white hover:bg-gold-50 text-black border border-gold-400 transition-all cursor-pointer btn-hover-lift disabled:opacity-40 disabled:cursor-default"
            >
              <RefreshCw className="h-4 w-4 shrink-0" />
              {isRevisionRequested ? 'Pending Review' : 'Request Changes'}
            </button>
          </div>

          {/* Collaboration / Comments */}
          <div className="border-t border-gold-200 px-5 pt-4 pb-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm font-bold text-black">
                <MessageSquare className="h-4 w-4 text-gold-600" />
                Collaboration
              </div>
              {!loadingComments && (
                <span className="text-xs font-bold text-black/50 bg-gold-100 px-2 py-0.5 rounded-full">
                  {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
                </span>
              )}
            </div>

            {/* Comments list */}
            <div className="space-y-3">
              {loadingComments ? (
                <div className="text-xs text-black/40 font-medium text-center py-4">Loading...</div>
              ) : comments.length === 0 ? (
                <div className="text-xs text-black/40 font-medium text-center py-4">
                  No messages yet. Start the conversation!
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
                        className="h-8 w-8 rounded-full border border-gold-300 object-cover shrink-0"
                      />
                      <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                          <span className="text-[11px] font-bold text-black">
                            {isMe ? 'You' : comment.user?.name}
                          </span>
                          <span className="text-[10px] text-black/40 font-medium">
                            {formatTime(comment.createdAt)}
                          </span>
                        </div>
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                            isMe
                              ? 'bg-[#BA954F] text-white rounded-br-sm'
                              : 'bg-gold-100 text-black border border-gold-200 rounded-bl-sm'
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

            {/* New comment input */}
            <form onSubmit={handlePostComment} className="flex items-end gap-2 pt-1">
              <img
                src={
                  user?.profileImage ||
                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.name || 'Me')}`
                }
                alt={user?.name}
                className="h-8 w-8 rounded-full border border-gold-300 object-cover shrink-0"
              />
              <div className="flex-1 flex items-end gap-2 bg-gold-50 border border-gold-300 rounded-2xl px-3 py-2 focus-within:ring-1 focus-within:ring-gold-500 focus-within:border-gold-500 transition-all">
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
                  placeholder="Write a message..."
                  className="flex-1 bg-transparent text-xs text-black font-medium placeholder-black/40 resize-none focus:outline-none leading-relaxed"
                  style={{ minHeight: '20px', maxHeight: '80px' }}
                />
                <button
                  type="submit"
                  disabled={isPosting || !commentText.trim()}
                  className="p-1 text-gold-700 hover:text-black disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
