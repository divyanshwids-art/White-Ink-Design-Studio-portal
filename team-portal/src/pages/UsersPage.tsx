import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Role } from '../types';
import { api } from '../services/api';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { UserModal } from '../components/users/UserModal';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Mail,
  UserCheck,
} from 'lucide-react';

interface UsersPageProps {
  onNavigate?: (path: string) => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ onNavigate }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers({ search, role: roleFilter });
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const canEdit = (target: User) => {
    if (currentUser?.id === target.id) return true;
    if (currentUser?.role === 'SUPER_ADMIN') return target.role === 'ADMIN' || target.role === 'CLIENT_ADMIN';
    if (currentUser?.role === 'ADMIN') return target.role === 'TEAM_MEMBER';
    return false;
  };

  const canDelete = (target: User) => {
    if (currentUser?.id === target.id) return false;
    if (currentUser?.role === 'SUPER_ADMIN') return target.role === 'ADMIN' || target.role === 'CLIENT_ADMIN';
    if (currentUser?.role === 'ADMIN') return target.role === 'TEAM_MEMBER';
    return false;
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    try {
      await api.deleteUser(deletingUser.id);
      setDeletingUser(null);
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadge = (role: Role) => {
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
      case 'TEAM_MEMBER':
        return (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-gold-100 text-black border border-gold-300">
            Team Member
          </span>
        );
      case 'CLIENT_ADMIN':
        return (
          <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-gold-400 text-black border border-gold-600 shadow-2xs">
            Client Admin
          </span>
        );
      case 'CLIENT':
        return (
          <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-white text-black border border-gold-300">
            Client Partner
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-heading text-heading">User Management</h1>
          <p className="muted mt-1">
            Manage system access credentials, role-based authorizations, and staff profiles
          </p>
        </div>

        {currentUser?.role === 'SUPER_ADMIN' ? (
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('/access-requests')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg text-black bg-gold-200 hover:bg-gold-300 border border-gold-400 shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <UserCheck className="h-4 w-4" />
            Review Access Requests
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setEditingUser(null);
              setIsModalOpen(true);
            }}
            className="btn-primary btn-hover-lift inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        )}
      </div>

      {/* Super Admin Notice */}
      {currentUser?.role === 'SUPER_ADMIN' && (
        <div className="p-3.5 bg-gold-100/70 border border-gold-300 rounded-xl flex items-center justify-between gap-3 text-xs text-black font-medium">
          <div className="flex items-center gap-2.5">
            <UserCheck className="h-4 w-4 text-gold-800 shrink-0" />
            <span>
              Admins must be provisioned through the <strong>Access Requests & Approval</strong> workflow. Client accounts are created directly from the Clients page.
            </span>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/access-requests')}
              className="text-xs font-bold text-black underline hover:text-gold-900 cursor-pointer shrink-0"
            >
              View Requests &rarr;
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-card p-3.5 rounded-xl border border-gold-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gold-700" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-gold-50/50 border border-gold-200 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-1.5 text-xs font-medium bg-gold-50/50 border border-gold-200 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-gold-500 cursor-pointer"
        >
          <option value="ALL">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="TEAM_MEMBER">Team Member</option>
          <option value="CLIENT_ADMIN">Client Admin</option>
          <option value="CLIENT">Client</option>
        </select>
      </div>

      {/* User List Table */}
      {isLoading ? (
        <LoadingSpinner message="Fetching user directory..." />
      ) : users.length === 0 ? (
        <EmptyState
          title="No users found"
          description="No users matched your query. Add a new user to invite them to the platform."
          icon={Users}
          actionLabel="Add User"
          onAction={() => {
            setEditingUser(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-card rounded-xl border border-gold-200 shadow-xs divide-y divide-gold-100 overflow-hidden">
          {users.map((u) => (
            <div
              key={u.id}
              className="p-4 sm:p-5 hover:bg-gold-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <img
                  src={
                    u.profileImage ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`
                  }
                  alt={u.name}
                  className="h-10 w-10 rounded-lg border border-gold-200 object-cover"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-heading truncate">{u.name}</h3>
                    {u.id === currentUser?.id && (
                      <span className="text-[10px] bg-gold-200 text-black px-1.5 py-0.5 rounded font-bold border border-gold-400">
                        You
                      </span>
                    )}
                  </div>
                  <p className="muted flex items-center gap-1.5 mt-0.5 text-xs">
                    <Mail className="h-3 w-3 text-gold-700" />
                    {u.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gold-100">
                {getRoleBadge(u.role)}

                <div className="flex items-center gap-1">
                  {canEdit(u) && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser(u);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-black/60 hover:text-black hover:bg-gold-100 rounded-md transition-colors cursor-pointer"
                      title="Edit User"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                  {canDelete(u) && (
                    <button
                      type="button"
                      onClick={() => setDeletingUser(u)}
                      className="p-1.5 text-black/40 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Delete User"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadUsers}
        user={editingUser}
      />

      {/* Delete User Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteUser}
        title="Delete User Account?"
        message={`Are you sure you want to delete "${deletingUser?.name}" (${deletingUser?.email})? This action cannot be undone.`}
        isLoading={isDeleting}
      />
    </div>
  );
};
