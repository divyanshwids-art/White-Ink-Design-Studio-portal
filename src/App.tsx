import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TimerProvider } from './context/TimerContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
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
import { ClientSettingsPage } from './pages/ClientSettingsPage';
import { ForcePasswordChangePage } from './pages/ForcePasswordChangePage';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ProjectModal } from './components/projects/ProjectModal';
import { ClientProjectRequestModal } from './components/projects/ClientProjectRequestModal';
import { TaskModal } from './components/tasks/TaskModal';
import { api } from './services/api';
import { Client, Project, User } from './types';

function MainApp() {
  const { user, isLoading } = useAuth();
  const [authView, setAuthView] = useState<'landing' | 'login'>('landing');
  const [currentPath, setCurrentPath] = useState<string>('/dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Global Quick Modals
  const [isQuickProjectOpen, setIsQuickProjectOpen] = useState(false);
  const [isClientProjectOpen, setIsClientProjectOpen] = useState(false);
  const [isQuickTaskOpen, setIsQuickTaskOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Simple client-side router navigation
  const navigate = (path: string) => {
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (user) {
      // Pre-fetch collections for global quick-add actions
      api.getClients().then(setClients).catch(() => {});
      api.getProjects().then(setProjects).catch(() => {});
      if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
        api.getUsers().then(setUsers).catch(() => {});
      }
    }
  }, [user]);

  // Redirect client roles away from /users, /todos, or /kanban if navigated directly
  useEffect(() => {
    if (
      user &&
      (user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN') &&
      (currentPath === '/users' || currentPath === '/todos' || currentPath === '/kanban')
    ) {
      navigate('/dashboard');
    }
  }, [user, currentPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gold-50 flex items-center justify-center">
        <LoadingSpinner message="Authenticating workspace..." size="lg" />
      </div>
    );
  }

  if (!user) {
    if (authView === 'landing') {
      return <LandingPage onLogin={() => setAuthView('login')} />;
    }
    return <LoginPage />;
  }

  // Force password change screen on first login for users provisioned with generated passwords
  if (user.mustChangePassword) {
    return <ForcePasswordChangePage />;
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
            user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN' ? (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            ) : (
              <KanbanPage />
            )
          ) : currentPath === '/tasks' ? (
            <TasksPage onNavigate={navigate} />
          ) : currentPath === '/todos' ? (
            user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN' ? (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            ) : (
              <TodoPage />
            )
          ) : currentPath === '/milestones' ? (
            <MilestonesPage />
          ) : currentPath === '/approvals' ? (
            <ApprovalsPage onNavigate={navigate} />
          ) : currentPath === '/reports' ? (
            user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN' ? (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            ) : (
              <ReportsPage onNavigate={navigate} />
            )
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
          ) : currentPath === '/client-settings' ? (
            <ProfilePage />
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
          ) : currentPath === '/profile' ? (
            <ProfilePage />
          ) : currentPath === '/attendance' ? (
            user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN' ? (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            ) : (
              <AttendancePage currentUser={user} />
            )
          ) : currentPath === '/leaves' ? (
            user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN' ? (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            ) : (
              <LeavesPage />
            )
          ) : currentPath === '/sops' ? (
            <SOPPage />
          ) : currentPath === '/performance' ? (
            user.role === 'CLIENT' || user.role === 'CLIENT_ADMIN' ? (
              <DashboardPage
                onNavigate={navigate}
                onOpenNewProject={() => setIsQuickProjectOpen(true)}
                onOpenClientProject={() => setIsClientProjectOpen(true)}
                onOpenNewTask={() => setIsQuickTaskOpen(true)}
              />
            ) : (
              <PerformancePage />
            )
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
        <MainApp />
      </TimerProvider>
    </AuthProvider>
  );
}
