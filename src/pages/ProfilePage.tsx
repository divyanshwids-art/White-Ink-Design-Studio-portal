import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Shield, Mail, CheckCircle2, FolderKanban, CheckSquare, Key, Eye, EyeOff, AlertCircle, Loader2, User, Sparkles, Lock } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [assignedProjectsCount, setAssignedProjectsCount] = useState<number>(0);
  const [assignedTasksCount, setAssignedTasksCount] = useState<number>(0);
  const [completedTasksCount, setCompletedTasksCount] = useState<number>(0);

  // Edit Profile Details State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImage || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfileImageUrl(user.profileImage || '');
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    if (!profileName.trim()) {
      setProfileError('Name is required.');
      return;
    }
    if (!user?.id) {
      setProfileError('User session not found.');
      return;
    }
    setProfileLoading(true);
    try {
      await api.updateUser(user.id, {
        name: profileName.trim(),
        profileImage: profileImageUrl.trim() || undefined,
      });
      await refreshUser();
      setProfileSuccess('Profile details updated successfully.');
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile details.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Voluntary Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setPasswordSuccess(res.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  useEffect(() => {
    async function loadUserStats() {
      try {
        const [projects, tasks] = await Promise.all([
          api.getProjects(),
          api.getTasks(),
        ]);
        setAssignedProjectsCount(projects.length);
        const myTasks = tasks.filter((t) => t.assignedToId === user?.id);
        setAssignedTasksCount(myTasks.length);
        setCompletedTasksCount(myTasks.filter((t) => t.status === 'COMPLETED').length);
      } catch (err) {
        console.error('Failed to load user stats:', err);
      }
    }
    if (user) {
      loadUserStats();
    }
  }, [user]);

  const getRoleDescription = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
        return 'Full unrestricted administrative privileges across the entire studio platform, team authorization management, project pipelines, client portals, and system settings.';
      case 'ADMIN':
        return 'Studio manager permissions allowing project initiation, task delegation, client collaboration, and milestone sign-offs.';
      case 'TEAM_MEMBER':
        return 'Architectural and interior design studio access. View assigned projects, track tasks, update deliverables, and log attendance.';
      case 'CLIENT_ADMIN':
        return 'Client administrator portal. Manage your company team members, oversee contracted design projects, review drawings, and approve deliverables.';
      case 'CLIENT':
        return 'External client stakeholder portal. Monitor linked design stages, review drawings and specification packages, and approve project phases.';
      default:
        return 'Standard studio workspace access.';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'WI';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  };

  const permissionsList = [
    { name: 'View Dashboard & Analytics', allowed: true },
    { name: 'Create & Manage Projects', allowed: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' },
    { name: 'Create & Manage Tasks', allowed: user?.role !== 'CLIENT' && user?.role !== 'CLIENT_ADMIN' },
    { name: 'Update Task Progress & Move Kanban', allowed: user?.role !== 'CLIENT' && user?.role !== 'CLIENT_ADMIN' },
    { name: 'Post Comments in Projects', allowed: true },
    { name: 'Manage Client Accounts', allowed: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' },
    { name: 'Manage User Accounts & Roles', allowed: user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'CLIENT_ADMIN' },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold tracking-widest uppercase text-[#BA954F]">
          Account & Preferences
        </span>
        <h1 className="font-serif text-3xl font-bold text-neutral-900 tracking-tight mt-1">User Profile</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Personal credentials, studio role permissions, and active workspace metrics
        </p>
      </div>

      {/* Main Profile Hero Card (Reference Screen 10 Replica) */}
      <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Monogram Badge */}
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user?.name}
              className="h-24 w-24 rounded-full border-2 border-[#BA954F]/30 object-cover shadow-sm ring-4 ring-[#FAF7F2]"
            />
          ) : (
            <div className="h-24 w-24 rounded-full bg-[#FAF7F2] border-2 border-[#BA954F]/30 flex items-center justify-center text-2xl font-serif font-bold text-[#BA954F] ring-4 ring-[#FAF7F2] shadow-inner">
              {getInitials(user?.name)}
            </div>
          )}

          <div className="text-center sm:text-left space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <h2 className="font-serif text-2xl font-bold text-neutral-900 tracking-tight">{user?.name}</h2>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-0.5 rounded-full bg-[#FAF7F2] text-[#BA954F] border border-[#EDE7DD]">
                <Sparkles className="h-3 w-3" />
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-neutral-500 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="h-3.5 w-3.5 text-[#BA954F]" />
              {user?.email}
            </p>
            <p className="text-xs text-neutral-600 pt-1 leading-relaxed max-w-xl">
              {getRoleDescription()}
            </p>
          </div>
        </div>

        {/* User Workspace Metrics Bento */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-[#EDE7DD]">
          <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EDE7DD] flex items-center gap-3.5">
            <div className="p-2.5 bg-white text-[#BA954F] border border-[#EDE7DD] rounded-xl shadow-xs">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-serif text-neutral-900">{assignedProjectsCount}</div>
              <div className="text-xs font-medium text-neutral-500">Accessible Projects</div>
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EDE7DD] flex items-center gap-3.5">
            <div className="p-2.5 bg-white text-[#BA954F] border border-[#EDE7DD] rounded-xl shadow-xs">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-serif text-neutral-900">{assignedTasksCount}</div>
              <div className="text-xs font-medium text-neutral-500">Assigned Tasks</div>
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EDE7DD] flex items-center gap-3.5">
            <div className="p-2.5 bg-white text-[#BA954F] border border-[#EDE7DD] rounded-xl shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xl font-bold font-serif text-neutral-900">{completedTasksCount}</div>
              <div className="text-xs font-medium text-neutral-500">Completed Tasks</div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Permissions Matrix */}
      {user?.role !== 'CLIENT' && user?.role !== 'CLIENT_ADMIN' && (
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-6 space-y-4">
          <h3 className="font-serif text-base font-bold text-neutral-900 flex items-center gap-2">
            <Shield className="h-4 w-4 text-[#BA954F]" />
            Studio Role Permissions
          </h3>

          <div className="divide-y divide-[#F3EDE2]">
            {permissionsList.map((perm) => (
              <div
                key={perm.name}
                className="py-3 flex items-center justify-between text-xs text-neutral-800 font-medium"
              >
                <span>{perm.name}</span>
                {perm.allowed ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#EBF3ED] text-[#2D6A4F] font-semibold border border-[#D1E7D8] text-[11px]">
                    Granted
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FAF7F2] text-neutral-400 font-medium border border-[#EDE7DD] text-[11px]">
                    Restricted
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Profile Card */}
      <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#EDE7DD] bg-[#FAF7F2]/50">
          <h2 className="font-serif text-base font-bold text-neutral-900 flex items-center gap-2">
            <User className="h-4 w-4 text-[#BA954F]" />
            Edit Profile Information
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Update your public display name and avatar photo URL
          </p>
        </div>

        <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-2">
            {profileImageUrl.trim() ? (
              <img
                src={profileImageUrl.trim()}
                alt="Profile Preview"
                className="h-14 w-14 rounded-full border border-[#EDE7DD] object-cover shadow-xs"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                    profileName.trim() || 'User'
                  )}`;
                }}
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-[#FAF7F2] border border-[#EDE7DD] flex items-center justify-center font-serif font-bold text-[#BA954F]">
                {getInitials(profileName || user?.name)}
              </div>
            )}
            <div className="text-xs text-neutral-500 flex-1 text-center sm:text-left">
              <span className="font-semibold text-neutral-900 block mb-0.5">Avatar Preview</span>
              <span>Displays in the top navigation bar, sidebar, project comments, and team activity.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Full Name <span className="text-[#BA954F]">*</span>
              </label>
              <input
                type="text"
                required
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Alex Vance"
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Profile Image URL (optional)
              </label>
              <input
                type="url"
                value={profileImageUrl}
                onChange={(e) => setProfileImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 text-sm bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] transition-all"
              />
            </div>
          </div>

          {/* Feedback */}
          {profileSuccess && (
            <div className="flex items-center gap-2 p-3 text-sm text-[#2D6A4F] bg-[#EBF3ED] border border-[#D1E7D8] font-medium rounded-xl">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2D6A4F]" />
              {profileSuccess}
            </div>
          )}
          {profileError && (
            <div className="flex items-center gap-2 p-3 text-sm text-[#9E2A2B] bg-[#FDF0ED] border border-[#F5D0C5] rounded-xl">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {profileError}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={profileLoading}
              className="btn-gold-primary px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
            >
              {profileLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {profileLoading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      {user?.role !== 'CLIENT' && user?.role !== 'CLIENT_ADMIN' && (
        <div className="bg-white rounded-2xl border border-[#EDE7DD] shadow-[0_4px_24px_rgba(0,0,0,0.03)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[#EDE7DD] bg-[#FAF7F2]/50">
            <h2 className="font-serif text-base font-bold text-neutral-900 flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#BA954F]" />
              Security & Password
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Confirm your current password before setting a new one
            </p>
          </div>

          <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Current Password <span className="text-[#BA954F]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  New Password <span className="text-[#BA954F]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Confirm New Password <span className="text-[#BA954F]">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-[#FAF7F2]/40 border border-[#EDE7DD] rounded-xl text-neutral-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#BA954F] focus:border-[#BA954F] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 p-0.5 cursor-pointer"
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback */}
            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 text-sm text-[#2D6A4F] bg-[#EBF3ED] border border-[#D1E7D8] font-medium rounded-xl">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2D6A4F]" />
                {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="flex items-center gap-2 p-3 text-sm text-[#9E2A2B] bg-[#FDF0ED] border border-[#F5D0C5] rounded-xl">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {passwordError}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={passwordLoading}
                className="btn-gold-primary px-6 py-2.5 text-sm font-semibold inline-flex items-center gap-2"
              >
                {passwordLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Signature & Appreciation Note from Reference Screen 10 */}
      <div className="text-center py-8 border-t border-[#EDE7DD] mt-12 space-y-1.5">
        <p className="font-serif italic text-lg text-neutral-800">
          "Thank you for being a part of our journey."
        </p>
        <p className="font-script text-3xl text-[#BA954F]">
          White Ink Design Studio
        </p>
      </div>
    </div>
  );
};
