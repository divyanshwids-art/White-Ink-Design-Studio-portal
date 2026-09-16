import React, { useState } from 'react';
import { Task } from '../../types';
import { api } from '../../services/api';
import {
  AlertTriangle,
  X,
  Send,
  Clock,
  CheckCircle2,
  FileText,
  Sparkles,
} from 'lucide-react';

interface TaskOverdueReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSuccess?: () => void;
}

const PRESET_REASONS = [
  'Awaiting client feedback / asset approvals',
  'Complex revision iteration required',
  'Technical dependency / design refinement',
  'Reprioritized by management for higher urgent deliverable',
  'Site survey / vendor clarification pending',
];

export const TaskOverdueReasonModal: React.FC<TaskOverdueReasonModalProps> = ({
  isOpen,
  onClose,
  task,
  onSuccess,
}) => {
  const [reason, setReason] = useState(task?.overdueReason || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  if (!isOpen || !task) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason explaining why the task deadline was delayed.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.submitTaskOverdueReason(task.id, reason.trim());
      setSubmittedSuccess(true);
      setTimeout(() => {
        setSubmittedSuccess(false);
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit delay explanation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not set';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-gold-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-[#EDE7DD] shadow-2xl overflow-hidden flex flex-col animate-gold-scale-up">
        {/* Header */}
        <div className="p-5 bg-[#FAF7F2] border-b border-[#EDE7DD] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#FDF2F0] text-[#B91C1C] border border-[#F5D5D0]">
              <AlertTriangle className="h-5 w-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1C1917]">
                Explain Task Delay
              </h3>
              <p className="text-xs text-[#78716C]">
                Deadline passed: <span className="font-semibold text-[#B91C1C]">{formattedDueDate}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#78716C] hover:text-[#1C1917] hover:bg-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-[#FDF2F0] border border-[#F5D5D0] rounded-xl text-xs text-[#B91C1C] font-semibold">
              {error}
            </div>
          )}

          {submittedSuccess ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#F0F7F2] text-[#2D6A4F] border border-[#D1E7DD] flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-[#1C1917]">Delay Explanation Recorded</h4>
              <p className="text-xs text-[#78716C]">Studio Administrators have been notified.</p>
            </div>
          ) : (
            <>
              {/* Task Details Banner */}
              <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#EDE7DD] space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#BA954F]">
                  {task.project?.name || 'Assigned Task'}
                </div>
                <div className="text-sm font-bold text-[#1C1917]">
                  {task.title}
                </div>
                {task.description && (
                  <div className="text-xs text-[#78716C] line-clamp-2">
                    {task.description}
                  </div>
                )}
              </div>

              {/* Quick Preset Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#78716C]">
                  Quick Reason Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReason(preset)}
                      className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all text-left cursor-pointer ${
                        reason === preset
                          ? 'bg-[#BA954F] border-[#BA954F] text-white font-semibold'
                          : 'bg-white border-[#DFD5C6] text-[#443B30] hover:bg-[#FAF7F2]'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Reason Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#1C1917] flex items-center justify-between">
                  <span>Detailed Explanation / Blocker <span className="text-[#B91C1C]">*</span></span>
                  <span className="text-[11px] text-[#78716C] font-normal">Sent to Admin</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain what caused the delay and next action steps..."
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] font-medium placeholder-[#A8A29E] focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-[#78716C] hover:text-[#1C1917] bg-transparent hover:bg-[#FAF7F2] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !reason.trim()}
                  className="btn-gold-primary px-5 py-2 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Explanation'}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
