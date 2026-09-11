import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Project, Client, User, ProjectStatus, ProjectPriority } from '../../types';
import { api } from '../../services/api';

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
  clients,
  teamMembers,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    setError(null);
  }, [project, clients, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (!clientId) {
      setError('Please select a client.');
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Project' : 'Create New Project'}
      subtitle={isEditing ? 'Update project deliverables, timeline, and assignments' : 'Define project scope and assign team members'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-black bg-gold-100 border border-gold-400 rounded-lg font-medium">
            {error}
          </div>
        )}

        {/* Project Name */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Project Name <span className="text-gold-700">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Enterprise Portal Redesign"
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-medium placeholder-black/40 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Description
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe project objectives and scope..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-medium placeholder-black/40 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        {/* Client Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
            Client Organization <span className="text-gold-700">*</span>
          </label>
          <select
            required
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer"
          >
            <option value="" disabled>
              Select a client
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company} ({c.name})
              </option>
            ))}
          </select>
        </div>

        {/* Status and Priority */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer"
            >
              <option value="PLANNING">Planning</option>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as ProjectPriority)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
              Due Date / Deadline
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>
        </div>

        {/* Handover & Deliverables Fields */}
        <div className="p-3.5 bg-[#FAF6ED] border border-[#DFCE9F] rounded-xl space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#BA954F]">
            Handover & Deliverables Settings
          </h4>
          <div>
            <label className="block text-xs font-bold text-black mb-1">
              Final Handover Note / Thank-you Message
            </label>
            <input
              type="text"
              value={handoverNote}
              onChange={(e) => setHandoverNote(e.target.value)}
              placeholder="e.g. Small summary of project Thank you message"
              className="w-full px-3.5 py-2 text-xs bg-white border border-gold-300 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-black mb-1">
              Direct Link of Project (Google Drive / Cloud Folder)
            </label>
            <input
              type="url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="https://drive.google.com/drive/folders/..."
              className="w-full px-3.5 py-2 text-xs bg-white border border-gold-300 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-gold-500"
            />
          </div>
        </div>

        {/* Assign Team Members */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-black mb-2">
            Assign Team Members
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-gold-300 rounded-lg bg-gold-50/50">
            {teamMembers.map((member) => {
              const isSelected = selectedMemberIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleMember(member.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-gold-100 border-gold-400 text-black font-bold'
                      : 'bg-white border-gold-200 text-black/80 hover:bg-gold-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="rounded text-gold-600 focus:ring-gold-500 pointer-events-none accent-gold-600"
                  />
                  <span className="truncate">{member.name}</span>
                  <span className="text-[10px] text-black/60 ml-auto font-medium">{member.role}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gold-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-bold text-black bg-white hover:bg-gold-100 border border-gold-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 shadow-sm cursor-pointer btn-hover-lift"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
