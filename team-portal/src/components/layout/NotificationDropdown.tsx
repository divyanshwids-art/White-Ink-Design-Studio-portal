import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  Trash2,
  CheckCircle,
  Clock,
  AlertTriangle,
  FolderKanban,
  FileCheck,
  ExternalLink,
  Calendar,
  Award,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../services/api';
import type { Notification, NotificationType } from '../../types';
import { subscribeToWebPush } from '../../utils/pushNotifications';

interface NotificationDropdownProps {
  onNavigate?: (path: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleDataUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.entity === 'notification') {
        fetchNotifications();
      }
    };
    window.addEventListener('portal:data-updated', handleDataUpdated);

    const interval = setInterval(fetchNotifications, 30000); // 30s polling
    return () => {
      window.removeEventListener('portal:data-updated', handleDataUpdated);
      clearInterval(interval);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount(res.unreadCount);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = (item: Notification) => {
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    if (item.linkUrl && onNavigate) {
      onNavigate(item.linkUrl);
      setIsOpen(false);
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'APPROVAL_REQUESTED':
      case 'APPROVAL_RESOLVED':
        return <FileCheck className="h-4 w-4 stroke-[1.75]" />;
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS':
        return <CheckCircle className="h-4 w-4 stroke-[1.75]" />;
      case 'PROJECT_ASSIGNED':
        return <FolderKanban className="h-4 w-4 stroke-[1.75]" />;
      case 'MILESTONE_DUE':
        return <AlertTriangle className="h-4 w-4 stroke-[1.75]" />;
      case 'ATTENDANCE_ALERT':
        return <Clock className="h-4 w-4 stroke-[1.75]" />;
      case 'LEAVE_REQUESTED':
      case 'LEAVE_RESOLVED':
        return <Calendar className="h-4 w-4 stroke-[1.75]" />;
      case 'PERFORMANCE_REVIEW':
        return <Award className="h-4 w-4 stroke-[1.75]" />;
      case 'CHAT_MENTION':
        return <MessageSquare className="h-4 w-4 stroke-[1.75]" />;
      default:
        return <Bell className="h-4 w-4 stroke-[1.75]" />;
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 text-[#57534E] hover:text-[#1C1917] hover:bg-[#FAF7F2] rounded-xl transition-colors cursor-pointer"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="h-5 w-5 stroke-[1.75]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#BA954F] px-1 text-[10px] font-bold text-white shadow-2xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#EDE7DD] py-0 z-50 overflow-hidden animate-gold-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#EDE7DD] bg-[#FAF7F2]">
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-sm text-[#1C1917]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-[#FAF4EC] text-[#BA954F] rounded-full border border-[#EAE0D0]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-[#BA954F] hover:text-[#A17B2F] font-semibold cursor-pointer flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5 stroke-[2]" />
                Mark all read
              </button>
            )}
          </div>

          {typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted' && (
            <div className="bg-[#FAF4EC] px-4 py-2 border-b border-[#EDE3D4] flex items-center justify-between gap-2">
              <span className="text-[11px] text-[#78716C]">
                Get Chrome alerts even when the portal is closed:
              </span>
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  await subscribeToWebPush();
                  fetchNotifications();
                }}
                className="px-2.5 py-1 text-[11px] font-semibold bg-[#1C1917] hover:bg-[#3D3A37] text-white rounded-lg shadow-2xs cursor-pointer shrink-0 transition-colors"
              >
                Turn On
              </button>
            </div>
          )}

          {/* List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F5EFE6]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[#78716C]">
                <div className="w-12 h-12 rounded-2xl bg-[#FAF4EC] border border-[#EDE3D4] flex items-center justify-center text-[#BA954F] mx-auto mb-3 shadow-2xs">
                  <Bell className="h-6 w-6 stroke-[1.75]" />
                </div>
                <p className="text-sm font-serif font-bold text-[#1C1917]">No notifications yet</p>
                <p className="text-xs text-[#78716C] mt-1">
                  You're all caught up with projects and tasks!
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-[#FAF7F2] transition-colors cursor-pointer ${
                    !item.isRead ? 'bg-[#FAF7F2]/60' : ''
                  }`}
                >
                  <div className="mt-0.5 p-2 bg-[#FAF4EC] text-[#BA954F] border border-[#EDE3D4] rounded-xl shrink-0">
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4
                        className={`text-xs truncate ${
                          !item.isRead ? 'text-[#1C1917] font-bold' : 'text-[#57534E] font-medium'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-[#A8A29E] shrink-0 font-mono">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[#57534E] line-clamp-2 leading-relaxed font-normal">
                      {item.message}
                    </p>
                    {item.linkUrl && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#BA954F] font-semibold mt-1.5 hover:underline">
                        View details <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    {!item.isRead && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="p-1 text-[#BA954F] hover:bg-[#FAF4EC] rounded-lg"
                        title="Mark as read"
                      >
                        <span className="h-2 w-2 rounded-full bg-[#BA954F] block" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(item.id, e)}
                      className="p-1 text-[#A8A29E] hover:text-[#B91C1C] hover:bg-[#FDF2F0] rounded-lg transition-colors"
                      title="Dismiss"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
