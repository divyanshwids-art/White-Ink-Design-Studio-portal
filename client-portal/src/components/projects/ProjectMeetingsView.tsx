import React, { useState, useEffect, useCallback } from 'react';
import { Meeting } from '../../types';
import { api } from '../../services/api';
import { ScheduleMeetingModal } from './ScheduleMeetingModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { LoadingSpinner } from '../common/LoadingSpinner';
import {
  Video,
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  CalendarCheck,
  RefreshCw,
} from 'lucide-react';

interface ProjectMeetingsViewProps {
  projectId: string;
  projectName: string;
  fallbackMeetingLink?: string | null;
  canManage: boolean;
  isClient: boolean;
}

export const ProjectMeetingsView: React.FC<ProjectMeetingsViewProps> = ({
  projectId,
  projectName,
  fallbackMeetingLink,
  canManage,
  isClient,
}) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [cancellingMeeting, setCancellingMeeting] = useState<Meeting | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Filter state: 'upcoming' | 'all'
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'all'>('upcoming');

  const loadMeetings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getProjectMeetings(projectId);
      setMeetings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load project meetings:', err);
      setError(err.message || 'Failed to load project meetings.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const handleMeetingSaved = (savedMeeting: Meeting) => {
    setMeetings((prev) => {
      const index = prev.findIndex((m) => m.id === savedMeeting.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = savedMeeting;
        return next;
      }
      return [savedMeeting, ...prev];
    });
    setFeedback({
      type: 'success',
      message: editingMeeting ? 'Meeting updated successfully.' : 'New meeting scheduled successfully.',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleConfirmCancel = async () => {
    if (!cancellingMeeting) return;
    setIsCancelling(true);
    try {
      const res = await api.cancelProjectMeeting(projectId, cancellingMeeting.id);
      setMeetings((prev) =>
        prev.map((m) => (m.id === cancellingMeeting.id ? { ...m, status: 'CANCELLED' as const } : m))
      );
      setFeedback({
        type: 'success',
        message: res.message || 'Meeting cancelled successfully.',
      });
      setTimeout(() => setFeedback(null), 4000);
      setCancellingMeeting(null);
    } catch (err: any) {
      console.error('Failed to cancel meeting:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to cancel meeting.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Format date helper
  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  // Format time range helper
  const formatTimeRange = (startIso: string, endIso: string) => {
    try {
      const s = new Date(startIso);
      const e = new Date(endIso);
      const startStr = s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const endStr = e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${startStr} – ${endStr}`;
    } catch {
      return `${startIso} – ${endIso}`;
    }
  };

  // Calculate duration in minutes/hours
  const formatDuration = (startIso: string, endIso: string) => {
    try {
      const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
      const diffMins = Math.round(diffMs / 60000);
      if (diffMins < 60) {
        return `${diffMins} mins`;
      }
      const hours = Math.floor(diffMins / 60);
      const remainingMins = diffMins % 60;
      return remainingMins > 0 ? `${hours} hr ${remainingMins} mins` : `${hours} hr${hours > 1 ? 's' : ''}`;
    } catch {
      return '';
    }
  };

  const isMeetingUpcoming = (meeting: Meeting) => {
    if (meeting.status === 'CANCELLED') return false;
    const end = new Date(meeting.endTime);
    return end.getTime() > Date.now();
  };

  const filteredMeetings = meetings.filter((m) => {
    if (activeFilter === 'upcoming') {
      return isMeetingUpcoming(m);
    }
    return true;
  });

  const upcomingCount = meetings.filter(isMeetingUpcoming).length;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-gold-300 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-black">Project Meetings & Syncs</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gold-100 text-gold-900 border border-gold-300 font-bold">
              {upcomingCount} Upcoming
            </span>
          </div>
          <p className="text-xs text-black/60 font-medium mt-0.5">
            Schedule and join Google Meet video discussions for {projectName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingMeeting(null);
                setIsScheduleModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-xl transition-colors shadow-xs cursor-pointer btn-hover-lift"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Schedule Meeting
            </button>
          )}

          <button
            type="button"
            onClick={loadMeetings}
            disabled={isLoading}
            className="p-2 text-black/60 hover:text-black bg-white hover:bg-gold-50 border border-gold-300 rounded-xl transition-colors cursor-pointer"
            title="Refresh meetings"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-rose-50 text-rose-900 border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-black/50 hover:text-black text-xs font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveFilter('upcoming')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeFilter === 'upcoming'
              ? 'bg-gold-500 text-black border border-gold-600 shadow-xs'
              : 'bg-white text-black/70 hover:text-black border border-gold-300 hover:bg-gold-50'
          }`}
        >
          Upcoming ({upcomingCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-gold-500 text-black border border-gold-600 shadow-xs'
              : 'bg-white text-black/70 hover:text-black border border-gold-300 hover:bg-gold-50'
          }`}
        >
          All Meetings ({meetings.length})
        </button>
      </div>

      {/* Content Body */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gold-300 p-12 text-center">
          <LoadingSpinner size="lg" />
          <p className="text-xs text-black/60 font-semibold mt-3">Loading project meetings...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl border border-rose-200 p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
            <AlertCircle className="h-5 w-5" />
          </div>
          <h4 className="text-sm font-bold text-black">Unable to load meetings</h4>
          <p className="text-xs text-black/60 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={loadMeetings}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-black bg-gold-400 hover:bg-gold-500 rounded-lg border border-gold-500 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try Again
          </button>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gold-300 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-gold-100/80 border border-gold-300 text-gold-700 mx-auto flex items-center justify-center">
            <CalendarCheck className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-black">
              {activeFilter === 'upcoming' ? 'No Upcoming Meetings' : 'No Meetings Scheduled Yet'}
            </h4>
            <p className="text-xs text-black/60 font-medium max-w-sm mx-auto mt-1">
              {activeFilter === 'upcoming'
                ? 'There are no active upcoming meetings for this project. Check "All Meetings" or schedule a new one.'
                : 'Plan design reviews, client catchups, and milestone sign-offs by scheduling a project meeting.'}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingMeeting(null);
                setIsScheduleModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-xl transition-colors shadow-xs cursor-pointer btn-hover-lift mt-2"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              Schedule First Meeting
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMeetings.map((meeting) => {
            const isUpcoming = isMeetingUpcoming(meeting);
            const durationText = formatDuration(meeting.startTime, meeting.endTime);
            const meetUrl = meeting.meetLink || fallbackMeetingLink;

            return (
              <div
                key={meeting.id}
                className={`bg-white rounded-xl border transition-all p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md ${
                  meeting.status === 'CANCELLED'
                    ? 'border-gray-300 bg-gray-50/40 opacity-75'
                    : isUpcoming
                    ? 'border-gold-300 hover:border-gold-400'
                    : 'border-gold-200 bg-stone-50/30'
                }`}
              >
                {/* Top: Status Badge + Actions */}
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {meeting.status === 'CANCELLED' ? (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                          Cancelled
                        </span>
                      ) : meeting.status === 'COMPLETED' || !isUpcoming ? (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                          Past
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          Upcoming
                        </span>
                      )}

                      {durationText && (
                        <span className="text-[10px] font-bold text-black/60 bg-gold-100/70 border border-gold-200 px-2 py-0.5 rounded-full">
                          {durationText}
                        </span>
                      )}
                    </div>

                    {canManage && meeting.status !== 'CANCELLED' && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMeeting(meeting);
                            setIsScheduleModalOpen(true);
                          }}
                          className="p-1.5 text-black/60 hover:text-black hover:bg-gold-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit meeting"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancellingMeeting(meeting)}
                          className="p-1.5 text-black/60 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Cancel meeting"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Title & Agenda */}
                  <div>
                    <h4 className="text-sm font-bold text-black leading-snug">{meeting.title}</h4>
                    {meeting.description && (
                      <p className="text-xs text-black/70 font-normal leading-relaxed mt-1 line-clamp-2">
                        {meeting.description}
                      </p>
                    )}
                  </div>

                  {/* Date & Time metadata */}
                  <div className="space-y-1.5 pt-2 border-t border-gold-100 text-xs text-black/80 font-medium">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-gold-600 shrink-0" />
                      <span>{formatDate(meeting.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gold-600 shrink-0" />
                      <span>{formatTimeRange(meeting.startTime, meeting.endTime)}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action: Join Meet */}
                <div className="pt-2 border-t border-gold-100 flex items-center justify-between gap-2">
                  {meeting.status === 'CANCELLED' ? (
                    <span className="text-xs text-black/40 font-medium italic">
                      This meeting has been cancelled.
                    </span>
                  ) : meetUrl ? (
                    <a
                      href={meetUrl.startsWith('http') ? meetUrl : `https://${meetUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-black bg-gold-400 hover:bg-gold-500 border border-gold-500 rounded-xl transition-all shadow-2xs hover:shadow-xs cursor-pointer w-full sm:w-auto justify-center"
                    >
                      <Video className="h-4 w-4 stroke-[2.2]" />
                      Join Google Meet
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-black/50 font-medium">
                      <Video className="h-3.5 w-3.5 text-gold-600" />
                      <span>Meet link will be shared prior to call</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule / Edit Modal */}
      <ScheduleMeetingModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setEditingMeeting(null);
        }}
        projectId={projectId}
        projectName={projectName}
        initialMeeting={editingMeeting}
        onMeetingSaved={handleMeetingSaved}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(cancellingMeeting)}
        onClose={() => setCancellingMeeting(null)}
        onConfirm={handleConfirmCancel}
        title="Cancel Meeting?"
        message={`Are you sure you want to cancel the meeting "${cancellingMeeting?.title}"? Google Calendar event and invitations will be cancelled.`}
        isLoading={isCancelling}
      />
    </div>
  );
};
