import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { BrandLogo } from '../components/common/BrandLogo';
import { KeyRound, Eye, EyeOff, Lock, ArrowRight, LogOut } from 'lucide-react';

export const ForcePasswordChangePage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Your new password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await api.changePassword({ newPassword });
      // Reload user profile so mustChangePassword becomes false
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-gold-fade-in selection:bg-[#EAE0D0] selection:text-[#1C1917]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <BrandLogo className="mx-auto h-auto w-44 max-w-full object-contain mb-4" />
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF4EC] border border-[#EDE3D4] text-[#BA954F] text-xs font-semibold mb-3 shadow-2xs">
          <KeyRound className="h-3.5 w-3.5 text-[#BA954F]" />
          First-Time Login Security Setup
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1C1917]">
          Set Permanent Password
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-[#78716C] font-normal max-w-sm mx-auto">
          Your account was provisioned with an initial generated password. Please create your personal permanent password to proceed to your workspace.
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md border border-[#EDE7DD] py-8 px-6 shadow-xl rounded-2xl sm:px-10">
          {/* User badge */}
          <div className="mb-5 p-3 bg-[#FAF7F2] border border-[#EDE7DD] rounded-xl flex items-center justify-between text-xs">
            <span className="text-[#78716C] font-medium">Logged in as:</span>
            <span className="font-semibold text-[#1C1917] font-mono">{user?.email}</span>
          </div>

          {error && (
            <div className="mb-5 p-3.5 text-xs text-[#B91C1C] bg-[#FDF2F0] border border-[#F5D5D0] rounded-xl font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                New Password <span className="text-[#B91C1C]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#BA954F]">
                  <Lock className="h-4 w-4 stroke-[1.75]" />
                </div>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-[#DFD5C6] text-[#1C1917] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] placeholder-[#A8A29E]"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917] p-1 cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1C1917] mb-1.5">
                Confirm New Password <span className="text-[#B91C1C]">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#BA954F]">
                  <Lock className="h-4 w-4 stroke-[1.75]" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  autoComplete="new-password"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-[#DFD5C6] text-[#1C1917] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#BA954F]/20 focus:border-[#BA954F] placeholder-[#A8A29E]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#78716C] hover:text-[#1C1917] p-1 cursor-pointer"
                  title={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#BA954F] hover:bg-[#A17B2F] transition-all duration-150 shadow-xs disabled:opacity-50 cursor-pointer btn-hover-lift"
              >
                {isLoading ? 'Saving Password...' : 'Save Password & Enter Workspace'}
                <ArrowRight className="h-4 w-4 stroke-[2]" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-[#EDE7DD] text-center">
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1.5 text-xs text-[#78716C] hover:text-[#B91C1C] font-medium cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out and return later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
