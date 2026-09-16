import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { SOPDocument, Client } from '../types';
import { exportToCsv } from '../utils/csvExport';
import {
  BookOpen,
  Plus,
  Search,
  Tag,
  Edit2,
  Trash2,
  Download,
  Calendar,
  User as UserIcon,
  X,
  Palette,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Layers,
  Sparkles,
  Upload,
} from 'lucide-react';

export const SOPPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const isClient = role === 'CLIENT' || role === 'CLIENT_ADMIN';
  const isSuperAdminOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';

  // For Admin: toggle between Internal SOPs and Client Brand Books
  const [activeTab, setActiveTab] = useState<'sops' | 'brand_books'>(
    isClient ? 'brand_books' : 'sops'
  );

  const [sops, setSops] = useState<SOPDocument[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedClientFilter, setSelectedClientFilter] = useState('All');
  const [activeSOP, setActiveSOP] = useState<SOPDocument | null>(null);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);

  // Authoring / Upload Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    category: isClient ? 'Brand Guidelines' : 'Engineering',
    version: '1.0',
    tags: '',
    content: '',
    fileUrl: '',
    fileName: '',
    fileType: '',
    logoUrl: '',
    brandColors: '',
    typography: '',
    externalLink: '',
  });

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const sopCategories = [
    'All',
    'Engineering',
    'Design & UX',
    'HR & Onboarding',
    'Project Delivery',
    'Security & Compliance',
    'Quality Assurance',
  ];

  const brandBookCategories = [
    'All',
    'Brand Guidelines',
    'Logos & Graphics',
    'PDF Documents',
    'Color Palettes',
    'Typography',
    'Media Kit',
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const [sopRes, clientRes] = await Promise.all([
        api.getSOPs({
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: search || undefined,
        }),
        isSuperAdminOrAdmin ? api.getClients().catch(() => []) : Promise.resolve([]),
      ]);
      setSops(sopRes);
      setClients(clientRes);
      if (sopRes.length > 0 && !activeSOP) {
        setActiveSOP(sopRes[0]);
      }
    } catch (err) {
      console.error('Error loading SOPs/Brand Books:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedCategory, search]);

  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setForm((prev) => ({
            ...prev,
            fileUrl: reader.result as string,
            fileName: file.name,
            fileType: file.type || 'application/pdf',
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setForm((prev) => ({
            ...prev,
            logoUrl: reader.result as string,
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenCreate = () => {
    setForm({
      title: '',
      category: isClient || activeTab === 'brand_books' ? 'Brand Guidelines' : 'Engineering',
      version: '1.0',
      tags: isClient || activeTab === 'brand_books' ? 'Brand Assets, Guidelines' : 'Process, Guidelines',
      content: '',
      fileUrl: '',
      fileName: '',
      fileType: '',
      logoUrl: '',
      brandColors: '#BA954F, #1C1917, #FAF7F2',
      typography: 'Playfair Display, Inter',
      externalLink: '',
    });
    setIsEditing(false);
    setCurrentId(null);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sop: SOPDocument) => {
    setForm({
      title: sop.title,
      category: sop.category,
      version: sop.version,
      tags: sop.tags || '',
      content: sop.content,
      fileUrl: sop.fileUrl || '',
      fileName: sop.fileName || '',
      fileType: sop.fileType || '',
      logoUrl: sop.logoUrl || '',
      brandColors: sop.brandColors || '',
      typography: sop.typography || '',
      externalLink: '',
    });
    setIsEditing(true);
    setCurrentId(sop.id);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setModalError('Title and description/content are required.');
      return;
    }

    try {
      setModalLoading(true);
      setModalError('');

      const payload = {
        title: form.title.trim(),
        category: form.category,
        version: form.version.trim() || '1.0',
        tags: form.tags.trim() || undefined,
        content: form.content.trim(),
        fileUrl: form.fileUrl || undefined,
        fileName: form.fileName || undefined,
        fileType: form.fileType || undefined,
        logoUrl: form.logoUrl || undefined,
        brandColors: form.brandColors.trim() || undefined,
        typography: form.typography.trim() || undefined,
      };

      if (isEditing && currentId) {
        const updated = await api.updateSOP(currentId, payload);
        setActiveSOP(updated.sop);
      } else {
        const created = await api.createSOP(payload);
        setActiveSOP(created.sop);
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save document');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to remove "${title}"?`)) return;
    try {
      await api.deleteSOP(id);
      const remaining = sops.filter((s) => s.id !== id);
      setSops(remaining);
      if (activeSOP?.id === id) {
        setActiveSOP(remaining[0] || null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const handleExportCSV = () => {
    const rows = displayedItems.map((s) => ({
      id: s.id,
      title: s.title,
      category: s.category,
      version: s.version,
      tags: s.tags || '',
      author: s.createdBy?.name || 'Unknown',
      brandColors: s.brandColors || '',
      typography: s.typography || '',
      createdAt: new Date(s.createdAt).toLocaleDateString(),
      updatedAt: new Date(s.updatedAt).toLocaleDateString(),
    }));

    exportToCsv(
      (isClient ? 'Brand_Book_Catalog_' : 'SOP_Catalog_') +
        new Date().toISOString().split('T')[0],
      rows,
      [
        { key: 'title', label: 'Document Title' },
        { key: 'category', label: 'Category' },
        { key: 'version', label: 'Version' },
        { key: 'tags', label: 'Tags' },
        { key: 'author', label: 'Created By' },
        { key: 'brandColors', label: 'Brand Colors' },
        { key: 'typography', label: 'Typography' },
        { key: 'updatedAt', label: 'Last Updated' },
      ]
    );
  };

  // Filter items based on active tab and search
  const isBrandBookItem = (doc: SOPDocument) =>
    doc.category.toLowerCase().includes('brand') ||
    doc.category.toLowerCase().includes('logo') ||
    doc.category.toLowerCase().includes('pdf') ||
    doc.category.toLowerCase().includes('color') ||
    doc.category.toLowerCase().includes('typography') ||
    doc.category.toLowerCase().includes('media') ||
    Boolean(doc.logoUrl) ||
    Boolean(doc.fileUrl) ||
    Boolean(doc.brandColors);

  const displayedItems = sops.filter((item) => {
    if (isClient) return true; // Clients always see their Brand Book items
    if (activeTab === 'brand_books') {
      const matchBrand = isBrandBookItem(item);
      const matchClient =
        selectedClientFilter === 'All' || item.createdById === selectedClientFilter;
      return matchBrand && matchClient;
    }
    // SOP tab for internal staff
    return !isBrandBookItem(item);
  });

  return (
    <>
      <div
        className={`space-y-6 max-w-7xl mx-auto pb-14 transition-all duration-300 ${
          isModalOpen ? 'filter blur-[5px] opacity-50 pointer-events-none select-none' : ''
        }`}
      >
        {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1C1917] flex items-center gap-2.5">
            {isClient ? (
              <>
                <Palette className="h-6 w-6 text-[#BA954F] stroke-[2]" />
                Brand Book & Assets
              </>
            ) : (
              <>
                <BookOpen className="h-6 w-6 text-[#BA954F] stroke-[2]" />
                SOPs & Client Brand Books
              </>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-[#78716C] font-normal mt-1">
            {isClient
              ? 'Upload, organize, and manage your official brand assets, guideline PDFs, logos, typography, and color palette hex codes.'
              : 'Internal operational guidelines alongside client-uploaded brand books, style assets, and identity packages.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-[#FAF7F2] text-[#1C1917] text-xs font-semibold rounded-xl border border-[#DFD5C6] shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-[#BA954F]" />
            Export Catalog
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer btn-hover-lift"
          >
            <Plus className="h-4 w-4 stroke-[2]" />
            {isClient ? 'Upload Brand Asset / Guide' : 'New Document'}
          </button>
        </div>
      </div>

      {/* Admin Tabs (SOPs vs Client Brand Books) */}
      {!isClient && (
        <div className="flex items-center gap-3 border-b border-[#EDE7DD] pb-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('sops');
              setSelectedCategory('All');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'sops'
                ? 'bg-[#BA954F] text-white shadow-xs'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Standard Operating Procedures (SOPs)
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('brand_books');
              setSelectedCategory('All');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'brand_books'
                ? 'bg-[#BA954F] text-white shadow-xs'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2]'
            }`}
          >
            <Palette className="h-4 w-4" />
            Client Brand Books & Guidelines
          </button>
        </div>
      )}

      {/* Filter Toolbar & Category Pills */}
      <div className="bg-white p-4 rounded-2xl border border-[#EDE7DD] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#A8A29E]" />
            <input
              type="text"
              placeholder={
                isClient || activeTab === 'brand_books'
                  ? 'Search brand guidelines, logo assets, typography, colors...'
                  : 'Search SOP titles, tags, or guidelines...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] bg-white text-[#1C1917] placeholder-[#A8A29E]"
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {!isClient && activeTab === 'brand_books' && clients.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#8C7E72]" />
                <select
                  value={selectedClientFilter}
                  onChange={(e) => setSelectedClientFilter(e.target.value)}
                  className="text-xs font-semibold py-1.5 px-3 bg-white border border-[#DFD5C6] rounded-xl text-[#1C1917] shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#BA954F]"
                >
                  <option value="All">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="text-xs text-[#78716C] font-medium">
              Showing <span className="font-bold text-[#1C1917]">{displayedItems.length}</span>{' '}
              {isClient || activeTab === 'brand_books' ? 'brand documents' : 'procedures'}
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-thin">
          {(isClient || activeTab === 'brand_books' ? brandBookCategories : sopCategories).map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#BA954F] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#57534E] border border-[#EDE7DD] hover:bg-[#F5EFE6] hover:text-[#1C1917]'
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Grid Split View */}
      {loading ? (
        <div className="p-16 text-center text-[#78716C] bg-white rounded-2xl border border-[#EDE7DD] shadow-xs">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-[#BA954F] border-t-transparent mb-3" />
          <p className="text-sm font-medium">Loading documents...</p>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="p-16 text-center text-[#78716C] bg-white rounded-2xl border border-[#EDE7DD] shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FAF4EC] border border-[#EDE3D4] flex items-center justify-center text-[#BA954F] mx-auto mb-3 shadow-2xs">
            {isClient || activeTab === 'brand_books' ? (
              <Palette className="h-7 w-7 stroke-[1.75]" />
            ) : (
              <BookOpen className="h-7 w-7 stroke-[1.75]" />
            )}
          </div>
          <h3 className="text-base font-serif font-bold text-[#1C1917]">
            {isClient || activeTab === 'brand_books'
              ? 'No brand book assets found'
              : 'No SOP documents found'}
          </h3>
          <p className="text-xs text-[#78716C] mt-1 max-w-sm mx-auto font-normal">
            {search || selectedCategory !== 'All'
              ? 'No documents match your search filters.'
              : isClient
              ? 'Upload your official brand guidelines, PDFs, color palette hex codes, and logo assets.'
              : 'Standard operating procedures and client brand guidelines will appear here.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer btn-hover-lift"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2]" />
            {isClient ? 'Upload First Brand Asset' : 'Create First Document'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Document Cards List */}
          <div className="lg:col-span-5 space-y-3">
            {displayedItems.map((item) => {
              const isActive = activeSOP?.id === item.id;
              const colorArray = item.brandColors
                ? item.brandColors.split(',').map((c) => c.trim()).filter(Boolean)
                : [];

              return (
                <div
                  key={item.id}
                  onClick={() => setActiveSOP(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FAF4EC] border-[#DFD5C6] shadow-xs'
                      : 'bg-white border-[#EDE7DD] hover:border-[#DFD5C6] hover:bg-[#FAF7F2]/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#BA954F] border border-[#EDE7DD]">
                      {item.category}
                    </span>
                    <span className="text-[10px] font-mono text-[#8C7E72]">
                      v{item.version}
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    {item.logoUrl ? (
                      <img
                        src={item.logoUrl}
                        alt="Logo"
                        className="h-10 w-10 rounded-xl object-contain border border-[#EDE7DD] bg-white p-1 shrink-0 shadow-2xs"
                      />
                    ) : item.fileUrl ? (
                      <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#EDE7DD] flex items-center justify-center text-[#BA954F] shrink-0 shadow-2xs">
                        <FileText className="h-5 w-5 stroke-[1.75]" />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-xl bg-[#FAF7F2] border border-[#EDE7DD] flex items-center justify-center text-[#BA954F] shrink-0 shadow-2xs">
                        <Palette className="h-5 w-5 stroke-[1.75]" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-[#1C1917] truncate leading-tight">
                        {item.title}
                      </h4>
                      <p className="text-xs text-[#78716C] line-clamp-2 mt-1 font-normal">
                        {item.content}
                      </p>
                    </div>
                  </div>

                  {/* Brand Color Swatches preview on card */}
                  {colorArray.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-[#EDE7DD]/60">
                      <span className="text-[10px] font-semibold text-[#8C7E72]">Palette:</span>
                      <div className="flex items-center gap-1">
                        {colorArray.slice(0, 5).map((hex) => (
                          <span
                            key={hex}
                            style={{ backgroundColor: hex }}
                            title={hex}
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs inline-block shrink-0"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PDF Attachment badge on card */}
                  {item.fileName && (
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#BA954F] font-semibold">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate">{item.fileName}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Full Document Detail Viewer */}
          <div className="lg:col-span-7">
            {activeSOP ? (
              <div className="bg-white rounded-2xl border border-[#EDE7DD] p-6 shadow-xs space-y-6">
                {/* Viewer Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#EDE7DD]">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4]">
                        {activeSOP.category}
                      </span>
                      <span className="text-xs font-mono font-medium text-[#78716C] bg-[#FAF7F2] px-2 py-0.5 rounded-lg border border-[#EDE7DD]">
                        Version {activeSOP.version}
                      </span>
                    </div>
                    <h2 className="text-xl font-serif font-bold text-[#1C1917] leading-snug">
                      {activeSOP.title}
                    </h2>
                    <div className="flex items-center gap-4 text-xs text-[#78716C] pt-1 font-mono">
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-3.5 w-3.5 text-[#BA954F]" />
                        {activeSOP.createdBy?.name || 'Studio Team'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-[#BA954F]" />
                        {new Date(activeSOP.updatedAt || activeSOP.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(activeSOP)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#443B30] bg-[#FAF7F2] hover:bg-[#F5EFE6] rounded-xl border border-[#DFD5C6] transition-colors cursor-pointer shadow-2xs"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-[#BA954F]" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(activeSOP.id, activeSOP.title)}
                      className="p-1.5 text-[#A8A29E] hover:text-[#B91C1C] hover:bg-[#FDF2F0] rounded-xl transition-colors cursor-pointer"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Logo & Visual Graphic Banner */}
                {activeSOP.logoUrl && (
                  <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#EDE7DD] flex flex-col sm:flex-row items-center gap-5">
                    <img
                      src={activeSOP.logoUrl}
                      alt="Brand Logo"
                      className="h-20 w-auto max-w-[12rem] object-contain rounded-xl bg-white p-2 border border-[#EDE7DD] shadow-2xs"
                    />
                    <div className="space-y-1 text-center sm:text-left">
                      <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                        Brand Logo Asset
                      </span>
                      <p className="text-xs text-[#78716C]">
                        Official primary logo asset and graphic identity mark.
                      </p>
                      <a
                        href={activeSOP.logoUrl}
                        download={`${activeSOP.title}-logo`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#BA954F] hover:underline pt-1"
                      >
                        <Download className="h-3.5 w-3.5" /> Download Full Resolution Logo
                      </a>
                    </div>
                  </div>
                )}

                {/* Color Palette Display */}
                {activeSOP.brandColors && (
                  <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#EDE7DD] space-y-3">
                    <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="h-4 w-4 text-[#BA954F]" />
                      Brand Color Palette
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                      {activeSOP.brandColors
                        .split(',')
                        .map((c) => c.trim())
                        .filter(Boolean)
                        .map((hex) => (
                          <div
                            key={hex}
                            onClick={() => handleCopyColor(hex)}
                            className="bg-white p-2.5 rounded-xl border border-[#EDE7DD] shadow-2xs flex items-center gap-2.5 cursor-pointer hover:border-[#BA954F] transition-all group"
                          >
                            <span
                              style={{ backgroundColor: hex }}
                              className="w-7 h-7 rounded-lg border border-black/10 shadow-inner shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-mono font-bold text-[#1C1917] block truncate">
                                {hex}
                              </span>
                              <span className="text-[10px] text-[#8C7E72] flex items-center gap-1">
                                {copiedHex === hex ? (
                                  <>
                                    <Check className="h-3 w-3 text-[#2D6A4F]" /> Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" /> Click to copy
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Typography Guidelines */}
                {activeSOP.typography && (
                  <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EDE7DD] flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-[#8C7E72] uppercase tracking-wider">
                        Typography Specifications
                      </span>
                      <p className="text-sm font-semibold text-[#1C1917]">
                        {activeSOP.typography}
                      </p>
                    </div>
                  </div>
                )}

                {/* PDF Document Attachment Section */}
                {activeSOP.fileUrl && (
                  <div className="p-4 rounded-2xl bg-[#FAF4EC] border border-[#EDE3D4] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-white text-[#BA954F] rounded-xl border border-[#EDE3D4] shadow-2xs">
                        <FileText className="h-5 w-5 stroke-[1.75]" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-[#1C1917] block truncate">
                          {activeSOP.fileName || 'Brand_Guidelines_Document.pdf'}
                        </span>
                        <span className="text-[11px] text-[#78716C]">
                          Attached PDF / Brand Asset Document
                        </span>
                      </div>
                    </div>

                    <a
                      href={activeSOP.fileUrl}
                      download={activeSOP.fileName || 'Brand_Guidelines.pdf'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download File
                    </a>
                  </div>
                )}

                {/* Description & Written Guidelines */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                    Guidelines & Notes
                  </span>
                  <div className="text-xs sm:text-sm text-[#443B30] leading-relaxed whitespace-pre-wrap font-normal p-4 bg-[#FAF7F2]/40 rounded-xl border border-[#EDE7DD]">
                    {activeSOP.content}
                  </div>
                </div>

                {/* Tags */}
                {activeSOP.tags && (
                  <div className="pt-2 border-t border-[#EDE7DD] flex items-center gap-1.5 flex-wrap">
                    <Tag className="h-3.5 w-3.5 text-[#8C7E72]" />
                    {activeSOP.tags.split(',').map((t) => (
                      <span
                        key={t.trim()}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#FAF7F2] text-[#78716C] border border-[#EDE7DD]"
                      >
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#EDE7DD] p-12 text-center text-[#78716C]">
                Select a document from the left list to view details.
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* Authoring & Upload Modal (Centered on Screen, Compact, 50% Backdrop Blur) */}
      {isModalOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[6px] transition-all animate-fadeIn">
            <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-[#EDE7DD] space-y-4 max-h-[85vh] overflow-y-auto animate-gold-fade-in">
              <div className="flex items-center justify-between border-b border-[#EDE7DD] pb-3">
                <h2 className="text-base font-serif font-bold text-[#1C1917] flex items-center gap-2">
                  <Palette className="h-5 w-5 text-[#BA954F] stroke-[2]" />
                  {isEditing
                    ? isClient || activeTab === 'brand_books'
                      ? 'Edit Brand Book Document'
                      : 'Edit SOP Document'
                    : isClient || activeTab === 'brand_books'
                    ? 'Upload Brand Asset / Guide'
                    : 'Create Standard Operating Procedure'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-[#78716C] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-xl cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {modalError && (
                <div className="p-3 bg-[#FDF2F0] border border-[#F5D5D0] text-[#B91C1C] text-xs font-medium rounded-xl">
                  {modalError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                      Document / Asset Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        isClient || activeTab === 'brand_books'
                          ? 'e.g. Acme Corp Brand Guidelines 2026, Master Logo Pack'
                          : 'e.g. Design Handover Checklist, Production QA Procedure'
                      }
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] focus:outline-none bg-white text-[#1C1917]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                        Category *
                      </label>
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] focus:outline-none bg-white text-[#1C1917] cursor-pointer"
                      >
                        {(isClient || activeTab === 'brand_books'
                          ? brandBookCategories.filter((c) => c !== 'All')
                          : sopCategories.filter((c) => c !== 'All')
                        ).map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                        Version
                      </label>
                      <input
                        type="text"
                        placeholder="1.0"
                        value={form.version}
                        onChange={(e) => setForm({ ...form, version: e.target.value })}
                        className="w-full px-3 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] focus:outline-none bg-white text-[#1C1917]"
                      />
                    </div>
                  </div>
                </div>

                {/* Brand Asset Uploads & Styling Section */}
                {(isClient || activeTab === 'brand_books') && (
                  <div className="bg-[#FAF7F2] p-3.5 rounded-xl border border-[#EDE7DD] space-y-3">
                    <span className="text-[11px] font-bold text-[#BA954F] uppercase tracking-wider block">
                      Brand Assets & Media
                    </span>

                    {/* Logo Upload / URL */}
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                        Brand Logo (Upload or URL)
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF7F2] text-[#443B30] border border-[#DFD5C6] text-xs font-semibold rounded-xl cursor-pointer shadow-2xs transition-colors shrink-0">
                          <ImageIcon className="h-3.5 w-3.5 text-[#BA954F]" />
                          Upload
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                          />
                        </label>
                        <input
                          type="url"
                          placeholder="Or image URL (https://...)"
                          value={form.logoUrl}
                          onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                          className="flex-1 px-3 py-1.5 text-xs border border-[#DFD5C6] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20"
                        />
                      </div>
                    </div>

                    {/* PDF Document Upload */}
                    <div>
                      <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                        Brand Guidelines PDF / Document
                      </label>
                      <div className="flex items-center gap-2">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF7F2] text-[#443B30] border border-[#DFD5C6] text-xs font-semibold rounded-xl cursor-pointer shadow-2xs transition-colors shrink-0">
                          <Upload className="h-3.5 w-3.5 text-[#BA954F]" />
                          Upload PDF
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.zip,.png,.jpg,.svg"
                            className="hidden"
                            onChange={handleFileUpload}
                          />
                        </label>
                        <span className="text-xs text-[#78716C] truncate flex-1">
                          {form.fileName || 'No PDF/file selected'}
                        </span>
                      </div>
                    </div>

                    {/* Color Palettes & Typography */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                          Color Palette (HEX Codes)
                        </label>
                        <input
                          type="text"
                          placeholder="#BA954F, #1C1917, #FAF7F2"
                          value={form.brandColors}
                          onChange={(e) => setForm({ ...form, brandColors: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-[#DFD5C6] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                          Typography Fonts
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Playfair Display, Inter"
                          value={form.typography}
                          onChange={(e) => setForm({ ...form, typography: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs border border-[#DFD5C6] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Guidelines / Content Description */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Description & Guidelines *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Detail the brand guidelines, identity vision, or procedural steps..."
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] focus:outline-none bg-white text-[#1C1917]"
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-xs font-semibold text-[#1C1917] mb-1">
                    Tags (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Brand, Identity, Vector Logo, Typography, 2026"
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs sm:text-sm border border-[#DFD5C6] rounded-xl focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] focus:outline-none bg-white text-[#1C1917]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#EDE7DD]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#443B30] bg-white hover:bg-[#FAF7F2] border border-[#DFD5C6] rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-xs btn-hover-lift"
                  >
                    {modalLoading ? 'Saving...' : 'Save Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
