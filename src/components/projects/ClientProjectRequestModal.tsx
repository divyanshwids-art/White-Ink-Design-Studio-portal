import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { User } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  Briefcase,
  CheckCircle2,
  Calendar,
  Clock,
  Search,
  Check,
  ChevronDown,
  Video,
  ExternalLink,
  MailCheck,
} from 'lucide-react';

interface ClientProjectRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClientProjectRequestModal: React.FC<ClientProjectRequestModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [leadOwnerId, setLeadOwnerId] = useState('');
  const [preferredMeetingTime, setPreferredMeetingTime] = useState('');
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const isClient = user?.role === 'CLIENT' || user?.role === 'CLIENT_ADMIN';

  const [confirmationData, setConfirmationData] = useState<{
    message: string;
    meetingLink: string | null;
    meetingTime: string;
  } | null>(null);

  // Set default preferred meeting time to tomorrow at 10:00 AM
  const getDefaultMeetingTime = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    return new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setEstimatedBudget('');
      setLeadOwnerId('');
      setPreferredMeetingTime(getDefaultMeetingTime());
      setError(null);
      setConfirmationData(null);
      setMemberSearch('');
      setIsSearchOpen(false);

      api.getUsers()
        .then((users) => {
          const internal = users.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN');
          setTeamMembers(internal);
          if (internal.length > 0) setLeadOwnerId(internal[0].id);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const getMemberTitle = (m: User): string => {
    const titleMap: Record<string, string> = {
      'Alex Vance': 'Technical Director',
      'Sarah Connor': 'Operations Director',
      'David Kim': 'Full-Stack Architect',
      'Elena Rostova': 'Design Lead',
      'Marcus Chen': 'Project Manager',
    };
    if (titleMap[m.name]) return titleMap[m.name];
    if (m.role === 'SUPER_ADMIN') return 'Executive Lead';
    if (m.role === 'ADMIN') return 'Project Director';
    return 'Design Lead';
  };

  const filteredMembers = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    getMemberTitle(m).toLowerCase().includes(memberSearch.toLowerCase())
  );

  const selectedMember = teamMembers.find((m) => m.id === leadOwnerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!description.trim()) {
      setError('Project description is required.');
      return;
    }
    if (!startDate) {
      setError('Start date is required.');
      return;
    }
    if (!endDate) {
      setError('End date is required.');
      return;
    }
    if (!isClient && !leadOwnerId) {
      setError('Please assign a lead owner.');
      return;
    }
    if (!preferredMeetingTime) {
      setError('Preferred meeting time is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.createClientProjectRequest({
        name: name.trim(),
        description: description.trim(),
        startDate: new Date(startDate).toISOString(),
        dueDate: new Date(endDate).toISOString(),
        estimatedBudget: estimatedBudget ? Number(estimatedBudget) : undefined,
        ...(leadOwnerId ? { leadOwnerId } : {}),
        preferredMeetingTime: new Date(preferredMeetingTime).toISOString(),
      });

      setConfirmationData({
        message: res.message || 'Your project has been created and our team will reach out soon.',
        meetingLink: res.meetingLink,
        meetingTime: res.meetingTime,
      });

      // Allow 3 seconds to observe confirmation details, then trigger success
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 3500);
    } catch (err: any) {
      setError(err.message || 'Failed to submit project request.');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      maxWidth="2xl"
    >
      <div className="-mt-3">
        {/* Header matching mobile design */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-[26px] font-serif font-bold text-[#1B1917] tracking-tight">
            Add New Project
          </h2>
          <p className="text-xs sm:text-sm text-[#78716C] mt-1 font-normal leading-normal">
            Initialize a new client workspace and define project parameters.
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 p-3.5 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-xl font-medium flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Success confirmation banner */}
        {confirmationData && (
          <div className="mb-6 p-4 bg-[#F7F5EE] border border-[#C5B48B] rounded-xl space-y-3">
            <div className="flex items-start gap-2.5">
              <MailCheck className="h-5 w-5 text-[#BA954F] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-[#1F1D1A]">
                  Project Request Confirmed!
                </h4>
                <p className="text-xs text-[#524E48] font-medium mt-0.5">
                  {confirmationData.message}
                </p>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-[#DCD3BD] text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-[#655E53]">
                <Clock className="h-3.5 w-3.5 text-[#BA954F]" />
                <span>Scheduled for: <strong className="text-black">{confirmationData.meetingTime}</strong></span>
              </div>
              {confirmationData.meetingLink && (
                <div className="flex items-center gap-2 text-[#655E53]">
                  <Video className="h-3.5 w-3.5 text-[#BA954F]" />
                  <span>
                    Join Link:{' '}
                    <a
                      href={confirmationData.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#BA954F] hover:underline font-bold inline-flex items-center gap-1"
                    >
                      {confirmationData.meetingLink}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#7A7469]">
              An automated email with this meeting link and project scope has been dispatched to your registered address.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: PROJECT BASICS */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-3.5 bg-[#BA954F] rounded-xs inline-block" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#24201C]">
                PROJECT BASICS
              </h3>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                  Project Name <span className="text-[#BA954F] font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8C867A]">
                    <Briefcase className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aura Brand Identity V2"
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium placeholder-[#A8A29E] focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                  Project Description <span className="text-[#BA954F] font-bold">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly outline project scope and creative direction..."
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium placeholder-[#A8A29E] focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: TIMELINE & RESOURCES */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-3.5 bg-[#BA954F] rounded-xs inline-block" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#24201C]">
                TIMELINE &amp; RESOURCES
              </h3>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                    Start Date <span className="text-[#BA954F] font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                    End Date <span className="text-[#BA954F] font-bold">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#44403C]">
                    Estimated Budget
                  </label>
                  <span className="border border-[#D8D3C8] text-[#8C867A] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    OPTIONAL
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8C867A]">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={estimatedBudget}
                    onChange={(e) => setEstimatedBudget(e.target.value)}
                    placeholder="50,000"
                    className="w-full pl-8 pr-4 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium placeholder-[#A8A29E] focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: PROJECT OWNERSHIP */}
          {!isClient && (
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-3.5 bg-[#BA954F] rounded-xs inline-block" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#24201C]">
                PROJECT OWNERSHIP
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1.5">
                  Assign Lead Owner <span className="text-[#BA954F] font-bold">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={leadOwnerId}
                    onChange={(e) => setLeadOwnerId(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all cursor-pointer pr-10"
                  >
                    <option value="" disabled>Select lead owner</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {getMemberTitle(m)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867A] pointer-events-none" />
                </div>
              </div>

              {/* Search toggle for large teams */}
              {isSearchOpen && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C867A]" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Filter team members..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#E5E2DA] rounded-lg text-black font-medium focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                  />
                </div>
              )}

              {/* Visual Avatar Chips matching screenshot */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {filteredMembers.slice(0, 4).map((member) => {
                  const isSelected = leadOwnerId === member.id;
                  const title = getMemberTitle(member);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setLeadOwnerId(member.id)}
                      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#EAE2CC] border border-[#BFA76E] shadow-2xs'
                          : 'bg-[#F2F1F5] hover:bg-[#EAE8F0] border border-transparent text-[#262422]'
                      }`}
                    >
                      {/* Avatar */}
                      <img
                        src={
                          member.profileImage ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`
                        }
                        alt={member.name}
                        className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white"
                      />

                      {/* Name & Title */}
                      <div className="min-w-0 pr-1">
                        <div className={`text-[11px] leading-tight truncate ${isSelected ? 'font-bold text-[#1F1D1A]' : 'font-semibold text-[#2D2A26]'}`}>
                          {member.name}
                        </div>
                        <div className="text-[9px] text-[#78716C] leading-tight font-medium">
                          {title}
                        </div>
                      </div>

                      {/* Checkmark icon for selected */}
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#BA954F] text-white flex items-center justify-center shrink-0 ml-0.5">
                          <Check className="h-2.5 w-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}

                {/* Circular search icon button */}
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                    isSearchOpen || memberSearch
                      ? 'bg-[#BA954F] text-white'
                      : 'bg-[#EAE2CC] hover:bg-[#DFD4B7] text-[#7E6A3B] border border-[#D5C7A5]'
                  }`}
                  title="Search team members"
                >
                  <Search className="h-3.5 w-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>
          )}

          {/* SECTION 4: MEETING PREFERENCE (New Required Section) */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <span className="w-1 h-3.5 bg-[#BA954F] rounded-xs inline-block" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#24201C]">
                MEETING PREFERENCE
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#44403C]">
                Preferred Meeting Time <span className="text-[#BA954F] font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8C867A]">
                  <Calendar className="h-4 w-4" />
                </div>
                <input
                  type="datetime-local"
                  required
                  value={preferredMeetingTime}
                  onChange={(e) => setPreferredMeetingTime(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-[#78716C] font-normal leading-normal mt-1">
                A video meeting link (Google Meet / Zoom) will be scheduled and emailed to your account immediately upon project submission.
              </p>
            </div>
          </div>

          {/* Disclaimer Container matching screenshot */}
          <div className="p-3.5 bg-[#F4F3F0] border border-[#E6E4DD] rounded-xl flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-[#EAE2CC] text-[#BA954F] flex items-center justify-center shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4 stroke-[2.2]" />
            </div>
            <p className="text-xs text-[#59554D] font-normal leading-relaxed">
              By initializing this project, a dedicated workspace will be created and all assigned team members will be notified.
            </p>
          </div>

          {/* Form Actions: CREATE PROJECT on left, Cancel on right */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !!confirmationData}
              className="flex-1 py-3 px-6 bg-[#BA954F] hover:bg-[#7D6222] disabled:opacity-50 text-white font-extrabold uppercase tracking-wider text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer active:scale-[0.99]"
            >
              {isSubmitting ? 'Creating Project...' : 'CREATE PROJECT'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-3 px-6 bg-white hover:bg-stone-50 border border-[#D5D0C5] text-[#44403C] font-semibold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
