import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { User, Role, Client } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { CheckCircle2, Copy, Check, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
}) => {
  const { user: currentUser } = useAuth();
  const isEditing = Boolean(user);

  const getAllowedRoles = (): Role[] => {
    switch (currentUser?.role) {
      case 'ADMIN':
        return ['TEAM_MEMBER'];
      case 'SUPER_ADMIN':
      default:
        return [];
    }
  };

  const allowedRoles = getAllowedRoles();
  const defaultRole = allowedRoles[0] || 'TEAM_MEMBER';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(defaultRole);
  const [clientId, setClientId] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [profileImage, setProfileImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // One-time credential display state
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    plaintextPassword: string;
    role: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getClients()
        .then((data) => setClients(data || []))
        .catch((err) => console.error('Failed to load clients in UserModal:', err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPassword('');
      setRole(user.role || defaultRole);
      setClientId(user.clientId || '');
      setProfileImage(user.profileImage || '');
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setRole(defaultRole);
      setClientId('');
      setProfileImage('');
    }
    setError(null);
    setCreatedCredentials(null);
    setIsCopied(false);
    setShowEditPassword(false);
  }, [user, isOpen, defaultRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (isEditing && password && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isEditing && user) {
        await api.updateUser(user.id, {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          clientId: role === 'CLIENT' ? (clientId || currentUser?.clientId) : undefined,
          password: password || undefined,
          profileImage: profileImage.trim() ? profileImage.trim() : null,
        });
        onSuccess();
        onClose();
      } else {
        const res = await api.createUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          clientId: currentUser?.clientId || clientId || undefined,
          profileImage: profileImage.trim() || undefined,
        });

        if (res.generatedPassword) {
          setCreatedCredentials({
            name: res.name,
            email: res.email,
            plaintextPassword: res.generatedPassword,
            role: res.role,
          });
          onSuccess();
        } else {
          onSuccess();
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdCredentials) return;
    const text = `White Ink Portal Login Credentials\nEmail: ${createdCredentials.email}\nTemporary Password: ${createdCredentials.plaintextPassword}\nRole: ${createdCredentials.role}\n(You will be required to change your password on first login)`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleModalClose = () => {
    setCreatedCredentials(null);
    onClose();
  };

  const getRoleLabel = (r: Role) => {
    switch (r) {
      case 'TEAM_MEMBER':
        return 'TEAM MEMBER (Internal Staff)';
      case 'CLIENT':
        return 'CLIENT (Client Company Member)';
      default:
        return r;
    }
  };

  // If credentials have just been generated, display the one-time credential modal view
  if (createdCredentials) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleModalClose}
        title="Member Created Successfully"
        subtitle="Auto-generated login credentials"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-950 font-medium leading-relaxed">
              The user account has been provisioned. A temporary password was generated and will be forced to change on first login.
            </div>
          </div>

          <div className="bg-gold-50/50 p-4 rounded-xl border border-gold-300 space-y-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                Full Name
              </label>
              <div className="font-bold text-black text-sm">{createdCredentials.name}</div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                Login Email
              </label>
              <div className="font-mono text-sm text-black bg-white px-3 py-1.5 rounded-lg border border-gold-200 select-all">
                {createdCredentials.email}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 block">
                Auto-Generated Temporary Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  readOnly
                  value={createdCredentials.plaintextPassword}
                  className="w-full font-mono text-base font-bold bg-white px-3 py-2 pr-10 rounded-lg border border-gold-400 text-black focus:outline-none select-all tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-1 cursor-pointer"
                  title={showPassword ? 'Mask password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gold-100/70 border border-gold-300 rounded-xl flex items-center gap-2.5 text-xs text-black font-medium">
            <KeyRound className="h-4 w-4 text-gold-800 shrink-0" />
            <span>
              These credentials are also stored in your <strong>Credentials Vault</strong> so you can retrieve them anytime.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer btn-hover-lift shadow-xs"
            >
              {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {isCopied ? 'Copied to Clipboard!' : 'Copy Credentials'}
            </button>
            <button
              type="button"
              onClick={handleModalClose}
              className="px-4 py-2 text-xs font-semibold text-black bg-white border border-gold-300 hover:bg-gold-50 rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit User Account' : currentUser?.role === 'CLIENT_ADMIN' ? 'Add Company Team Member' : 'Add Team Member'}
      subtitle={
        isEditing
          ? 'Update user credentials and profile details'
          : currentUser?.role === 'CLIENT_ADMIN'
          ? 'Add a member to your client company team'
          : 'Provision a new team member with auto-generated credentials'
      }
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="form-label block mb-1 text-heading">
            Full Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Alex Vance"
            className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        <div>
          <label className="form-label block mb-1 text-heading">
            Email Address <span className="text-rose-500">*</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., alex@company.com"
            className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        {/* Password input: shown ONLY when editing to optionally reset password */}
        {isEditing ? (
          <div>
            <label className="form-label block mb-1 text-heading">
              Password (leave blank to keep current)
            </label>
            <div className="relative">
              <input
                type={showEditPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3.5 pr-10 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
              />
              <button
                type="button"
                onClick={() => setShowEditPassword(!showEditPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-0.5 cursor-pointer"
                title={showEditPassword ? 'Hide password' : 'Show password'}
              >
                {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gold-50 border border-gold-300 rounded-lg text-xs text-neutral-700 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-gold-700 shrink-0" />
            <span>A secure temporary password will be <strong>auto-generated</strong> and presented upon creation.</span>
          </div>
        )}

        <div>
          <label className="form-label block mb-1 text-heading">
            System Role <span className="text-rose-500">*</span>
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={allowedRoles.length <= 1}
            className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {allowedRoles.map((r) => (
              <option key={r} value={r}>
                {getRoleLabel(r)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label block mb-1 text-heading">
            Profile Image URL (optional)
          </label>
          <input
            type="url"
            value={profileImage}
            onChange={(e) => setProfileImage(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full px-3.5 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gold-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-heading bg-white border border-gold-300 hover:bg-gold-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary btn-hover-lift px-5 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : isEditing ? 'Update User' : 'Create Member'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
