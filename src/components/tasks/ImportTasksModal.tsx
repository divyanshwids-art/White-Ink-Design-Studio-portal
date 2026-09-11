import React, { useState, useRef } from 'react';
import { Modal } from '../common/Modal';
import { Project, TaskImportResult } from '../../types';
import { api } from '../../services/api';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  X,
} from 'lucide-react';

interface ImportTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects: Project[];
  defaultProjectId?: string;
}

export const ImportTasksModal: React.FC<ImportTasksModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projects,
  defaultProjectId,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState<string>(defaultProjectId || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<TaskImportResult | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setError(null);
    setImportResult(null);
    setIsUploading(false);
    setIsDownloadingTemplate(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (importResult && importResult.imported > 0) {
      onSuccess();
    }
    resetState();
    onClose();
  };

  const handleFileChange = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      setError('Invalid file type. Please upload a standard Excel spreadsheet (.xlsx or .xls).');
      setSelectedFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      setSelectedFile(null);
      return;
    }
    setError(null);
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    setError(null);
    try {
      const blob = await api.downloadTaskTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'tasks_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || 'Failed to download Excel template.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an Excel file to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (projectId) {
        formData.append('defaultProjectId', projectId);
      }

      const result = await api.importTasks(formData);
      setImportResult(result);
      if (result.imported > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process task import.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Import Tasks from Excel"
      subtitle="Bulk create multiple tasks by uploading an Excel spreadsheet (.xlsx, .xls)"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Error notification */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs font-semibold">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {!importResult ? (
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Download Template Banner */}
            <div className="p-3.5 bg-gold-50/80 border border-gold-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="h-5 w-5 text-gold-700 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-black">Need the standard spreadsheet format?</div>
                  <div className="text-[11px] text-black/70 font-medium">
                    Download the template with pre-configured column headers and example rows.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gold-100 text-black text-xs font-bold rounded-lg border border-gold-300 transition-colors shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDownloadingTemplate ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-gold-700" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-gold-700" />
                )}
                Download Template
              </button>
            </div>

            {/* Optional Default Project selector */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Default Project <span className="text-black/40 normal-case font-medium">(optional)</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white border border-gold-300 rounded-lg text-black font-semibold focus:outline-none focus:ring-1 focus:ring-gold-500 cursor-pointer"
              >
                <option value="">Use project names specified in Excel file</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-black/60 font-medium mt-1">
                If a row in your spreadsheet leaves the Project column blank, it will be assigned to this project.
              </p>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-black mb-1">
                Select Excel File <span className="text-gold-700">*</span>
              </label>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-gold-500 bg-gold-50/80 scale-[0.99]'
                    : selectedFile
                    ? 'border-gold-400 bg-gold-50/40'
                    : 'border-gold-300 hover:border-gold-400 bg-white hover:bg-gold-50/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                {selectedFile ? (
                  <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-gold-300 max-w-md mx-auto shadow-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className="h-6 w-6 text-emerald-600 shrink-0" />
                      <div className="text-left min-w-0">
                        <div className="text-xs font-bold text-black truncate">{selectedFile.name}</div>
                        <div className="text-[10px] text-black/60 font-medium">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1 text-black/50 hover:text-black rounded hover:bg-gold-100 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="inline-flex p-3 rounded-full bg-gold-100 border border-gold-300 text-gold-700">
                      <UploadCloud className="h-6 w-6" />
                    </div>
                    <div className="text-sm font-extrabold text-black">
                      Click to upload or drag and drop
                    </div>
                    <p className="text-xs text-black/60 font-medium">
                      Standard Excel spreadsheets (.xlsx, .xls) up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Expected columns guide */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg space-y-1 text-left">
              <div className="text-[11px] font-bold text-zinc-700 uppercase tracking-wide">
                Expected Excel Columns:
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed font-mono">
                Task Title*, Project Name*, Description, Assigned To, Priority (Low/Med/High/Urgent), Status (To Do/In Progress/Review/Completed), Due Date (YYYY-MM-DD)
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-black bg-white hover:bg-gold-100 border border-gold-300 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 shadow-sm cursor-pointer btn-hover-lift"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-black" />
                    Processing Import...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Upload & Import Tasks
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Import Result Summary View */
          <div className="space-y-4">
            {/* Top Status Header */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              importResult.failed === 0
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : importResult.imported > 0
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-300 text-rose-900'
            }`}>
              {importResult.failed === 0 ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
              ) : importResult.imported > 0 ? (
                <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-rose-600 shrink-0" />
              )}
              <div>
                <div className="text-sm font-extrabold">
                  {importResult.failed === 0
                    ? 'Import Completed Successfully'
                    : importResult.imported > 0
                    ? 'Import Completed with Some Warnings'
                    : 'Import Failed'}
                </div>
                <div className="text-xs opacity-90 font-medium">
                  {importResult.imported} of {importResult.total} tasks imported successfully.
                </div>
              </div>
            </div>

            {/* Metric counters */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-gold-300 rounded-xl text-center shadow-xs">
                <div className="text-lg sm:text-xl font-black text-black">{importResult.total}</div>
                <div className="text-[10px] sm:text-xs font-bold text-black/60 uppercase tracking-wider mt-0.5">
                  Total Rows
                </div>
              </div>
              <div className="p-3 bg-emerald-50/60 border border-emerald-300 rounded-xl text-center shadow-xs">
                <div className="text-lg sm:text-xl font-black text-emerald-700">{importResult.imported}</div>
                <div className="text-[10px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider mt-0.5">
                  Imported
                </div>
              </div>
              <div className="p-3 bg-rose-50/60 border border-rose-300 rounded-xl text-center shadow-xs">
                <div className="text-lg sm:text-xl font-black text-rose-700">{importResult.failed}</div>
                <div className="text-[10px] sm:text-xs font-bold text-rose-800 uppercase tracking-wider mt-0.5">
                  Failed
                </div>
              </div>
            </div>

            {/* Failed Rows Detail List */}
            {importResult.failedRows.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-black flex items-center justify-between">
                  <span>Failed Rows Breakdown ({importResult.failedRows.length})</span>
                  <span className="text-[10px] text-black/50 normal-case font-medium">
                    Correct these issues and re-import if needed
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 bg-zinc-50 p-2.5 rounded-xl border border-zinc-200">
                  {importResult.failedRows.map((f, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-white border border-rose-200 rounded-lg text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-black flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded">
                            Row {f.row}
                          </span>
                          <span className="truncate">{f.title || `Row ${f.row}`}</span>
                        </span>
                      </div>
                      <div className="text-[11px] text-rose-700 font-semibold pl-1">
                        • {f.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Successfully imported tasks preview */}
            {importResult.importedTasks.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-black">
                  Successfully Created Tasks:
                </div>
                <div className="max-h-36 overflow-y-auto divide-y divide-gold-200 bg-white p-2 rounded-xl border border-gold-300 text-xs">
                  {importResult.importedTasks.map((task) => (
                    <div key={task.id} className="py-1.5 px-2 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-bold text-black truncate">{task.title}</div>
                        <div className="text-[10px] text-black/60">
                          {task.project?.name || 'Project'} • {task.assignedTo?.name || 'Unassigned'}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gold-200 text-black border border-gold-300 shrink-0">
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Post-import actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
              <button
                type="button"
                onClick={() => {
                  setImportResult(null);
                  setSelectedFile(null);
                }}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-black bg-white hover:bg-gold-100 border border-gold-300 rounded-lg transition-colors cursor-pointer"
              >
                Import Another File
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 text-xs sm:text-sm font-bold text-black bg-gold-500 hover:bg-gold-600 border border-gold-600 rounded-lg transition-colors shadow-sm cursor-pointer btn-hover-lift"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
