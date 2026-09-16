import React, { useState } from 'react';
import { Project, User, HandoverDocument } from '../../types';
import { api } from '../../services/api';
import { HandoverDocsModal } from './HandoverDocsModal';
import { EditHandoverModal } from './EditHandoverModal';
import {
  ArrowLeft,
  Clock,
  Info,
  Check,
  CheckCircle2,
  Send,
  Download,
  Edit2,
  Share2,
  Layers,
  FileText,
  ExternalLink,
  Copy,
  Sparkles,
} from 'lucide-react';

interface FinalHandoverViewProps {
  project: Project;
  currentUser?: User | null;
  canManage: boolean;
  onBack: () => void;
  onSwitchToWorkspace: () => void;
  onProjectUpdated: () => void;
}

interface RequirementItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

export const FinalHandoverView: React.FC<FinalHandoverViewProps> = ({
  project,
  currentUser,
  canManage,
  onBack,
  onSwitchToWorkspace,
  onProjectUpdated,
}) => {
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDownloadingReport, setIsDownloadingReport] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Initial requirements: combine standard milestone requirements + completed tasks
  const standardRequirements: RequirementItem[] = [
    {
      id: 'req_deliverables',
      title: 'Final Deliverable Approval',
      description: 'Client sign-off on all major assets.',
      completed: true,
    },
    {
      id: 'req_assets',
      title: 'Asset Package Transfer',
      description: 'Transfer high-res source files via secure link.',
      completed: true,
    },
    {
      id: 'req_qa',
      title: 'Quality Assurance & Sign-off',
      description: 'Verified against studio design standards.',
      completed: true,
    },
  ];

  // Dynamic items from project tasks if available
  const taskRequirements: RequirementItem[] = (project.tasks || []).map((t) => ({
    id: `req_task_${t.id}`,
    title: t.title,
    description: t.description || 'Verified and completed task requirement.',
    completed: t.status === 'COMPLETED',
  }));

  const allInitialItems = [
    ...standardRequirements,
    ...taskRequirements.slice(0, 3), // Show core tasks
  ];

  const [checklist, setChecklist] = useState<RequirementItem[]>(allInitialItems);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSelectAll = () => {
    const allDone = checklist.every((item) => item.completed);
    setChecklist((prev) =>
      prev.map((item) => ({
        ...item,
        completed: !allDone,
      }))
    );
    showToast(!allDone ? 'All requirements selected' : 'Requirements selection cleared');
  };

  const toggleRequirement = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDownloadReport = async () => {
    setIsDownloadingReport(true);
    try {
      const blob = await api.downloadProjectAuditReport(project.id, 'pdf');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sanitizedTitle = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      a.download = `audit-report-${sanitizedTitle}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Audit report downloaded successfully');
    } catch (err: any) {
      console.error('Failed to download audit report:', err);
      // Fallback: try CSV format
      try {
        const csvBlob = await api.downloadProjectAuditReport(project.id, 'csv');
        const url = window.URL.createObjectURL(csvBlob);
        const a = document.createElement('a');
        a.href = url;
        const sanitizedTitle = project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        a.download = `audit-report-${sanitizedTitle}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Audit report downloaded (CSV)');
      } catch (fallbackErr: any) {
        showToast('Failed to download audit report: ' + (fallbackErr.message || 'Error'));
      }
    } finally {
      setIsDownloadingReport(false);
    }
  };

  const handleDirectLink = () => {
    if (project.driveUrl && project.driveUrl.trim()) {
      const targetUrl = project.driveUrl.startsWith('http')
        ? project.driveUrl
        : `https://${project.driveUrl}`;

      // Copy to clipboard
      navigator.clipboard.writeText(targetUrl).catch(() => {});
      showToast('Deliverables link copied! Opening folder in new tab...');

      // Open in new tab
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else if (canManage) {
      // Prompt admin to configure the deliverables link
      setIsEditModalOpen(true);
      showToast('Please set the Google Drive or deliverables folder link.');
    } else {
      showToast('The deliverables folder link is being prepared by the studio team.');
    }
  };

  const completedCount = project.completedTaskCount ?? project.tasks?.filter((t) => t.status === 'COMPLETED').length ?? 5;
  const totalCount = project.taskCount ?? project.tasks?.length ?? 5;

  const handoverNoteText =
    project.handoverNote && project.handoverNote.trim()
      ? project.handoverNote
      : 'Small summary of project Thank you message';

  const documentsList: HandoverDocument[] =
    project.handoverDocsList ||
    (project.handoverDocs
      ? (() => {
          try {
            return JSON.parse(project.handoverDocs);
          } catch (e) {
            return [];
          }
        })()
      : []);

  return (
    <div className="min-h-screen pb-16 flex flex-col items-center">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#2D2418] text-white px-4 py-2.5 rounded-xl shadow-lg border border-[#BA954F]/50 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <Sparkles className="h-4 w-4 text-[#DFCE9F]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Controls & Navigation Bar */}
      <div className="w-full max-w-md mx-auto mb-4 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E1B18] hover:text-[#BA954F] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Projects
        </button>

        <div className="flex items-center gap-2">
          {canManage && (
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#BA954F] bg-white hover:bg-gold-100 border border-[#DFCE9F] rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Edit Note & Links"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit Note</span>
            </button>
          )}

          <button
            type="button"
            onClick={onSwitchToWorkspace}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#2D2418] bg-[#F5EDD6] hover:bg-[#EBE1C7] border border-[#DFCE9F] rounded-lg transition-colors cursor-pointer shadow-2xs"
            title="Switch to detailed task workspace"
          >
            <Layers className="h-3 w-3 text-[#BA954F]" />
            <span>Workspace</span>
          </button>
        </div>
      </div>

      {/* Main Handover Container (Mobile-first card matching Image 4) */}
      <div className="w-full max-w-md mx-auto space-y-6">
        {/* Top Illustration Card */}
        <div className="relative bg-[#FAF6ED] rounded-2xl border border-[#E8DEC8] p-6 pt-5 pb-7 flex flex-col items-center text-center shadow-xs overflow-hidden">
          {/* Project Closure Badge */}
          <div className="w-full flex justify-end mb-2">
            <span className="text-[11px] font-bold text-[#BA954F] bg-[#F5EDD6] px-3 py-0.5 rounded-full border border-[#DFCE9F] shadow-2xs tracking-wide">
              Project Closure
            </span>
          </div>

          {/* Folder Graphic with Checkmark */}
          <div className="my-2 relative w-48 h-36 flex items-center justify-center select-none">
            <svg
              viewBox="0 0 200 150"
              className="w-full h-full drop-shadow-md"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Back Folder Tab */}
              <path
                d="M 25 32 Q 25 24 33 24 L 75 24 Q 85 24 92 32 L 102 42 L 167 42 Q 175 42 175 50 L 175 125 Q 175 133 167 133 L 33 133 Q 25 133 25 125 Z"
                fill="#543C1D"
              />

              {/* Inside Document Sheet with tab label */}
              <path
                d="M 32 38 L 168 38 L 168 128 L 32 128 Z"
                fill="#FAF6ED"
                stroke="#D6C7A8"
                strokeWidth="1.5"
              />
              {/* Completed Project Tab Banner */}
              <rect x="86" y="24" width="70" height="14" rx="3" fill="#FAF6ED" stroke="#543C1D" strokeWidth="1" />
              <text
                x="121"
                y="34"
                fill="#543C1D"
                fontSize="6"
                fontWeight="800"
                fontFamily="sans-serif"
                textAnchor="middle"
                letterSpacing="0.5"
              >
                COMPLETED PROJECT
              </text>

              {/* Front Folder Flap (Rich Warm Brown Leather tone) */}
              <path
                d="M 28 44 Q 28 38 36 38 L 74 38 Q 82 38 88 44 L 98 52 L 164 52 Q 172 52 172 60 L 172 126 Q 172 134 164 134 L 36 134 Q 28 134 28 126 Z"
                fill="url(#folderGradient)"
                stroke="#432F16"
                strokeWidth="1.5"
              />

              {/* Folder highlight contour */}
              <path
                d="M 30 46 L 73 46 L 85 54 L 168 54 L 168 128 L 30 128 Z"
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
              />

              {/* 3D Golden Checkmark in Center */}
              <g transform="translate(68, 55)">
                {/* Checkmark shadow */}
                <path
                  d="M 12 38 L 26 50 L 56 16"
                  fill="none"
                  stroke="#3B2A10"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.35"
                  transform="translate(2, 2)"
                />
                {/* Gold Checkmark Base */}
                <path
                  d="M 12 38 L 26 50 L 56 16"
                  fill="none"
                  stroke="url(#goldCheckGradient)"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Checkmark Inner Highlight */}
                <path
                  d="M 14 38 L 26 48 L 54 18"
                  fill="none"
                  stroke="#FFF3C7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.8"
                />
              </g>

              {/* Gradients */}
              <defs>
                <linearGradient id="folderGradient" x1="28" y1="38" x2="172" y2="134" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#7E5C2C" />
                  <stop offset="60%" stopColor="#63451D" />
                  <stop offset="100%" stopColor="#4A3315" />
                </linearGradient>
                <linearGradient id="goldCheckGradient" x1="12" y1="50" x2="56" y2="16" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#C99834" />
                  <stop offset="35%" stopColor="#ECC66D" />
                  <stop offset="70%" stopColor="#E2B750" />
                  <stop offset="100%" stopColor="#A47720" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Heading & Subtitle */}
          <div className="mt-2 space-y-1.5 max-w-sm">
            <h1 className="font-serif text-3xl font-semibold text-[#1E1B18] tracking-tight">
              Final Handover
            </h1>
            <p className="text-xs sm:text-sm text-[#666158] leading-relaxed whitespace-pre-line">
              {handoverNoteText}
            </p>
          </div>
        </div>

        {/* Completion Progress Card */}
        <div className="bg-white rounded-xl border border-[#EBE3D3] shadow-xs p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <div className="flex items-center gap-2 text-[#2D2418]">
              <Clock className="h-4 w-4 text-[#BA954F]" />
              <span>Completion Progress</span>
            </div>
            <span className="text-[#BA954F] text-sm font-extrabold">100%</span>
          </div>

          {/* Solid Gold Progress Bar */}
          <div className="w-full bg-[#EFE9DC] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#BA954F] h-full rounded-full transition-all duration-500"
              style={{ width: '100%' }}
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#666158] font-medium pt-0.5">
            <Info className="h-3.5 w-3.5 text-[#BA954F] shrink-0" />
            <span>
              {completedCount} of {totalCount} mandatory tasks finished
            </span>
          </div>
        </div>

        {/* Requirements Checklist Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-sm font-bold text-[#1E1B18] tracking-tight">Requirements</h2>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] font-bold text-[#BA954F] hover:text-[#6E551B] uppercase tracking-wider cursor-pointer"
            >
              SELECT ALL
            </button>
          </div>

          {/* Checklist Cards */}
          <div className="space-y-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleRequirement(item.id)}
                className="bg-[#F9F6EE] hover:bg-[#F5F0E4] border border-[#E7DECB] rounded-xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-2xs transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Left Gold Checkbox */}
                  <div
                    className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                      item.completed
                        ? 'bg-[#BA954F] text-white'
                        : 'border border-[#B8A682] bg-white'
                    }`}
                  >
                    {item.completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>

                  <div className="min-w-0">
                    <h3
                      className={`text-xs font-bold truncate ${
                        item.completed
                          ? 'text-[#3E3424] line-through decoration-[#BA954F]/70'
                          : 'text-[#1E1B18]'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-[#7A7162] truncate">{item.description}</p>
                  </div>
                </div>

                {/* Right Circular Check Badge */}
                <div className="shrink-0 text-[#BA954F]">
                  <CheckCircle2
                    className={`h-4 w-4 ${item.completed ? 'opacity-100' : 'opacity-30'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          {/* Button 1: Submit Documentation */}
          <button
            type="button"
            onClick={() => setIsDocsModalOpen(true)}
            className="w-full py-3.5 px-4 rounded-xl bg-[#BA954F] hover:bg-[#A17B2F] active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Send className="h-4 w-4 stroke-[2.2] -rotate-12" />
            <span>Submit Documentation</span>
            {documentsList.length > 0 && (
              <span className="ml-1 bg-white/20 text-white px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                {documentsList.length}
              </span>
            )}
          </button>

          {/* Button 2: Download Audit Report */}
          <button
            type="button"
            disabled={isDownloadingReport}
            onClick={handleDownloadReport}
            className="w-full py-3 px-4 rounded-xl bg-white hover:bg-gold-50/60 active:scale-[0.99] disabled:opacity-50 text-[#2D2418] border border-[#BA954F] font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#BA954F] stroke-[2.2]" />
            <span>{isDownloadingReport ? 'Generating Audit Report...' : 'Download Audit Report'}</span>
          </button>

          {/* Button 3: Direct Link of project */}
          <button
            type="button"
            onClick={handleDirectLink}
            className="w-full py-3.5 px-4 rounded-xl bg-[#BA954F] hover:bg-[#A17B2F] active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Send className="h-4 w-4 stroke-[2.2] -rotate-12" />
            <span>Direct Link of project</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <HandoverDocsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        projectId={project.id}
        projectName={project.name}
        documents={documentsList}
        currentUser={currentUser}
        canManage={canManage}
        onDocsUpdated={() => {
          onProjectUpdated();
        }}
      />

      <EditHandoverModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        projectId={project.id}
        projectName={project.name}
        currentHandoverNote={project.handoverNote}
        currentDriveUrl={project.driveUrl}
        onSaved={() => {
          onProjectUpdated();
          showToast('Handover details updated successfully');
        }}
      />
    </div>
  );
};
