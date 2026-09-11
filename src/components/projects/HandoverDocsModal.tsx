import React, { useState, useRef } from 'react';
import { HandoverDocument, User } from '../../types';
import { api } from '../../services/api';
import {
  X,
  FileText,
  Upload,
  Download,
  Trash2,
  Calendar,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Paperclip,
} from 'lucide-react';

interface HandoverDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  documents: HandoverDocument[];
  currentUser?: User | null;
  canManage: boolean;
  onDocsUpdated: (newDocs: HandoverDocument[]) => void;
}

export const HandoverDocsModal: React.FC<HandoverDocsModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectName,
  documents,
  currentUser,
  canManage,
  onDocsUpdated,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docNote, setDocNote] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must not exceed 50 MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.size > 50 * 1024 * 1024) {
        setError('File size must not exceed 50 MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Read as base64 data URL for persistence
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const res = await api.uploadHandoverDoc(projectId, {
            name: selectedFile.name,
            size: formatBytes(selectedFile.size),
            type: selectedFile.type || 'application/octet-stream',
            dataUrl,
            note: docNote.trim() || undefined,
          });

          onDocsUpdated(res.handoverDocs);
          setSelectedFile(null);
          setDocNote('');
          if (fileInputRef.current) fileInputRef.current.value = '';
          setSuccessMessage('Document uploaded successfully.');
          setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err: any) {
          setError(err.message || 'Failed to save document.');
        } finally {
          setIsUploading(false);
        }
      };

      reader.onerror = () => {
        setError('Failed to read file content.');
        setIsUploading(false);
      };

      reader.readAsDataURL(selectedFile);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document.');
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string, docName: string) => {
    if (!window.confirm(`Are you sure you want to remove "${docName}"?`)) return;
    setDeletingId(docId);
    setError(null);
    try {
      const res = await api.deleteHandoverDoc(projectId, docId);
      onDocsUpdated(res.handoverDocs);
    } catch (err: any) {
      setError(err.message || 'Failed to delete document.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (doc: HandoverDocument) => {
    if (doc.dataUrl) {
      const a = document.createElement('a');
      a.href = doc.dataUrl;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      // Direct mock text download if no dataUrl stored
      const blob = new Blob([`Handover Document: ${doc.name}\nProject: ${projectName}\nUploaded: ${doc.uploadedAt}`], {
        type: 'text/plain;charset=utf-8',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-[#FAF7F0] border border-[#DCD3C1] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3D9C6] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#BA954F]/10 border border-[#BA954F]/30 flex items-center justify-center text-[#BA954F]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1E1B18]">Project Documentation</h2>
              <p className="text-xs text-[#7A7162] truncate max-w-md">{projectName}</p>
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

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-gold-100 border border-gold-300 text-gold-900 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-gold-700" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Upload Form for Team/Admin */}
          {canManage && (
            <form onSubmit={handleUpload} className="bg-white border border-[#E7DECB] p-4 rounded-xl shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[#3E3424]">Upload New Document</span>
                <span className="text-[11px] text-[#BA954F] font-semibold">Max 50 MB</span>
              </div>

              {/* Drop area */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#CFBFA0] hover:border-[#BA954F] bg-[#FBF9F4] rounded-xl p-5 text-center cursor-pointer transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#F5EDD6] text-[#BA954F] flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  {selectedFile ? (
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#1E1B18]">{selectedFile.name}</p>
                      <p className="text-[11px] text-[#7A7162]">{formatBytes(selectedFile.size)}</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-[#2D2418]">Click to select or drag & drop files here</p>
                      <p className="text-[11px] text-[#7A7162]">PDF, ZIP, DOCX, PNG, JPG, or design bundles</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Document note / description */}
              <div>
                <input
                  type="text"
                  value={docNote}
                  onChange={(e) => setDocNote(e.target.value)}
                  placeholder="Optional brief description or note (e.g., Final Brand Guidelines v2.0)..."
                  className="w-full text-xs px-3 py-2 bg-[#FBF9F4] border border-[#DCD3C1] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#BA954F] text-[#1E1B18]"
                />
              </div>

              <div className="flex justify-end gap-2">
                {selectedFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-3 py-1.5 text-xs font-semibold text-black/60 hover:text-black cursor-pointer"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-4 py-2 bg-[#BA954F] hover:bg-[#A17B2F] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Submit Document
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Document List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E3424]">
                Handover Deliverable Files ({documents.length})
              </h3>
            </div>

            {documents.length === 0 ? (
              <div className="p-8 text-center bg-white border border-[#E7DECB] rounded-xl space-y-2">
                <Paperclip className="h-8 w-8 mx-auto text-[#B8A682]" />
                <p className="text-xs font-bold text-[#2D2418]">No documents uploaded yet</p>
                <p className="text-[11px] text-[#7A7162]">
                  {canManage
                    ? 'Upload final handover assets, contracts, or specifications above.'
                    : 'The studio team will make final documentation packages available here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-[#E7DECB] p-3.5 rounded-xl shadow-xs flex items-center justify-between gap-3 hover:border-[#BA954F]/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF6ED] border border-[#E3D9C6] flex items-center justify-center text-[#BA954F] shrink-0 mt-0.5">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#1E1B18] truncate">{doc.name}</h4>
                        {doc.note && (
                          <p className="text-[11px] text-[#6E6659] line-clamp-1 italic">{doc.note}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-[#7A7162] pt-0.5">
                          <span className="font-semibold text-[#BA954F]">{doc.size}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                          {doc.uploadedByName && (
                            <span className="flex items-center gap-1">
                              <UserIcon className="h-2.5 w-2.5" />
                              {doc.uploadedByName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="p-1.5 text-[#BA954F] hover:bg-[#F5EDD6] rounded-lg transition-colors cursor-pointer"
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          disabled={deletingId === doc.id}
                          onClick={() => handleDelete(doc.id, doc.name)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete document"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-red-500" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-[#E3D9C6] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-[#2D2418] hover:bg-gold-100 rounded-lg border border-[#DCD3C1] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
