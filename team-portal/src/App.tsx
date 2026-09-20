import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth, LoadingSpinner, Client, Project, User, api } from '@shared';
import { TimerProvider } from './context/TimerContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { KanbanPage } from './pages/KanbanPage';
import { TasksPage } from './pages/TasksPage';
import { ClientsPage } from './pages/ClientsPage';
import { UsersPage } from './pages/UsersPage';
import { AccessRequestsPage } from './pages/AccessRequestsPage';
import { CredentialsPage } from './pages/CredentialsPage';
import { TodoPage } from './pages/TodoPage';
import { ProfilePage } from './pages/ProfilePage';
import { AttendancePage } from './pages/AttendancePage';
import { MilestonesPage } from './pages/MilestonesPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ReportsPage } from './pages/ReportsPage';
import { TeamPage } from './pages/TeamPage';
import { LeavesPage } from './pages/LeavesPage';
import { SOPPage } from './pages/SOPPage';
import { PerformancePage } from './pages/PerformancePage';
import { ActivitiesPage } from './pages/ActivitiesPage';
import { ChatPage } from './pages/ChatPage';
import { AdminSettingsPage } from './pages/AdminSettingsPage';
import { ForcePasswordChangePage } from './pages/ForcePasswordChangePage';
import { ProjectModal } from './components/projects/ProjectModal';
import { ClientProjectRequestModal } from './components/projects/ClientProjectRequestModal';
import { TaskModal } from './components/tasks/TaskModal';
import { ShieldAlert, LogOut } from 'lucide-react';

