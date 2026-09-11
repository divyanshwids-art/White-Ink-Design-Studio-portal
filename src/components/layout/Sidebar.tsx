import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Columns3,
  CheckSquare,
  Building2,
  Users,
  UserCircle,
  X,
  Clock,
  Flag,
  FileCheck,
  BarChart3,
  CalendarDays,
  BookOpen,
  Award,
  MessageSquare,
  Settings,
  KeyRound,
  ListTodo,
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const role = user?.role || 'TEAM_MEMBER';

  const isSuperAdminOrAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isClient = role === 'CLIENT' || role === 'CLIENT_ADMIN';
  const isInternalStaff = !isClient;

  interface NavItem {
    name: string;
    path: string;
    icon: React.ElementType;
    badge?: string;
    show: boolean;
    category: 'GENERAL' | 'MANAGEMENT' | 'ACCOUNT';
  }

  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      show: true,
      category: 'GENERAL',
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: FolderKanban,
      show: true,
      category: 'GENERAL',
    },
    {
      name: 'Tasks',
      path: '/tasks',
      icon: CheckSquare,
      show: true,
      category: 'GENERAL',
    },
    {
      name: 'Todo List',
      path: '/todos',
      icon: ListTodo,
      show: isInternalStaff,
      category: 'GENERAL',
    },
    {
      name: 'Kanban Board',
      path: '/kanban',
      icon: Columns3,
      show: true,
      category: 'GENERAL',
    },
    {
      name: 'Team Chat',
      path: '/chat',
      icon: MessageSquare,
      show: true,
      category: 'GENERAL',
    },
    {
      name: 'Milestones',
      path: '/milestones',
      icon: Flag,
      show: !isClient,
      category: 'GENERAL',
    },
    {
      name: 'Client Approvals',
      path: '/approvals',
      icon: FileCheck,
      show: true,
      category: 'GENERAL',
    },
    {
      name: 'Attendance',
      path: '/attendance',
      icon: Clock,
      show: isInternalStaff,
      category: 'GENERAL',
    },
    {
      name: 'Leaves & Time Off',
      path: '/leaves',
      icon: CalendarDays,
      show: isInternalStaff,
      category: 'GENERAL',
    },
    {
      name: 'SOP Documentation',
      path: '/sops',
      icon: BookOpen,
      show: true,
      category: 'GENERAL',
    },
    {
      name: 'Performance Reviews',
      path: '/performance',
      icon: Award,
      show: isInternalStaff,
      category: 'GENERAL',
    },
    {
      name: 'Reports & Analytics',
      path: '/reports',
      icon: BarChart3,
      show: isInternalStaff,
      category: 'GENERAL',
    },
    {
      name: 'Clients',
      path: '/clients',
      icon: Building2,
      show: role === 'SUPER_ADMIN',
      category: 'MANAGEMENT',
    },
    {
      name: 'Team Management',
      path: '/team',
      icon: Users,
      badge: isSuperAdminOrAdmin ? 'Admin' : undefined,
      show: isSuperAdminOrAdmin,
      category: 'MANAGEMENT',
    },
    {
      name: 'User Accounts',
      path: '/users',
      icon: Users,
      badge: 'Admin',
      show: isSuperAdminOrAdmin,
      category: 'MANAGEMENT',
    },
    {
      name: 'Credentials Vault',
      path: '/credentials',
      icon: KeyRound,
      badge: 'Super Admin',
      show: role === 'SUPER_ADMIN',
      category: 'MANAGEMENT',
    },
    {
      name: 'System Settings',
      path: '/settings',
      icon: Settings,
      badge: 'Admin',
      show: isSuperAdminOrAdmin,
      category: 'MANAGEMENT',
    },
    {
      name: 'Account Settings',
      path: '/client-settings',
      icon: Settings,
      show: isClient,
      category: 'ACCOUNT',
    },
    {
      name: 'My Profile',
      path: '/profile',
      icon: UserCircle,
      show: true,
      category: 'ACCOUNT',
    },
  ];

  const generalItems = navigation.filter((item) => item.show && item.category === 'GENERAL');
  const managementItems = navigation.filter((item) => item.show && item.category === 'MANAGEMENT');
  const accountItems = navigation.filter((item) => item.show && item.category === 'ACCOUNT');

  const renderNavGroup = (title: string, items: NavItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1 mb-5">
        <div className="px-3 py-1.5 text-[11px] font-bold text-[#8C7E72] uppercase tracking-wider">
          {title}
        </div>
        {items.map((item) => {
          const isActive =
            currentPath === item.path ||
            (item.path !== '/dashboard' && currentPath.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                onNavigate(item.path);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#BA954F] text-white font-semibold shadow-xs'
                  : 'text-[#57534E] hover:bg-[#F5EFE6] hover:text-[#1C1917]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-white stroke-[2]' : 'text-[#8C7E72] stroke-[1.75]'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'WI';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 lg:top-16 z-40 h-screen lg:h-[calc(100vh-4rem)] w-64 bg-[#FAF7F2] text-[#1C1917] flex flex-col justify-between transition-transform duration-200 ease-in-out border-r border-[#EDE7DD] shadow-2xs ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Navigation list */}
        <div className="flex-1 py-5 px-3.5 overflow-y-auto">
          <div className="flex items-center justify-between px-3 mb-4 lg:hidden">
            <BrandLogo className="h-9 w-auto max-w-[8.5rem] object-contain" />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#57534E] hover:bg-[#F5EFE6] rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {renderNavGroup('General', generalItems)}
          {renderNavGroup('Management', managementItems)}
          {renderNavGroup('Account', accountItems)}
        </div>

        {/* User Card in Footer */}
        <div className="p-3.5 border-t border-[#EDE7DD] bg-white/70">
          <div
            onClick={() => {
              onNavigate('/profile');
              onClose();
            }}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-[#FAF7F2] transition-all duration-150 cursor-pointer border border-transparent hover:border-[#EDE7DD]"
          >
            {user?.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border border-[#DFD5C6] shadow-2xs"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#FAF4EC] border border-[#EAE0D0] flex items-center justify-center text-[#BA954F] font-serif font-bold text-xs shadow-2xs">
                {userInitials}
              </div>
            )}
            <div className="truncate flex-1 min-w-0">
              <p className="text-xs font-bold text-[#1C1917] truncate">{user?.name}</p>
              <p className="text-[11px] text-[#78716C] font-medium truncate">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
