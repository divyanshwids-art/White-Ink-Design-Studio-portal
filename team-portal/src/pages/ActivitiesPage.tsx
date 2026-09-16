import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ActivityLog, User } from '../types';
import { exportToCsv } from '../utils/csvExport';
import {
  Activity,
  Search,
  Filter,
  Download,
  RotateCw,
  User as UserIcon,
  Clock,
  Layers,
  FileCheck,
  Calendar,
  CheckCircle2,
  Trash2,
  Edit2,
  PlusCircle,
  MessageSquare,
} from 'lucide-react';

export const ActivitiesPage: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';
  const isAdminOrManager = role === 'SUPER_ADMIN' || role === 'ADMIN';

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');

  const entityTypes = [
    'ALL',
    'PROJECT',
    'TASK',
    'ATTENDANCE',
    'LEAVE',
    'SOP',
    'REVIEW',
    'APPROVAL',
    'SETTINGS',
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const [logsRes, usersRes] = await Promise.all([
        api.getActivityLogs({
          userId: selectedUser !== 'ALL' ? selectedUser : undefined,
          entityType: selectedEntity !== 'ALL' ? selectedEntity : undefined,
          limit: 150,
        }),
        isAdminOrManager ? api.getUsers().catch(() => []) : Promise.resolve([]),
      ]);
      setActivities(logsRes);
      setUsers(usersRes);
    } catch (err) {
      console.error('Error loading audit activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedUser, selectedEntity]);

  const handleExportCSV = () => {
    const rows = filteredActivities.map((a) => ({
      id: a.id,
      user: a.user?.name || 'System',
      userEmail: a.user?.email || 'N/A',
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId || '',
      details: a.details || '',
      timestamp: new Date(a.createdAt).toLocaleString(),
    }));

    exportToCsv('Audit_Activity_Log_' + new Date().toISOString().split('T')[0], rows, [
      { key: 'user', label: 'User' },
      { key: 'userEmail', label: 'Email' },
      { key: 'action', label: 'Action' },
      { key: 'entityType', label: 'Entity Type' },
      { key: 'entityId', label: 'Entity ID' },
      { key: 'details', label: 'Details' },
      { key: 'timestamp', label: 'Timestamp' },
    ]);
  };

  const filteredActivities = activities.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.action.toLowerCase().includes(q) ||
      a.entityType.toLowerCase().includes(q) ||
      (a.details && a.details.toLowerCase().includes(q)) ||
      (a.user?.name && a.user.name.toLowerCase().includes(q))
    );
  });

  const getActionBadge = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('CREATE') || act.includes('START') || act.includes('SUBMIT')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-gold-100 text-black border border-gold-300">
          <PlusCircle className="h-3 w-3 text-gold-700" /> {action}
        </span>
      );
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('ACKNOWLEDGE')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-gold-50 text-black border border-gold-300">
          <Edit2 className="h-3 w-3 text-gold-700" /> {action}
        </span>
      );
    }
    if (act.includes('DELETE') || act.includes('REJECT') || act.includes('CANCEL')) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
          <Trash2 className="h-3 w-3 text-rose-600" /> {action}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-gold-50 text-black/80 border border-gold-200">
        <Activity className="h-3 w-3 text-gold-600" /> {action}
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-black flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-gold-600 stroke-[2.5]" />
            Audit Trail & Activity Stream
          </h1>
          <p className="text-sm text-black/70 font-medium mt-1">
            Real-time compliance logs, system events, state transitions, and user actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gold-50 text-black text-sm font-bold rounded-lg border border-gold-300 shadow-2xs transition-colors cursor-pointer"
          >
            <RotateCw className="h-4 w-4 text-gold-600" />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-black text-sm font-bold rounded-lg border border-gold-600 shadow-xs transition-colors cursor-pointer btn-hover-lift"
          >
            <Download className="h-4 w-4 stroke-[2.5]" />
            Export Audit Log
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gold-300 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gold-600" />
          <input
            type="text"
            placeholder="Search action, details, user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gold-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-gold-500 bg-white text-black font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {isAdminOrManager && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-gold-600" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="text-xs font-bold py-2 px-3 bg-white border border-gold-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-gold-500 text-black"
              >
                <option value="ALL">All Users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gold-600" />
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="text-xs font-bold py-2 px-3 bg-white border border-gold-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-gold-500 text-black"
            >
              {entityTypes.map((et) => (
                <option key={et} value={et}>
                  {et === 'ALL' ? 'All Entity Types' : et}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Activity Timeline List */}
      {loading ? (
        <div className="p-12 text-center text-black/60 bg-white rounded-xl border border-gold-300">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gold-600 border-t-transparent mb-3" />
          <p className="text-sm font-bold">Loading audit events...</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="p-12 text-center text-black/50 bg-white rounded-xl border border-gold-300">
          <Activity className="h-10 w-10 text-gold-400 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-black">No activity events recorded</h3>
          <p className="text-xs text-black/60 font-medium mt-1 max-w-sm mx-auto">
            System actions, leave submissions, project updates, and attendance records will be audited here in real-time.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gold-300 shadow-sm divide-y divide-gold-200">
          {filteredActivities.map((act) => (
            <div key={act.id} className="p-4 hover:bg-gold-50/50 transition-colors flex items-start gap-4">
              {/* User Avatar */}
              <div className="w-9 h-9 rounded-full bg-gold-200 border border-gold-400 flex items-center justify-center text-black font-extrabold text-xs shrink-0 mt-0.5">
                {act.user?.name
                  ? act.user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'S'}
              </div>

              {/* Event Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-black">
                      {act.user?.name || 'System Operator'}
                    </span>
                    {getActionBadge(act.action)}
                    <span className="text-xs font-bold px-2 py-0.5 bg-gold-100/70 text-black border border-gold-200 rounded">
                      {act.entityType}
                    </span>
                  </div>

                  <span className="text-xs text-black/60 font-medium flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3 text-gold-700" />
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>

                {act.details && (
                  <p className="text-xs text-black leading-relaxed bg-gold-50/70 p-2.5 rounded-lg border border-gold-200 font-mono font-medium">
                    {act.details}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
