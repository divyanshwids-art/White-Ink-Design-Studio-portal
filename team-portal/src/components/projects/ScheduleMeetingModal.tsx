import React, { useState, useEffect } from 'react';
import { Meeting } from '../../types';
import { api } from '../../services/api';
import { X, Calendar, Clock, Video, AlertCircle, Loader2 } from 'lucide-react';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  initialMeeting?: Meeting | null;
  onMeetingSaved: (meeting: Meeting) => void;
}

export const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  initialMeeting,
  onMeetingSaved,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [attendeeEmails, setAttendeeEmails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialMeeting) {
        setTitle(initialMeeting.title);
        setDescription(initialMeeting.description || '');

        const start = new Date(initialMeeting.startTime);
        const end = new Date(initialMeeting.endTime);

        setDate(start.toISOString().split('T')[0]);
        setStartTime(
          `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`
        );
        setEndTime(
          `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
        );
        setAttendeeEmails('');
      } else {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        setTitle(`Discussion: ${projectName}`);
        setDescription(`Project discussion and sync for ${projectName}`);
        setDate(tomorrow.toISOString().split('T')[0]);
        setStartTime('11:00');
        setEndTime('12:00');
        setAttendeeEmails('');
      }
      setError(null);
    }
  }, [isOpen, initialMeeting, projectName]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Meeting title is required.');
      return;
    }
    if (!date) {
      setError('Meeting date is required.');
      return;
    }
    if (!startTime || !endTime) {
      setError('Start time and end time are required.');
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      setError('Invalid date or time format.');
      return;
    }

    if (endDateTime <= startDateTime) {
      setError('End time must be after start time.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const emails = attendeeEmails
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes('@'));

    try {
      if (initialMeeting) {
        const res = await api.updateProjectMeeting(projectId, initialMeeting.id, {
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        });
        onMeetingSaved(res.meeting);
      } else {
        const res = await api.createProjectMeeting(projectId, {
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          attendeeEmails: emails.length > 0 ? emails : undefined,
        });
        onMeetingSaved(res.meeting);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to save meeting:', err);
      setError(err.message || 'Failed to save meeting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-gold-300 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-gold-200 bg-gold-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gold-500/10 border border-gold-400 flex items-center justify-center text-gold-700">
              <Video className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">
                {initialMeeting ? 'Edit Meeting' : 'Schedule Project Meeting'}
              </h3>
              <p className="text-xs text-black/60 font-medium truncate max-w-xs">{projectName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-black/40 hover:text-black rounded-lg hover:bg-gold-100/60 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-black uppercase tracking-wider">
              Meeting Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Design Review & Milestone Sync"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gold-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-black font-medium transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-black uppercase tracking-wider">
              Description / Agenda
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda items, topics to discuss, or preparation notes..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-gold-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-black font-medium resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gold-600" />
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gold-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-black font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gold-600" />
                Start Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gold-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-black font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-gold-600" />
                End Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gold-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-black font-medium"
              />
            </div>
          </div>

          {!initialMeeting && (
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-black uppercase tracking-wider">
                Additional Attendee Emails (optional)
              </label>
              <input
                type="text"
                value={attendeeEmails}
                onChange={(e) => setAttendeeEmails(e.target.value)}
                placeholder="colleague@example.com, client@example.com"
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-white border border-gold-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-500 text-black font-medium"
              />
              <p className="text-[11px] text-black/50">
                Separate multiple emails with commas. The project client and your email are automatically invited.
              </p>
            </div>
          )}

          <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl flex items-center gap-2.5 text-[11px] text-amber-900 font-medium">
            <Video className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              A dynamic Google Meet link and Google Calendar invite will be generated automatically when Google Integration is connected.
            </span>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-black/70 hover:text-black bg-white border border-gold-300 hover:bg-gold-50 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 stroke-[2.2]" />
                  {initialMeeting ? 'Update Meeting' : 'Schedule Meeting'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
