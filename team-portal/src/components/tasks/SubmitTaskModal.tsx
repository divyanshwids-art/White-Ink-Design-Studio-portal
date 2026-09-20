import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Task } from '../../types';
import { api } from '../../services/api';

interface SubmitTaskModalProps {
  task: Task;
  onClose: () => void;
  onSubmitted: () => void;
}

export const SubmitTaskModal: React.FC<SubmitTaskModalProps> = ({ task, onClose, onSubmitted }) => {
  const [submissionDescription, setSubmissionDescription] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!submissionDescription.trim()) {
      setError('Completion description is required.');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await api.submitTask(task.id, {
        submissionDescription: submissionDescription.trim(),
        deliverableUrl: deliverableUrl.trim() || undefined,
      });
      onSubmitted();
    } catch (err: any) {
      setError(err.message || 'Unable to submit task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Submit for Internal Review" subtitle="Submit this completed task for admin review and verification." maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-lg bg-gold-50 border border-gold-200 text-xs font-semibold text-black/75">
          Submitting deliverable for &quot;{task.title}&quot;. Once submitted, the Admin will review the deliverable before sending to the client.
        </div>
        {error && <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm font-semibold text-rose-700">{error}</div>}
        <label className="block text-xs font-bold uppercase tracking-wider text-black">
          Completion Description <span className="text-gold-700">*</span>
          <textarea required rows={4} value={submissionDescription} onChange={(e) => setSubmissionDescription(e.target.value)} placeholder="Describe what was completed and how it meets the task requirements." className="mt-1.5 w-full px-3.5 py-2 text-sm font-medium normal-case tracking-normal border border-gold-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-500" />
        </label>
        <label className="block text-xs font-bold uppercase tracking-wider text-black">
          Deliverable URL <span className="text-black/40 font-medium normal-case tracking-normal">(optional)</span>
          <input type="url" value={deliverableUrl} onChange={(e) => setDeliverableUrl(e.target.value)} placeholder="https://..." className="mt-1.5 w-full px-3.5 py-2 text-sm font-medium normal-case tracking-normal border border-gold-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gold-500" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold border border-gold-300 rounded-lg hover:bg-gold-50 cursor-pointer">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-xs font-bold bg-gold-500 border border-gold-600 rounded-lg hover:bg-gold-600 disabled:opacity-50 cursor-pointer">{isSubmitting ? 'Submitting...' : 'Submit for Internal Review'}</button>
        </div>
      </form>
    </Modal>
  );
};