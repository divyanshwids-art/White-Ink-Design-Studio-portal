import React from 'react';
import { useAuth, BrandLogo } from '@shared';
import {
  LayoutDashboard,
  FolderKanban,
  FileCheck,
  BookOpen,
  MessageSquare,
  UserCircle,
  X,
} from 'lucide-react';

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

  interface NavItem {
    name: string;
    path: string;
    icon: React.ElementType;
    badge?: string;
    category: 'GENERAL' | 'ACCOUNT';
  }

  const navigation: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      category: 'GENERAL',
    },
    {
      name: 'Projects',
      path: '/projects',
      icon: FolderKanban,
      category: 'GENERAL',
    },
    {
      name: 'Deliverables & Approvals',
      path: '/approvals',
      icon: FileCheck,
      category: 'GENERAL',
    },
    {
      name: 'Studio Chat',
      path: '/chat',
      icon: MessageSquare,
      category: 'GENERAL',
    },
    {
      name: 'Brand Book',
      path: '/sops',
      icon: BookOpen,
      category: 'GENERAL',
    },
    {
      name: 'My Profile',
      path: '/profile',
      icon: UserCircle,
      category: 'ACCOUNT',
    },
  ];

  const generalItems = navigation.filter((item) => item.category === 'GENERAL');
  const accountItems = navigation.filter((item) => item.category === 'ACCOUNT');

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

          {renderNavGroup('Client Workspace', generalItems)}
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
