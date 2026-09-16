import React, { useState, useRef } from 'react';
import { Task } from '../../types';
import { api } from '../../services/api';
import {
  X,
  FileText,
  Upload,
  Send,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface RequestChangesModalProps {
  task: Task;
  onClose: () => void;
  onSubmitted: () => void;
}

interface UploadedFile {
  name: string;
  size: string;
  raw: File;
}

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const RequestChangesModal: React.FC<RequestChangesModalProps> = ({
  task,
  onClose,
  onSubmitted,
}) => {
  const [feedback, setFeedback] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [targetDate, setTargetDate] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const selected = e.target.files ? Array.from(e.target.files) : [];
    const oversized = selected.filter((f: File) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      setFileError(`${oversized.map((f: File) => f.name).join(', ')} exceed${oversized.length === 1 ? 's' : ''} the 25 MB limit.`);
      return;
    }
    const newFiles: UploadedFile[] = selected.map((f: File) => ({
      name: f.name,
      size: formatBytes(f.size),
      raw: f,
    }));
    setFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      return [...prev, ...newFiles.filter((f) => !existingNames.has(f.name))];
    });
    // Reset input so same file can be re-added after removal
    e.target.value = '';
  };

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    try {
      await api.submitRevisionRequest(task.id, {
        feedback: feedback.trim(),
        priority,
        targetDate: targetDate || undefined,
        files: files.map((f) => ({ name: f.name, size: f.size })),
      });
      onSubmitted();
    } catch {
      // silently fail — could add toast here
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gold-300 flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gold-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="h-4 w-4 text-gold-600" />
            <div>
              <h2 className="text-sm font-extrabold text-black">Request Changes</h2>
              <p className="text-[11px] text-black/50 font-medium truncate max-w-[240px]">{task.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 uppercase tracking-wide">
              Revision Requested
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-black/50 hover:text-black hover:bg-gold-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="flex-1 px-5 py-5 space-y-5">
            {/* Detailed Feedback */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-black uppercase tracking-wider">
                  Detailed Feedback
                </label>
                <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider">
                  Editorial Focus
                </span>
              </div>
              <textarea
                required
                rows={5}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe the changes you would like to see in this revision. Please be as specific as possible regarding typography, colors, or layout."
                className="w-full px-3.5 py-3 text-sm bg-white border border-gold-300 rounded-xl text-black font-medium placeholder-black/35 focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 resize-none leading-relaxed"
              />
              <div className="flex items-start gap-1.5 text-[11px] text-black/50 font-medium">
                <AlertCircle className="h-3 w-3 text-gold-500 mt-0.5 shrink-0" />
                Mentioning specific pages helps our design team iterate faster.
              </div>
            </div>

            {/* Priority Level */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-black uppercase tracking-wider block">
                Priority Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setPriority(level)}
                    className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      priority === level
                        ? 'bg-[#BA954F] text-white border-[#A17B2F] shadow-sm'
                        : 'bg-white text-black border-gold-300 hover:bg-gold-50'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Requested Target Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-black uppercase tracking-wider block">
                Requested Target Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-gold-300 rounded-xl text-black font-medium focus:outline-none focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Supporting Files */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-black uppercase tracking-wider">
                  Supporting Files
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-gold-700 hover:text-black transition-colors cursor-pointer uppercase tracking-wider"
                >
                  Browse Files
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Uploaded file list */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.name}
                      className="flex items-center justify-between p-3 bg-gold-50 border border-gold-200 rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gold-300 flex items-center justify-center shrink-0">
                          <FileText className="h-3.5 w-3.5 text-gold-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-black truncate max-w-[180px]">{file.name}</p>
                          <p className="text-[11px] text-black/50 font-medium">{file.size}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(file.name)}
                        className="p-1 text-black/40 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Drop zone / tap to upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gold-300 rounded-xl py-5 flex flex-col items-center gap-1.5 hover:border-gold-500 hover:bg-gold-50/50 transition-all cursor-pointer"
              >
                <Upload className="h-5 w-5 text-gold-500" />
                <span className="text-xs font-bold text-black/60">Tap to upload assets</span>
                <span className="text-[10px] text-black/40 font-medium uppercase tracking-wider">
                  Max 25MB per file
                </span>
              </button>

              {fileError && (
                <p className="text-xs text-rose-600 font-medium">{fileError}</p>
              )}
            </div>
          </div>

          {/* Sticky submit button */}
          <div className="px-5 py-4 border-t border-gold-200 shrink-0 bg-white">
            <button
              type="submit"
              disabled={isSubmitting || !feedback.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-[#BA954F] hover:bg-[#A17B2F] text-white border border-[#A17B2F] shadow-sm transition-all disabled:opacity-50 cursor-pointer btn-hover-lift"
            >
              <Send className="h-4 w-4 shrink-0" />
              {isSubmitting ? 'Submitting...' : 'Submit Revision Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
