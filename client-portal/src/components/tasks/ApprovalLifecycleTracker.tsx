import React from 'react';
import { Task } from '../../types';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Send,
  FileCheck2,
  Info,
} from 'lucide-react';

interface ApprovalLifecycleTrackerProps {
  task: Task;
  compact?: boolean;
}

export const ApprovalLifecycleTracker: React.FC<ApprovalLifecycleTrackerProps> = ({
  task,
  compact = false,
}) => {
  const isSubmitted = Boolean(task.submittedAt);
  const status = task.clientApprovalStatus;
  const isInternalReview = status === 'INTERNAL_REVIEW';
  const isPendingClient = status === 'PENDING';
  const isClientApproved = status === 'APPROVED';
  const isRejectedOrRevision =
    status === 'REJECTED' ||
    task.status === 'REVISION_REQUESTED' ||
    Boolean(task.revisionRequest);

  const hasAdminApproved =
    Boolean(task.adminApprovedAt) ||
    Boolean(task.adminApprovedBy) ||
    isPendingClient ||
    isClientApproved ||
    (isRejectedOrRevision && status === 'REJECTED' && !isInternalReview);

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Status Banner */}
      <div className="p-4 rounded-2xl bg-white border border-[#EDE7DD] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] shrink-0">
            <FileCheck2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#78716C]">
              Deliverable Approval Workflow
            </div>
            <div className="text-sm font-bold text-[#1C1917] mt-0.5">
              {!isSubmitted ? (
                'Deliverable Not Yet Submitted'
              ) : isInternalReview ? (
                'Step 1 of 2: Awaiting Studio Admin Internal Review'
              ) : isPendingClient ? (
                'Step 2 of 2: Admin Approved → Waiting for Client Sign-Off'
              ) : isClientApproved ? (
                'Completed: Fully Approved by Client'
              ) : isRejectedOrRevision ? (
                'Action Required: Client Requested Changes / Revision'
              ) : (
                'Deliverable In Review'
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {hasAdminApproved ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD]">
              <ShieldCheck className="h-3.5 w-3.5" /> Admin Approved
            </span>
          ) : isInternalReview ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FAF2E6] text-[#946B2D] border border-[#E8DCC8]">
              <Clock className="h-3.5 w-3.5" /> Admin Review Pending
            </span>
          ) : null}

          {isClientApproved ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD]">
              <UserCheck className="h-3.5 w-3.5" /> Client Approved
            </span>
          ) : isPendingClient ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
              <Clock className="h-3.5 w-3.5" /> Client Sign-Off Pending
            </span>
          ) : isRejectedOrRevision ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#FDF2F0] text-[#B91C1C] border border-[#F5D5D0]">
              <RefreshCw className="h-3.5 w-3.5" /> Changes Requested
            </span>
          ) : null}
        </div>
      </div>

      {/* 3-Step Lifecycle Stepper Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1: Submission */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isSubmitted
              ? 'bg-white border-[#D1E7DD] shadow-xs'
              : 'bg-[#FAF7F2] border-[#EDE7DD] opacity-75'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
              Stage 1: Deliverable
            </span>
            {isSubmitted ? (
              <span className="p-1 rounded-full bg-[#F0F7F2] text-[#2D6A4F]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            ) : (
              <span className="p-1 rounded-full bg-[#EDE7DD] text-[#78716C]">
                <Clock className="h-4 w-4" />
              </span>
            )}
          </div>
          <h4 className="text-xs font-bold text-[#1C1917]">
            {isSubmitted ? 'Deliverable Submitted' : 'Not Submitted'}
          </h4>
          <p className="text-[11px] text-[#78716C] mt-1 line-clamp-2">
            {isSubmitted
              ? `Submitted by ${task.assignedTo?.name || 'Team Member'}${
                  task.submittedAt ? ` on ${formatDateTime(task.submittedAt)}` : ''
                }.`
              : 'Team member has not submitted work for review yet.'}
          </p>
          {task.deliverableUrl && (
            <a
              href={
                task.deliverableUrl.startsWith('http')
                  ? task.deliverableUrl
                  : `https://${task.deliverableUrl}`
              }
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#BA954F] hover:underline mt-2.5"
            >
              <ExternalLink className="h-3 w-3" /> View Deliverable
            </a>
          )}
        </div>

        {/* Step 2: Internal / Studio Admin Review */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            hasAdminApproved
              ? 'bg-white border-[#D1E7DD] shadow-xs'
              : isInternalReview
              ? 'bg-[#FAF4EC] border-[#BA954F]/40 shadow-xs ring-1 ring-[#BA954F]/20'
              : 'bg-[#FAF7F2] border-[#EDE7DD] opacity-75'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
              Stage 2: Studio Admin Review
            </span>
            {hasAdminApproved ? (
              <span className="p-1 rounded-full bg-[#F0F7F2] text-[#2D6A4F]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            ) : isInternalReview ? (
              <span className="p-1 rounded-full bg-[#FAF2E6] text-[#946B2D] animate-pulse">
                <Clock className="h-4 w-4" />
              </span>
            ) : (
              <span className="p-1 rounded-full bg-[#EDE7DD] text-[#78716C]">
                <Clock className="h-4 w-4" />
              </span>
            )}
          </div>
          <h4 className="text-xs font-bold text-[#1C1917]">
            {hasAdminApproved
              ? 'Admin Approved & Forwarded'
              : isInternalReview
              ? 'Pending Studio Verification'
              : 'Waiting for Submission'}
          </h4>
          <p className="text-[11px] text-[#78716C] mt-1 leading-relaxed">
            {hasAdminApproved
              ? `Verified & approved by ${
                  task.adminApprovedBy?.name || 'Studio Admin'
                }${
                  task.adminApprovedAt
                    ? ` on ${formatDateTime(task.adminApprovedAt)}`
                    : ''
                }. Forwarded to client for sign-off.`
              : isInternalReview
              ? 'Deliverable submitted. Awaiting Studio Admin approval before sending to client.'
              : 'Will be reviewed by Studio Admin once submitted.'}
          </p>
        </div>

        {/* Step 3: Client Approval */}
        <div
          className={`p-4 rounded-2xl border transition-all ${
            isClientApproved
              ? 'bg-white border-[#D1E7DD] shadow-xs'
              : isRejectedOrRevision
              ? 'bg-[#FDF2F0] border-[#F5D5D0] shadow-xs ring-1 ring-[#B91C1C]/20'
              : isPendingClient
              ? 'bg-[#FAF4EC] border-[#BA954F]/40 shadow-xs'
              : 'bg-[#FAF7F2] border-[#EDE7DD] opacity-75'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C]">
              Stage 3: Client Sign-Off
            </span>
            {isClientApproved ? (
              <span className="p-1 rounded-full bg-[#F0F7F2] text-[#2D6A4F]">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            ) : isRejectedOrRevision ? (
              <span className="p-1 rounded-full bg-[#FDF2F0] text-[#B91C1C]">
                <RefreshCw className="h-4 w-4" />
              </span>
            ) : isPendingClient ? (
              <span className="p-1 rounded-full bg-[#FAF4EC] text-[#BA954F] animate-pulse">
                <Clock className="h-4 w-4" />
              </span>
            ) : (
              <span className="p-1 rounded-full bg-[#EDE7DD] text-[#78716C]">
                <Clock className="h-4 w-4" />
              </span>
            )}
          </div>
          <h4 className="text-xs font-bold text-[#1C1917]">
            {isClientApproved
              ? 'Client Approved (Sign-Off Done)'
              : isRejectedOrRevision
              ? 'Changes Requested'
              : isPendingClient
              ? 'Awaiting Client Review'
              : 'Not Yet Sent to Client'}
          </h4>
          <p className="text-[11px] text-[#78716C] mt-1 leading-relaxed">
            {isClientApproved
              ? `Client approved the deliverable${
                  task.reviewedAt ? ` on ${formatDateTime(task.reviewedAt)}` : ''
                }. Task is complete.`
              : isRejectedOrRevision
              ? 'Client reviewed and requested changes / revisions.'
              : isPendingClient
              ? 'Deliverable is with the client. Waiting for client approval or feedback.'
              : 'Waiting for Admin verification before sending to client.'}
          </p>
        </div>
      </div>

      {/* Changes & Re-Request Status Box */}
      <div
        className={`p-4 rounded-2xl border text-xs space-y-2 ${
          isRejectedOrRevision
            ? 'bg-[#FDF2F0] border-[#F5D5D0]'
            : isClientApproved
            ? 'bg-[#F0F7F2] border-[#D1E7DD]'
            : 'bg-white border-[#EDE7DD]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold">
            {isRejectedOrRevision ? (
              <>
                <RefreshCw className="h-4 w-4 text-[#B91C1C] animate-spin-slow" />
                <span className="text-[#B91C1C]">
                  Changes Requested / Re-Request Active: YES
                </span>
              </>
            ) : isClientApproved ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-[#2D6A4F]" />
                <span className="text-[#2D6A4F]">
                  Changes Requested: NO (Clean Approval)
                </span>
              </>
            ) : (
              <>
                <Info className="h-4 w-4 text-[#BA954F]" />
                <span className="text-[#1C1917]">
                  Changes / Re-Request Status: No changes requested so far
                </span>
              </>
            )}
          </div>

          {isRejectedOrRevision && task.revisionRequest?.priority && (
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#FAF2E6] text-[#946B2D] border border-[#E8DCC8]">
              {task.revisionRequest.priority} Priority
            </span>
          )}
        </div>

        {isRejectedOrRevision ? (
          <div className="space-y-2 pt-1">
            <div className="p-3 bg-white/90 rounded-xl border border-[#F5D5D0] space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C] block">
                Client Revision Instructions:
              </span>
              <p className="text-xs text-[#7F1D1D] leading-relaxed whitespace-pre-wrap">
                {task.revisionRequest?.feedback ||
                  task.clientReviewComments ||
                  'Please review and update the deliverable as requested by the client.'}
              </p>
            </div>

            {task.revisionRequest?.targetDate && (
              <div className="text-[11px] font-mono font-semibold text-[#991B1B]">
                Target Completion Date:{' '}
                {new Date(task.revisionRequest.targetDate).toLocaleDateString()}
              </div>
            )}

            <p className="text-[11px] text-[#78716C] italic">
              Action for Team Member: Please address the feedback above and re-submit your deliverable for internal approval.
            </p>
          </div>
        ) : isClientApproved ? (
          <p className="text-[11px] text-[#2D6A4F] leading-relaxed">
            Client has accepted and approved this task deliverable without requiring modifications.
          </p>
        ) : (
          <p className="text-[11px] text-[#78716C] leading-relaxed">
            Deliverable has not received any rejection or change requests.
          </p>
        )}
      </div>
    </div>
  );
};
