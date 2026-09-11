import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  X,
  FileEdit,
  Link2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
} from 'lucide-react';

interface EditHandoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  currentHandoverNote?: string | null;
  currentDriveUrl?: string | null;
  onSaved: (updatedData: { handoverNote: string; driveUrl: string }) => void;
}

export const EditHandoverModal: React.FC<EditHandoverModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  currentHandoverNote,
  currentDriveUrl,
  onSaved,
}) => {
  const [handoverNote, setHandoverNote] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHandoverNote(
        currentHandoverNote ||
          'Small summary of project Thank you message'
      );
      setDriveUrl(currentDriveUrl || '');
      setError(null);
    }
  }, [isOpen, currentHandoverNote, currentDriveUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await api.updateProject(projectId, {
        handoverNote: handoverNote.trim() || undefined,
        driveUrl: driveUrl.trim() || undefined,
      });

      onSaved({
        handoverNote: handoverNote.trim(),
        driveUrl: driveUrl.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update handover details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF7F0] border border-[#DCD3C1] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3D9C6] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#BA954F]/10 border border-[#BA954F]/30 flex items-center justify-center text-[#BA954F]">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E1B18]">Edit Handover Details</h2>
              <p className="text-xs text-[#7A7162] truncate max-w-sm">{projectName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-black/50 hover:text-black rounded-lg hover:bg-gold-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Handover Note / Summary message */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#3E3424]">
              Summary & Thank You Message
            </label>
            <textarea
              rows={3}
              value={handoverNote}
              onChange={(e) => setHandoverNote(e.target.value)}
              placeholder="e.g. Small summary of project Thank you message"
              className="w-full text-xs px-3.5 py-2.5 bg-white border border-[#DCD3C1] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#BA954F] text-[#1E1B18] shadow-xs resize-none"
            />
            <p className="text-[11px] text-[#7A7162]">
              Displayed prominently underneath the "Final Handover" headline for clients and the team.
            </p>
          </div>

          {/* Direct Google Drive / Deliverables Link */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#3E3424] flex items-center gap-1.5">
              <span>Direct Link of project (Google Drive)</span>
              <span className="text-[10px] text-[#BA954F] font-normal normal-case">(Deliverables Folder)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#BA954F]">
                <Link2 className="h-4 w-4" />
              </div>
              <input
                type="url"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-white border border-[#DCD3C1] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#BA954F] text-[#1E1B18] shadow-xs"
              />
            </div>
            <p className="text-[11px] text-[#7A7162]">
              When clicked, the "Direct Link of project" button opens or copies this folder link.
            </p>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#E3D9C6]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-[#2D2418] hover:bg-gold-100 rounded-lg border border-[#DCD3C1] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#BA954F] hover:bg-[#A17B2F] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
