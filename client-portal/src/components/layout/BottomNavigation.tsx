import React from 'react';
import { LayoutDashboard, FolderKanban, FileCheck, MessageSquare, UserCircle } from 'lucide-react';
import { useAuth } from '@shared';

interface BottomNavigationProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentPath,
  onNavigate,
}) => {
  const { user } = useAuth();

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'WI';

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      isActive: currentPath === '/dashboard',
    },
    {
      id: 'projects',
      label: 'Projects',
      path: '/projects',
      icon: FolderKanban,
      isActive: currentPath === '/projects' || currentPath.startsWith('/projects/'),
    },
    {
      id: 'approvals',
      label: 'Approvals',
      path: '/approvals',
      icon: FileCheck,
      isActive: currentPath === '/approvals',
    },
    {
      id: 'chats',
      label: 'Studio Chat',
      path: '/chat',
      icon: MessageSquare,
      isActive: currentPath === '/chat',
    },
    {
      id: 'profile',
      label: 'Profile',
      path: '/profile',
      icon: UserCircle,
      isActive: currentPath === '/profile',
      isProfile: true,
    },
  ];

  return (
    <nav
      aria-label="Mobile and Tablet Navigation"
      className="fixed bottom-0 inset-x-0 z-30 block lg:hidden bg-white/95 backdrop-blur-lg border-t border-[#EDE7DD] shadow-[0_-4px_24px_rgba(40,30,20,0.06)] transition-all duration-200"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="max-w-xl mx-auto px-3 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.isActive;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={`group relative flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-2xl transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive ? 'text-[#BA954F]' : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              {/* Active Background Pill Indicator */}
              {isActive && (
                <span className="absolute inset-0 bg-[#FAF4EC] rounded-2xl border border-[#EDE3D4] -z-10 animate-gold-fade-in" />
              )}

              {/* Icon / Avatar */}
              <div className="relative flex items-center justify-center h-6 w-6 mb-0.5">
                {item.isProfile && user?.profileImage ? (
                  <img
                    src={user.profileImage}
                    alt={user.name}
                    className={`h-5 w-5 rounded-full object-cover transition-transform ${
                      isActive ? 'ring-2 ring-[#BA954F] ring-offset-1 scale-105' : 'opacity-80'
                    }`}
                  />
                ) : item.isProfile && user?.name ? (
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold font-serif transition-transform ${
                      isActive
                        ? 'bg-[#BA954F] text-white ring-2 ring-[#FAF4EC] scale-105'
                        : 'bg-[#FAF4EC] text-[#BA954F] border border-[#EAE0D0]'
                    }`}
                  >
                    {userInitials}
                  </div>
                ) : (
                  <Icon
                    className={`h-5 w-5 transition-transform duration-200 ${
                      isActive
                        ? 'text-[#BA954F] stroke-[2.2] scale-110'
                        : 'text-[#8C7E72] group-hover:text-[#1C1917] stroke-[1.75]'
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[11px] font-medium tracking-tight truncate max-w-[72px] transition-colors duration-150 ${
                  isActive ? 'text-[#BA954F] font-bold' : 'text-[#78716C] group-hover:text-[#1C1917]'
                }`}
              >
                {item.label}
              </span>

              {/* Active Bottom Dot indicator */}
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#BA954F] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
