import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  HardDrive,
  ExternalLink,
  Copy,
  Check,
  Folder,
  Layers,
  Sparkles,
  FileCheck2,
  FolderArchive,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface CompanyDrivePageProps {
  onNavigate?: (path: string) => void;
}

export const CompanyDrivePage: React.FC<CompanyDrivePageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [driveUrl, setDriveUrl] = useState<string>('https://drive.google.com');
  const [configuredUrl, setConfiguredUrl] = useState<string | null>(null);
  const [driveRootFolderId, setDriveRootFolderId] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    api
      .getCompanyDrive()
      .then((res) => {
        if (!isMounted) return;
        if (res.driveUrl) setDriveUrl(res.driveUrl);
        setConfiguredUrl(res.configuredUrl);
        setDriveRootFolderId(res.driveRootFolderId);
        setIsGoogleConnected(res.isGoogleConnected);
      })
      .catch((err) => {
        console.warn('Failed to fetch company drive:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(driveUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDrive = () => {
    window.open(driveUrl, '_blank', 'noopener,noreferrer');
  };

  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  const folderCategories = [
    {
      title: 'Client Projects & Handovers',
      desc: 'Final deliverables, client review assets, source files, and approval packages indexed by client organisation.',
      icon: Layers,
      tag: 'Projects',
    },
    {
      title: 'Brand Book & Design Kit',
      desc: 'White Ink Design Studio typography, high-resolution vector logos, presentation decks, and brand styling guidelines.',
      icon: Sparkles,
      tag: 'Brand Assets',
    },
    {
      title: 'Raw Creative Production',
      desc: 'Figma workspace backups, Blender 3D scene files, Motion Graphics templates, and high-bitrate raw renders.',
      icon: FolderArchive,
      tag: 'Workfiles',
    },
    {
      title: 'Standard Operating Procedures',
      desc: 'Studio execution blueprints, project kickoff checklists, client intake templates, and internal guidelines.',
      icon: BookOpen,
      tag: 'Documentation',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner message="Connecting to White Ink Company Drive..." />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-[#FAF4EC] rounded-xl border border-[#EDE3D4] text-[#BA954F] shadow-2xs">
              <HardDrive className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#1C1917]">Company Drive</h1>
              <p className="text-xs text-[#78716C] mt-0.5">
                Centralized Google Drive repository for White Ink Design Studio staff and team members.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isStaff && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/settings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              <Settings className="h-3.5 w-3.5" />
              Drive Settings
            </button>
          )}
          <button
            type="button"
            onClick={handleOpenDrive}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl border border-[#A17B2F] shadow-sm transition-all cursor-pointer btn-hover-lift"
          >
            <ExternalLink className="h-4 w-4" />
            Open Drive in New Tab
          </button>
        </div>
      </div>

      {/* Hero Drive Launcher Card */}
      <div className="bg-gradient-to-br from-white via-[#FAF7F2] to-[#F5ECE0] border border-[#E8DEC8] rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
          <HardDrive className="w-64 h-64 text-[#BA954F]" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF4EC] border border-[#EAE0D0] text-[#BA954F] text-xs font-bold">
            <ShieldCheck className="h-3.5 w-3.5 text-[#BA954F]" />
            Official Studio Storage Vault
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#1C1917] tracking-tight">
            White Ink Design Studio Shared Cloud Drive
          </h2>

          <p className="text-xs sm:text-sm text-[#57534E] leading-relaxed">
            All team members, designers, and administrators have direct access to our centralized Google Drive.
            Use this space to upload work in progress, review handover packages, and download approved brand assets.
          </p>

          <div className="p-3 bg-white/90 backdrop-blur-xs border border-[#E5DDD0] rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <Folder className="h-4 w-4 text-[#BA954F] shrink-0" />
              <span className="text-xs font-mono text-[#443B30] truncate">
                {driveUrl}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white hover:bg-[#FAF7F2] text-[#1C1917] border border-[#DFD5C6] shadow-2xs transition-colors cursor-pointer"
                title="Copy Drive link"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy Link'}
              </button>

              <button
                type="button"
                onClick={handleOpenDrive}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#BA954F] hover:bg-[#A17B2F] text-white shadow-2xs transition-all cursor-pointer"
              >
                <span>Launch Drive</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#78716C] pt-1">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Google Drive Active
            </span>
            {driveRootFolderId && (
              <span>
                Root Folder ID: <strong className="font-mono text-[#443B30]">{driveRootFolderId}</strong>
              </span>
            )}
            {isGoogleConnected && (
              <span className="text-emerald-700 font-semibold">
                Super Admin Account Linked
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Directory Structure & Guidelines */}
      <div>
        <div className="mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#1C1917]">
            Drive Directory Structure & Organization
          </h3>
          <p className="text-xs text-[#78716C] mt-0.5">
            Follow standard studio filing conventions when storing assets and deliverables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {folderCategories.map((cat, idx) => {
            const Icon = cat.icon;
            return (
              <div
                key={idx}
                className="bg-white p-5 rounded-2xl border border-[#EDE7DD] shadow-2xs hover:border-[#DFD5C6] transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-[#FAF4EC] rounded-xl text-[#BA954F] border border-[#EAE0D0]">
                      <Icon className="h-4 w-4 stroke-[2]" />
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#78716C] border border-[#EDE7DD]">
                      {cat.tag}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#1C1917]">{cat.title}</h4>
                  <p className="text-xs text-[#57534E] leading-relaxed">{cat.desc}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-[#F5ECE0] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#BA954F]">Directory #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={handleOpenDrive}
                    className="text-[11px] font-bold text-[#1C1917] hover:text-[#BA954F] inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    Browse in Drive &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Internal Studio Notice */}
      <div className="p-4 bg-[#FAF7F2] border border-[#EAE0D0] rounded-2xl flex items-start gap-3 text-xs text-[#443B30] leading-relaxed">
        <FileCheck2 className="h-4 w-4 text-[#BA954F] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#1C1917]">White Ink Studio Storage Policy:</strong> Keep client folders segregated and never delete previous revision deliverables without prior approval from the Project Lead or Super Admin. For questions regarding Drive storage quotas, reach out to the administrator.
        </div>
      </div>
    </div>
  );
};
