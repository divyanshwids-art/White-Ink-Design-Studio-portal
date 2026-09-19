import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Role } from '../types';
import { api } from '../services/api';
import {
  Users,
  Search,
  Filter,
  Plus,
  Mail,
  CheckCircle2,
  Clock,
  ChevronRight,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

interface TeamPageProps {
  onNavigate?: (path: string) => void;
}

interface TeamMemberWorkload {
  user: User;
  assignedProjectCount: number;
  activeTasksCount: number;
  completedTasksCount: number;
  totalTasksCount: number;
  todayAttendanceStatus: 'NOT_CLOCKED_IN' | 'WORKING' | 'ON_BREAK';
}

export const TeamPage: React.FC<TeamPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role;
  const canManage = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const [teamWorkload, setTeamWorkload] = useState<TeamMemberWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');
  const [showAddPassword, setShowAddPassword] = useState(false);

  const hasAdmin = teamWorkload.some((m) => m.user.role === 'ADMIN');

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const data = await api.getTeamWorkload();
      setTeamWorkload(data);
    } catch (err) {
      console.error('Failed to load team:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      setAddError('All fields are required.');
      return;
    }

    const targetRole = (role === 'SUPER_ADMIN' ? 'ADMIN' : 'TEAM_MEMBER') as Role;
    if (targetRole === 'ADMIN' && hasAdmin) {
      setAddError('Only 1 Admin is allowed in the portal. An Admin account already exists.');
      return;
    }

    try {
      setAddSubmitting(true);
      await api.createUser({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        password: addForm.password.trim(),
        role: targetRole,
      });
      setIsAddModalOpen(false);
      setShowAddPassword(false);
      setAddForm({ name: '', email: '', password: '' });
      fetchTeam();
    } catch (err: any) {
      setAddError(err.message || 'Failed to create user');
    } finally {
      setAddSubmitting(false);
    }
  };

  const filteredMembers = teamWorkload.filter((m) => {
    const matchesSearch =
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = selectedRole === 'ALL' || m.user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case 'WORKING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold-200 text-black border border-gold-400">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-600 animate-pulse" />
            Working
          </span>
        );
      case 'ON_BREAK':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold-100 text-black border border-gold-300">
            <Clock className="h-3 w-3 text-gold-700" />
            On Break
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-white text-black/60 border border-gold-200">
            Not Clocked In
          </span>
        );
    }
  };

  const getRoleBadge = (userRole: Role) => {
    switch (userRole) {
      case 'SUPER_ADMIN':
        return 'bg-black text-gold-400 border-gold-600';
      case 'ADMIN':
        return 'bg-gold-200 text-black border-gold-400';
      case 'TEAM_MEMBER':
        return 'bg-gold-100 text-black border-gold-300';
      case 'CLIENT':
        return 'bg-white text-black border-gold-300';
      default:
        return 'bg-gold-50 text-heading border-gold-200';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="section-heading text-heading flex items-center gap-2.5">
            <Users className="h-6 w-6 text-gold-600" />
            Team Management & Capacity
          </h1>
          <p className="muted mt-1">
            Monitor team members, workload distribution, active assignments, and attendance
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            disabled={role === 'SUPER_ADMIN' && hasAdmin}
            onClick={() => {
              if (role === 'SUPER_ADMIN' && hasAdmin) return;
              setAddForm({
                name: '',
                email: '',
                password: '',
              });
              setAddError('');
              setIsAddModalOpen(true);
            }}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg shadow-sm transition-colors ${
              role === 'SUPER_ADMIN' && hasAdmin
                ? 'bg-gold-100 text-gold-700 border border-gold-300 cursor-not-allowed opacity-75'
                : 'btn-primary btn-hover-lift cursor-pointer'
            }`}
            title={role === 'SUPER_ADMIN' && hasAdmin ? 'Only 1 Admin is allowed in the portal. Admin already exists.' : undefined}
          >
            <Plus className="h-4 w-4" />
            {role === 'SUPER_ADMIN' ? (hasAdmin ? 'Admin Configured (1 Max)' : 'Add Admin') : 'Add Team Member'}
          </button>
        )}
      </div>

      {/* Filter toolbar */}
      <div className="bg-card p-4 rounded-xl border border-gold-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gold-700" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-gold-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-gold-700" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="text-xs font-medium py-2 px-3 bg-gold-50/40 border border-gold-300 rounded-lg focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-gold-500 text-heading cursor-pointer"
          >
            <option value="ALL">All Roles</option>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="TEAM_MEMBER">Team Member</option>
          </select>
        </div>
      </div>

      {/* Team Cards Grid */}
      {loading ? (
        <div className="p-12 text-center text-gold-800 bg-card rounded-xl border border-gold-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gold-500 border-t-transparent mb-3" />
          <p className="text-sm font-medium">Loading team members...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center text-gold-700 bg-card rounded-xl border border-gold-200">
          <Users className="h-10 w-10 text-gold-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-heading">No team members match</h3>
          <p className="text-xs text-gold-700 mt-1">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMembers.map((m) => {
            const isHeavy = m.activeTasksCount >= 5;

            return (
              <div
                key={m.user.id}
                className="bg-card rounded-xl border border-gold-200 p-5 shadow-xs hover:border-gold-400 card-hover-lift transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Profile Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      {m.user.profileImage ? (
                        <img
                          src={m.user.profileImage}
                          alt={m.user.name}
                          className="h-11 w-11 rounded-full object-cover border border-gold-300 shadow-xs"
                        />
                      ) : (
                        <div className="h-11 w-11 rounded-full bg-gold-100 text-gold-800 border border-gold-300 flex items-center justify-center font-bold text-sm">
                          {m.user.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-heading">{m.user.name}</h3>
                        <div className="text-xs text-gold-700 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3 text-gold-600" />
                          <span className="truncate max-w-[150px]">{m.user.email}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${getRoleBadge(
                        m.user.role
                      )}`}
                    >
                      {m.user.role.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Attendance Status */}
                  <div className="bg-gold-50/50 rounded-lg p-2.5 flex items-center justify-between text-xs mb-4 border border-gold-100">
                    <span className="text-gold-800 font-medium">Today's Status:</span>
                    {getAttendanceBadge(m.todayAttendanceStatus)}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="p-2 bg-gold-50/60 rounded-lg border border-gold-200">
                      <div className="text-base font-bold text-heading">{m.assignedProjectCount}</div>
                      <div className="text-[10px] text-gold-700 font-medium">Projects</div>
                    </div>
                    <div className="p-2 bg-gold-50/60 rounded-lg border border-gold-200">
                      <div className="text-base font-bold text-heading">{m.totalTasksCount}</div>
                      <div className="text-[10px] text-gold-700 font-medium">Tasks</div>
                    </div>
                    <div className="p-2 bg-gold-100/80 rounded-lg border border-gold-300">
                      <div className="text-base font-bold text-black">{m.activeTasksCount}</div>
                      <div className="text-[10px] text-black/70 font-semibold">In Progress</div>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-gold-100 flex items-center justify-between">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isHeavy
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-gold-100 text-black border border-gold-300'
                    }`}
                  >
                    {isHeavy ? 'High Load' : 'Available Capacity'}
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate(`/tasks?assignedTo=${m.user.id}`)}
                    className="text-xs font-bold text-gold-700 hover:text-gold-900 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    View Tasks <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gold-300 space-y-4">
            <div className="flex items-center justify-between border-b border-gold-200 pb-3">
              <div>
                <h2 className="text-lg font-bold text-heading flex items-center gap-2">
                  <Users className="h-5 w-5 text-gold-600" />
                  {role === 'SUPER_ADMIN' ? 'Add Admin' : 'Add Team Member'}
                </h2>
                <p className="text-xs text-gold-700 mt-0.5">
                  {role === 'SUPER_ADMIN'
                    ? 'Create the system Admin account (Limit: strictly 1 Admin in portal).'
                    : 'Create a new team member account.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-black/50 hover:text-black rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="form-label block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={role === 'SUPER_ADMIN' ? 'e.g. Admin Name' : 'e.g. Jordan Miller'}
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="form-label block mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder={role === 'SUPER_ADMIN' ? 'admin@company.com' : 'jordan@company.com'}
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="form-label block mb-1">
                  Password *
                </label>
                <div className="relative">
                  <input
                    type={showAddPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 text-sm bg-gold-50/40 border border-gold-300 rounded-lg text-heading focus:ring-2 focus:ring-gold-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-black p-0.5 cursor-pointer"
                    title={showAddPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAddPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gold-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-heading bg-white hover:bg-gold-50 border border-gold-300 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSubmitting}
                  className="btn-primary btn-hover-lift px-4 py-2 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {addSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
