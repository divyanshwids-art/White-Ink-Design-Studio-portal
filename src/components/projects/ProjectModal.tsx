import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Project, Client, User, ProjectStatus, ProjectPriority } from '../../types';
import { api } from '../../services/api';
import {
  Briefcase,
  Building2,
  Calendar,
  Flag,
  Search,
  Check,
  ChevronDown,
  Link as LinkIcon,
  FileText,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project?: Project | null;
  clients: Client[];
  teamMembers: User[];
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  project,
  clients: initialClients,
  teamMembers: initialTeamMembers,
}) => {
  const isEditing = Boolean(project);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNING');
  const [priority, setPriority] = useState<ProjectPriority>('MEDIUM');
  const [handoverNote, setHandoverNote] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>(initialClients);
  const [teamMembers, setTeamMembers] = useState<User[]>(initialTeamMembers);

  // Sync props and fetch if empty
  useEffect(() => {
    setClients(initialClients);
  }, [initialClients]);

  useEffect(() => {
    setTeamMembers(initialTeamMembers);
  }, [initialTeamMembers]);

  useEffect(() => {
    if (isOpen) {
      // If clients is empty, fetch fallback
      if (clients.length === 0) {
        api.getClients()
          .then((cls) => {
            setClients(cls);
            if (!clientId && cls.length > 0) {
              setClientId(cls[0].id);
            }
          })
          .catch(() => {});
      }

      if (teamMembers.length === 0) {
        api.getUsers()
          .then((us) => {
            const internal = us.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN');
            setTeamMembers(internal);
          })
          .catch(() => {});
      }

      if (project) {
        setName(project.name || '');
        setDescription(project.description || '');
        setClientId(project.clientId || (clients[0]?.id || ''));
        setStartDate(project.startDate ? project.startDate.split('T')[0] : '');
        setDueDate(project.dueDate ? project.dueDate.split('T')[0] : '');
        setStatus(project.status || 'PLANNING');
        setPriority(project.priority || 'MEDIUM');
        setHandoverNote(project.handoverNote || '');
        setDriveUrl(project.driveUrl || '');
        setSelectedMemberIds(project.members?.map((m) => m.id) || []);
      } else {
        setName('');
        setDescription('');
        setClientId(clients[0]?.id || '');
        setStartDate('');
        setDueDate('');
        setStatus('PLANNING');
        setPriority('MEDIUM');
        setHandoverNote('');
        setDriveUrl('');
        setSelectedMemberIds([]);
      }
      setMemberSearch('');
      setError(null);
    }
  }, [project, isOpen, clients.length]);

  // Ensure default client selection when clients list loads
  useEffect(() => {
    if (!clientId && clients.length > 0) {
      setClientId(clients[0].id);
    }
  }, [clients, clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!clientId) {
      setError('Please select a client organization.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && project) {
        await api.updateProject(project.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          clientId,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          status,
          priority,
          handoverNote: handoverNote.trim() || undefined,
          driveUrl: driveUrl.trim() || undefined,
        });

        // Update members if changed
        const currentMemberIds = new Set<string>(project.members?.map((m) => m.id) || []);
        const toAdd = selectedMemberIds.filter((id) => !currentMemberIds.has(id));
        const toRemove = Array.from(currentMemberIds).filter((id) => !selectedMemberIds.includes(id));

        for (const uid of toAdd) {
          await api.addProjectMember(project.id, uid).catch(() => {});
        }
        for (const uid of toRemove) {
          await api.removeProjectMember(project.id, uid).catch(() => {});
        }
      } else {
        await api.createProject({
          name: name.trim(),
          description: description.trim() || undefined,
          clientId,
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          status,
          priority,
          memberIds: selectedMemberIds,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const filteredMembers = teamMembers.filter((m) =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    (m.role && m.role.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Project' : 'Create New Project'}
      subtitle={
        isEditing
          ? 'Update project deliverables, timeline, and assignments.'
          : 'Initialize a new project workspace and define scope parameters.'
      }
      maxWidth="2xl"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="project-form"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl shadow-xs transition-all disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer btn-hover-lift"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              'Update Project'
            ) : (
              'Create Project'
            )}
          </button>
        </>
      }
    >
      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 text-xs text-rose-900 bg-rose-50 border border-rose-200 rounded-xl font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form id="project-form" onSubmit={handleSubmit} className="space-y-5">
        {/* SECTION 1: PROJECT BASICS */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-3.5 bg-[#BA954F] rounded-xs inline-block" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#24201C]">
              PROJECT BASICS
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
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
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Client Organization <span className="text-[#BA954F] font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8C867A]">
                  <Building2 className="h-4 w-4" />
                </div>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full appearance-none pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all cursor-pointer"
                >
                  {clients.length === 0 ? (
                    <option value="" disabled>Loading clients...</option>
                  ) : (
                    clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.company} ({c.name})
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867A] pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Project Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly outline project scope, creative direction, and targets..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium placeholder-[#A8A29E] focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 2: STATUS & TIMELINE */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-3.5 bg-[#BA954F] rounded-xs inline-block" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#24201C]">
              STATUS &amp; TIMELINE
            </h3>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Project Status
                </label>
                <div className="relative">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full appearance-none px-3.5 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all cursor-pointer pr-10"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867A] pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Priority Level
                </label>
                <div className="relative">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                    className="w-full appearance-none px-3.5 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all cursor-pointer pr-10"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C867A] pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#44403C] mb-1">
                  Due Date / Deadline
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: ASSIGN TEAM MEMBERS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1 h-3.5 bg-[#BA954F] rounded-xs inline-block" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#24201C]">
                ASSIGN TEAM MEMBERS
              </h3>
            </div>
            {selectedMemberIds.length > 0 && (
              <span className="text-[11px] font-semibold text-[#BA954F] bg-[#FAF4EC] px-2.5 py-0.5 rounded-full border border-[#EAE0D0]">
                {selectedMemberIds.length} selected
              </span>
            )}
          </div>

          <div className="space-y-2">
            {teamMembers.length > 4 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8C867A]" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Filter team members by name or role..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F8F8FA] border border-[#E5E2DA] rounded-lg text-[#1F1D1A] font-medium focus:outline-none focus:ring-1 focus:ring-[#BA954F] focus:bg-white transition-all"
                />
              </div>
            )}

            {/* Visual Avatar Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 pr-1.5">
              {filteredMembers.map((member) => {
                const isSelected = selectedMemberIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer text-left border ${
                      isSelected
                        ? 'bg-[#FAF4EC] border-[#BA954F] shadow-2xs'
                        : 'bg-[#F8F8FA] hover:bg-[#F2F0EB] border-[#E5E2DA] text-[#262422]'
                    }`}
                  >
                    <img
                      src={
                        member.profileImage ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(member.name)}`
                      }
                      alt={member.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white"
                    />
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs leading-tight truncate ${isSelected ? 'font-bold text-[#1F1D1A]' : 'font-semibold text-[#2D2A26]'}`}>
                        {member.name}
                      </div>
                      <div className="text-[10px] text-[#78716C] leading-tight font-medium truncate mt-0.5">
                        {member.role?.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 transition-colors ${
                        isSelected
                          ? 'bg-[#BA954F] text-white'
                          : 'border border-[#C5B48B] bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
              {filteredMembers.length === 0 && (
                <div className="col-span-full p-3 text-center text-xs text-[#78716C]">
                  No team members available.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: HANDOVER & DELIVERABLES */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-1 h-3.5 bg-[#BA954F] rounded-xs inline-block" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#24201C]">
              HANDOVER &amp; DELIVERABLES
            </h3>
            <span className="border border-[#D8D3C8] text-[#8C867A] text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ml-auto">
              OPTIONAL
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Handover Note / Client Thank-you Message
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8C867A]">
                  <FileText className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={handoverNote}
                  onChange={(e) => setHandoverNote(e.target.value)}
                  placeholder="e.g. Project deliverable summary and appreciation note"
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium placeholder-[#A8A29E] focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#44403C] mb-1">
                Cloud Assets / Deliverable Folder Link
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8C867A]">
                  <LinkIcon className="h-4 w-4" />
                </div>
                <input
                  type="url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#F8F8FA] border border-[#E5E2DA] rounded-xl text-[#1F1D1A] font-medium placeholder-[#A8A29E] focus:outline-none focus:ring-1.5 focus:ring-[#BA954F] focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};
