import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { IssuedCredential, Role } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import {
  KeyRound,
  Search,
  Copy,
  Check,
  Eye,
  EyeOff,
  Mail,
  Building2,
  Key,
  Sparkles,
  Info,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export const CredentialsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [credentials, setCredentials] = useState<IssuedCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inline Password Change state
  const [activeEditCredId, setActiveEditCredId] = useState<string | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  const loadCredentials = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getIssuedCredentials();
      setCredentials(data || []);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = (cred: IssuedCredential) => {
    const text = `White Ink Portal Login Credentials\nEmail: ${cred.email}\nPassword: ${cred.plaintextPassword}`;
    navigator.clipboard.writeText(text);
    setCopiedId(cred.id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2500);
  };

  const handleUpdatePassword = async (cred: IssuedCredential, newPassword?: string) => {
    if (newPassword && newPassword.length < 6) {
      setUpdateError('Password must be at least 6 characters long.');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const res = await api.updateCredentialPassword(cred.userId, newPassword);

      // Update the credential in state immediately
      setCredentials((prev) =>
        prev.map((c) =>
          c.id === cred.id || c.userId === cred.userId
            ? {
                ...c,
                plaintextPassword: res.plaintextPassword,
                createdAt: new Date().toISOString(),
              }
            : c
        )
      );

      // Automatically reveal this password so the admin sees the updated password immediately
      setRevealedIds((prev) => new Set(prev).add(cred.id));

      // Reset inline form
      setActiveEditCredId(null);
      setCustomPassword('');
      setUpdateSuccess(`Password for ${cred.email} updated successfully!`);
      setTimeout(() => setUpdateSuccess(null), 4000);

      // Refresh list from server
      loadCredentials();
    } catch (err: any) {
      setUpdateError(err.message || 'Failed to update user password.');
    } finally {
      setIsUpdating(false);
    }
  };

  const filtered = credentials.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = c.user?.name?.toLowerCase().includes(q) || false;
    const emailMatch = c.email.toLowerCase().includes(q);
    const companyMatch = (c.user as any)?.companyName?.toLowerCase().includes(q) || false;
    return nameMatch || emailMatch || companyMatch;
  });

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-black text-gold-400 border border-gold-600 shadow-2xs">
            Super Admin
          </span>
        );
      case 'ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-gold-200 text-black border border-gold-400">
            Admin
          </span>
        );
      case 'CLIENT_ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-gold-400 text-black border border-gold-600 shadow-2xs">
            Client Admin
          </span>
        );
      case 'TEAM_MEMBER':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gold-100 text-black border border-gold-300">
            Team Member
          </span>
        );
      case 'CLIENT':
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-white text-black border border-gold-300">
            Client Partner
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-gold-50 text-black border border-gold-200">
            User
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-gold-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gold-100 rounded-lg border border-gold-300 text-gold-700">
              <KeyRound className="h-5 w-5 stroke-[2.5]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-heading">Credentials Vault</h1>
          </div>
          <p className="text-sm text-neutral-600 mt-1">
            Comprehensive system vault of credentials. Super Admin can view, copy, and rotate passwords for any staff or client account.
          </p>
        </div>
      </div>

      {/* Success banner */}
      {updateSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 font-semibold animate-gold-fade-in shadow-2xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{updateSuccess}</span>
        </div>
      )}

      {/* Info notice */}
      <div className="p-4 bg-gold-50/70 border border-gold-300 rounded-xl flex items-start gap-3 text-xs text-neutral-800 leading-relaxed font-medium">
        <Info className="h-4 w-4 text-gold-700 shrink-0 mt-0.5" />
        <div>
          This vault stores active and auto-generated passwords for Admins, Team Members, and Clients. Use <strong>Change Password</strong> on any record to automatically generate a new strong password or assign a custom one.
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-card p-3.5 rounded-xl border border-gold-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-700" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search credentials by name, email, or company..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-gold-50/50 border border-gold-200 rounded-lg text-heading focus:outline-none focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        <div className="text-xs font-semibold text-neutral-600">
          Total Issued: <span className="font-bold text-black">{filtered.length}</span>
        </div>
      </div>

      {/* Credentials Table */}
      {isLoading ? (
        <LoadingSpinner message="Retrieving credentials vault..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No credentials found"
          description={
            search
              ? 'No issued credentials matched your search query.'
              : 'No member credentials have been generated yet.'
          }
        />
      ) : (
        <div className="bg-white rounded-xl border border-gold-300 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gold-50 border-b border-gold-200 text-xs uppercase tracking-wider text-black/80 font-bold">
                <tr>
                  <th className="px-5 py-3.5">Recipient</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Organization</th>
                  <th className="px-5 py-3.5">Password</th>
                  <th className="px-5 py-3.5">Issued By</th>
                  <th className="px-5 py-3.5">Last Updated</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-200 text-heading">
                {filtered.map((cred) => {
                  const isRevealed = revealedIds.has(cred.id);
                  const isJustCopied = copiedId === cred.id;
                  const isEditingThis = activeEditCredId === cred.id;

                  return (
                    <React.Fragment key={cred.id}>
                      <tr className="hover:bg-gold-50/40 transition-colors">
                        <td className="px-5 py-4">
                          <div className="font-bold text-black">{cred.user?.name || 'Authorized Member'}</div>
                          <div className="text-xs text-neutral-600 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-gold-600" />
                            {cred.email}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {getRoleBadge(cred.user?.role)}
                        </td>

                        <td className="px-5 py-4">
                          {(cred.user as any)?.companyName ? (
                            <span className="font-medium text-black flex items-center gap-1.5 text-xs">
                              <Building2 className="h-3.5 w-3.5 text-neutral-500" />
                              {(cred.user as any).companyName}
                            </span>
                          ) : (
                            <span className="text-xs text-neutral-500 italic">White Ink Design Studio</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-sm bg-gold-50/60 px-3 py-1.5 rounded-lg border border-gold-300 text-black select-all min-w-[150px] tracking-wider font-semibold">
                              {isRevealed ? cred.plaintextPassword : '••••••••••••'}
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleReveal(cred.id)}
                              className="p-1.5 text-neutral-600 hover:text-black hover:bg-gold-100 rounded-md transition-colors cursor-pointer"
                              title={isRevealed ? 'Mask password' : 'Show password'}
                            >
                              {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-xs text-neutral-700">
                          {cred.createdBy ? (
                            <div>
                              <div className="font-semibold text-black">{cred.createdBy.name}</div>
                              <div className="text-[11px] text-neutral-500">{cred.createdBy.role}</div>
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic">System Auto</span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs text-neutral-600 whitespace-nowrap">
                          <div>{new Date(cred.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</div>
                          <div className="text-[11px] text-neutral-500">
                            {new Date(cred.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditingThis) {
                                  setActiveEditCredId(null);
                                  setCustomPassword('');
                                  setUpdateError(null);
                                } else {
                                  setActiveEditCredId(cred.id);
                                  setCustomPassword('');
                                  setUpdateError(null);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                isEditingThis
                                  ? 'bg-neutral-800 text-white border-neutral-900'
                                  : 'bg-white hover:bg-gold-50 text-black border-gold-300 btn-hover-lift'
                              }`}
                            >
                              <Key className="h-3.5 w-3.5 text-gold-700" />
                              Change Password
                            </button>

                            <button
                              type="button"
                              onClick={() => handleCopy(cred)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                                isJustCopied
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-400'
                                  : 'bg-gold-400 hover:bg-gold-500 text-black border-gold-600 btn-hover-lift'
                              }`}
                            >
                              {isJustCopied ? <Check className="h-3.5 w-3.5 stroke-[2.5]" /> : <Copy className="h-3.5 w-3.5" />}
                              {isJustCopied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline Change Password Expansion Row */}
                      {isEditingThis && (
                        <tr className="bg-gold-50/90 border-y-2 border-gold-400 animate-gold-fade-in">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-black text-xs sm:text-sm">
                                    Update Password for {cred.user?.name || cred.email}
                                  </span>
                                  <span className="text-[11px] font-mono text-neutral-600 bg-white px-2 py-0.5 rounded border border-gold-200">
                                    {cred.email}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-600 mt-0.5">
                                  Generate a random password or type a custom password (minimum 6 characters).
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleUpdatePassword(cred, undefined)}
                                  className="btn-primary inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer shadow-xs btn-hover-lift"
                                >
                                  {isUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                  Generate Random Password
                                </button>

                                <span className="text-xs font-bold text-neutral-400">OR</span>

                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Enter custom password..."
                                    value={customPassword}
                                    onChange={(e) => setCustomPassword(e.target.value)}
                                    className="px-3 py-1.5 text-xs bg-white border border-gold-300 rounded-lg text-black focus:outline-none focus:ring-1 focus:ring-gold-500 font-mono min-w-[160px]"
                                  />
                                  <button
                                    type="button"
                                    disabled={isUpdating || customPassword.trim().length < 6}
                                    onClick={() => handleUpdatePassword(cred, customPassword.trim())}
                                    className="px-3 py-1.5 text-xs font-bold text-black bg-gold-400 hover:bg-gold-500 border border-gold-600 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                                  >
                                    Apply
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveEditCredId(null);
                                    setCustomPassword('');
                                    setUpdateError(null);
                                  }}
                                  className="px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-white border border-gold-200 hover:bg-gold-100 rounded-lg transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>

                            {updateError && (
                              <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-800 font-medium">
                                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                                {updateError}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
