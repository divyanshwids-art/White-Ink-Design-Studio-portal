import React, { useState, useEffect } from 'react';
import {
  AuthProvider,
  useAuth,
  LoadingSpinner,
  Client,
  Project,
  api,
  triggerLocalNotification,
  initAndRegisterFcmToken,
  requestPushPermission,
} from '@shared';
import { Navbar } from './components/layout/Navbar';
import { PushNotificationBanner } from './components/common/PushNotificationBanner';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { SOPPage } from './pages/SOPPage';
import { ChatPage } from './pages/ChatPage';
import { ProfilePage } from './pages/ProfilePage';
import { ForcePasswordChangePage } from './pages/ForcePasswordChangePage';
import { ClientProjectRequestModal } from './components/projects/ClientProjectRequestModal';
import { ShieldAlert, LogOut } from 'lucide-react';

function ClientPortalApp() {
  const { user, isLoading, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>('/dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClientProjectOpen, setIsClientProjectOpen] = useState(false);
  const [, setProjects] = useState<Project[]>([]);
  const [, setClients] = useState<Client[]>([]);

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (user && (user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN')) {
      api.getClients().then(setClients).catch(() => {});
      api.getProjects().then(setProjects).catch(() => {});
    }
  }, [user]);

  // Initialize FCM and Desktop Notifications for user once on login
  useEffect(() => {
    if (user?.id) {
      initAndRegisterFcmToken().catch((err) => {
        console.warn('FCM registration:', err);
      });
      requestPushPermission().catch(() => {});
    }
  }, [user?.id]);

  // Real-time server events listener (SSE) for automatic live updates and desktop notifications
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('update', (event) => {
        try {
          const payload = JSON.parse(event.data);
          window.dispatchEvent(new CustomEvent('portal:data-updated', { detail: payload }));

          // Dispatch desktop/external notifications ONLY for genuine notifications that go into the bell icon
          if (payload.entity === 'notification' && payload.data) {
            const notif = payload.data;
            if (notif.userId === user.id) {
              triggerLocalNotification(notif.title || 'White Ink Design Studio', {
                body: notif.message,
                tag: notif.id,
                data: { linkUrl: notif.linkUrl || '/chat' },
              });
            }
          }
        } catch {
          window.dispatchEvent(new CustomEvent('portal:data-updated', { detail: {} }));
        }
      });

      eventSource.onerror = () => {};
    } catch (e) {
      console.warn('Live event connection failed, using focus sync:', e);
    }

    const handleFocus = () => {
      window.dispatchEvent(new CustomEvent('portal:data-updated', { detail: { type: 'focus' } }));
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <LoadingSpinner message="Authenticating client workspace..." size="lg" />
      </div>
    );
  }

  // Not logged in -> Show direct Login view (No public registration or landing)
  if (!user) {
    return <LoginPage />;
  }

  // First-time provisioned user force password change
  if (user.mustChangePassword) {
    return <ForcePasswordChangePage />;
  }

  // Route & Role protection: Restrict portal to CLIENT and CLIENT_ADMIN
  const isClientRole = user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN';
  if (!isClientRole) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-[#EDE7DD] shadow-xl text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#FDF2F0] border border-[#F5D5D0] flex items-center justify-center text-[#B91C1C]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-serif font-bold text-[#1C1917] mb-2">
            Client Portal Access Only
          </h2>
          <p className="text-sm text-[#78716C] leading-relaxed mb-6 font-normal">
            You are currently signed in as <strong className="text-[#1C1917]">{user.name}</strong> with the internal role{' '}
            <span className="px-2 py-0.5 bg-[#FAF4EC] text-[#BA954F] rounded border border-[#EDE3D4] font-mono text-xs font-semibold">
              {user.role}
            </span>
            . Please sign in to the Team Portal instead or switch to a client account.
          </p>
          <button
            type="button"
            onClick={logout}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#BA954F] hover:bg-[#A17B2F] text-white text-sm font-semibold rounded-xl transition-all shadow-xs cursor-pointer btn-hover-lift"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Parse project detail route: /projects/:id
  const projectDetailMatch = currentPath.match(/^\/projects\/([a-zA-Z0-9_-]+)$/);
  const activeProjectId = projectDetailMatch ? projectDetailMatch[1] : null;

  // Parse task detail route: /tasks/:id
  const taskDetailMatch = currentPath.match(/^\/tasks\/([a-zA-Z0-9_-]+)$/);
  const activeTaskId = taskDetailMatch ? taskDetailMatch[1] : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col antialiased selection:bg-[#EAE0D0] selection:text-[#1C1917]">
      {/* Top Navigation */}
      <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onNavigate={navigate} />

      {/* Push Notification Banner */}
      <PushNotificationBanner />

      {/* Body Layout */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <Sidebar
          currentPath={currentPath}
          onNavigate={navigate}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8 max-w-full overflow-x-hidden animate-gold-fade-in">
          {activeProjectId ? (
            <ProjectDetailPage
              projectId={activeProjectId}
              onBack={() => navigate('/projects')}
              onNavigateToKanban={() => navigate('/projects')}
              onNavigate={navigate}
            />
          ) : activeTaskId ? (
            <TaskDetailPage
              taskId={activeTaskId}
              onBack={() => navigate('/projects')}
              onNavigate={navigate}
            />
          ) : currentPath === '/projects' ? (
            <ProjectsPage onNavigateToProject={(id) => navigate(`/projects/${id}`)} />
          ) : currentPath === '/approvals' ? (
            <ApprovalsPage onNavigate={navigate} />
          ) : currentPath === '/chat' ? (
            <ChatPage />
          ) : currentPath === '/sops' ? (
            <SOPPage />
          ) : currentPath === '/profile' || currentPath === '/client-settings' ? (
            <ProfilePage />
          ) : (
            <DashboardPage
              onNavigate={navigate}
              onOpenNewProject={() => setIsClientProjectOpen(true)}
              onOpenClientProject={() => setIsClientProjectOpen(true)}
              onOpenNewTask={() => {}}
            />
          )}
        </main>
      </div>

      {/* Mobile & Tablet Bottom Navigation Bar */}
      <BottomNavigation currentPath={currentPath} onNavigate={navigate} />

      {/* Client Project Request Modal */}
      <ClientProjectRequestModal
        isOpen={isClientProjectOpen}
        onClose={() => setIsClientProjectOpen(false)}
        onSuccess={() => {
          api.getProjects().then(setProjects).catch(() => {});
          navigate('/projects');
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ClientPortalApp />
    </AuthProvider>
  );
}
