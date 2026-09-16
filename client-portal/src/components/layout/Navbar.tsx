import React from 'react';
import { useAuth } from '@shared';
import { LogOut, Menu, X } from 'lucide-react';
import { NotificationDropdown } from './NotificationDropdown';
import { BrandLogo } from '@shared';

interface NavbarProps {
  onToggleSidebar: () => void;
  onNavigate?: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate }) => {
  const { user, logout } = useAuth();

  const roleBadgeMap: Record<string, string> = {
    CLIENT_ADMIN: 'bg-[#F6EFE6] text-[#A17B2F] border-[#DFD5C6] font-semibold',
    CLIENT: 'bg-[#FAF7F2] text-[#6B5E4F] border-[#E5DDD0] font-medium',
  };

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'WI';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-[#EDE7DD] shadow-2xs transition-colors duration-200">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-[#57534E] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-xl transition-colors cursor-pointer"
          aria-label="Toggle Navigation"
        >
          <Menu className="h-5 w-5 stroke-[1.75]" />
        </button>

        <div className="flex items-center gap-1.5">
          <BrandLogo className="h-8 w-auto max-w-[7rem] object-contain" />
          <X className="h-3.5 w-3.5 text-[#A8A29E] stroke-[2.5]" />
          {user?.profileImage ? (
            <img src={user.profileImage} alt={user.name} className="h-8 w-8 rounded-full border border-[#DFD5C6] object-cover shadow-2xs" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-[#FAF4EC] border border-[#EAE0D0] flex items-center justify-center text-[#BA954F] font-serif font-bold text-xs shadow-2xs">
              {userInitials}
            </div>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-4">
        <NotificationDropdown onNavigate={onNavigate} />

        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-[#EDE7DD]">
            <div className="flex items-center gap-2.5">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.name} className="h-8 w-8 rounded-full border border-[#DFD5C6] object-cover shadow-2xs" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[#FAF4EC] border border-[#EAE0D0] flex items-center justify-center text-[#BA954F] font-serif font-bold text-xs shadow-2xs">
                  {userInitials}
                </div>
              )}
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-[#1C1917] leading-tight truncate max-w-[130px]">{user.name}</div>
                <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded border mt-0.5 shadow-2xs ${roleBadgeMap[user.role] || 'bg-white text-[#57534E] border-[#EDE7DD]'}`}>
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FDF2F0] rounded-xl transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4 w-4 stroke-[1.75]" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