function TeamPortalMain() {
  const { user, isLoading, logout } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>('/dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global Quick Modals
  const [isQuickProjectOpen, setIsQuickProjectOpen] = useState(false);
  const [isClientProjectOpen, setIsClientProjectOpen] = useState(false);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const navigate = (path: string) => {
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (user && user.role !== 'CLIENT' && user.role !== 'CLIENT_ADMIN') {
      api.getClients().then(setClients).catch(() => {});
      api.getProjects().then(setProjects).catch(() => {});
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        api.getUsers().then(setUsers).catch(() => {});
      }
    }
  }, [user]);

  // Real-time server events listener (SSE) for automatic live updates across all tabs & roles
  useEffect(() => {
    if (!user) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('update', (event) => {
        try {
          const payload = JSON.parse(event.data);
          window.dispatchEvent(new CustomEvent('portal:data-updated', { detail: payload }));
        } catch {
          window.dispatchEvent(new CustomEvent('portal:data-updated', { detail: {} }));
        }
      });

      eventSource.onerror = () => {
        // SSE handles reconnection automatically
      };
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
  }, [user]);

  // Redirect SUPER_ADMIN away from worker task detail page to tasks list
  useEffect(() => {
    if (user?.role === 'SUPER_ADMIN' && currentPath.startsWith('/tasks/')) {
      setCurrentPath('/tasks');
    }
  }, [user?.role, currentPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <LoadingSpinner message="Authenticating team workspace..." size="lg" />
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

  // Route & Role protection: Restrict portal to SUPER_ADMIN, ADMIN, TEAM_MEMBER
  const isTeamRole = user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'TEAM_MEMBER';
  if (!isTeamRole) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border border-[#EDE7DD] shadow-xl text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#FDF2F0] border border-[#F5D5D0] flex items-center justify-center text-[#B91C1C]">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-serif font-bold text-[#1C1917] mb-2">
            Team Portal Access Only
          </h2>
          <p className="text-sm text-[#78716C] leading-relaxed mb-6 font-normal">
            You are signed in as <strong className="text-[#1C1917]">{user.name}</strong> with a Client account role ({user.role}). Please open the Client Portal to access your projects.
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

  // Parse task detail route: /tasks/:id (SUPER_ADMIN cannot enter worker task execution page)
  const taskDetailMatch = currentPath.match(/^\/tasks\/([a-zA-Z0-9_-]+)$/);
  const activeTaskId = taskDetailMatch && user?.role !== 'SUPER_ADMIN' ? taskDetailMatch[1] : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col antialiased selection:bg-[#EAE0D0] selection:text-[#1C1917]">
      {/* Top Navigation */}
      <Navbar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} onNavigate={navigate} />

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
              onNavigateToKanban={() => navigate('/kanban')}
              onNavigate={navigate}
            />
          ) : activeTaskId ? (
            <TaskDetailPage
              taskId={activeTaskId}
              onBack={() => navigate('/tasks')}
              onNavigate={navigate}
            />
          ) : currentPath === '/projects' ? (
            <ProjectsPage onNavigateToProject={(id) => navigate(`/projects/${id}`)} />
          ) : currentPath === '/kanban' ? (
            <KanbanPage />
          ) : currentPath === '/tasks' ? (
            <TasksPage onNavigate={navigate} />
          ) : currentPath === '/todos' ? (
            <TodoPage />
          ) : currentPath === '/milestones' ? (
            <MilestonesPage />
          ) : currentPath === '/approvals' ? (
            <ApprovalsPage onNavigate={navigate} />
          ) : currentPath === '/reports' ? (
            <ReportsPage onNavigate={navigate} />
          ) : currentPath === '/team' ? (
            user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? (
              <TeamPage onNavigate={navigate} />
            ) : (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            )
          ) : currentPath === '/clients' ? (
            user.role === 'SUPER_ADMIN' ? (
              <ClientsPage onNavigateToProjects={(clientId) => navigate(`/projects?client=${clientId}`)} />
            ) : (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            )
          ) : currentPath === '/access-requests' ? (
            user.role === 'SUPER_ADMIN' ? (
              <AccessRequestsPage />
            ) : (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            )
          ) : currentPath === '/users' ? (
            user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? (
              <UsersPage onNavigate={navigate} />
            ) : (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            )
          ) : currentPath === '/credentials' ? (
            user.role === 'SUPER_ADMIN' ? (
              <CredentialsPage />
            ) : (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            )
          ) : currentPath === '/profile' || currentPath === '/client-settings' ? (
            <ProfilePage />
          ) : currentPath === '/attendance' ? (
            <AttendancePage currentUser={user} />
          ) : currentPath === '/leaves' ? (
            <LeavesPage />
          ) : currentPath === '/sops' ? (
            <SOPPage />
          ) : currentPath === '/performance' ? (
            <PerformancePage />
          ) : currentPath === '/activities' ? (
            user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? (
              <ActivitiesPage />
            ) : (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            )
          ) : currentPath === '/chat' ? (
            <ChatPage />
          ) : currentPath === '/settings' ? (
            user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' ? (
              <AdminSettingsPage />
            ) : (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            )
          ) : (
            <DashboardPage
              onNavigate={navigate}
              onOpenNewProject={() => setIsQuickProjectOpen(true)}
              onOpenClientProject={() => setIsClientProjectOpen(true)}
              onOpenNewTask={() => setIsQuickTaskOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Mobile & Tablet Bottom Navigation Bar */}
      <BottomNavigation currentPath={currentPath} onNavigate={navigate} />

      {/* Global Quick Add Modals */}
      <ProjectModal
        isOpen={isQuickProjectOpen}
        onClose={() => setIsQuickProjectOpen(false)}
        onSuccess={() => {
          api.getProjects().then(setProjects).catch(() => {});
          navigate('/projects');
        }}
        clients={clients}
        teamMembers={users.filter((u) => u.role !== 'CLIENT' && u.role !== 'CLIENT_ADMIN')}
      />

      <ClientProjectRequestModal
        isOpen={isClientProjectOpen}
        onClose={() => setIsClientProjectOpen(false)}
        onSuccess={() => {
          api.getProjects().then(setProjects).catch(() => {});
          navigate('/projects');
        }}
      />

      <TaskModal
        isOpen={isQuickTaskOpen}
        onClose={() => setIsQuickTaskOpen(false)}
        onSuccess={() => {
          api.getProjects().then(setProjects).catch(() => {});
          navigate('/tasks');
        }}
        projects={projects}
        users={users}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <TeamPortalMain />
      </TimerProvider>
    </AuthProvider>
  );
}
