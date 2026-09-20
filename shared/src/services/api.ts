import {
  User,
  Client,
  Project,
  Task,
  Comment,
  DashboardStats,
  RecentProject,
  RecentTask,
  Role,
  ProjectStatus,
  ProjectPriority,
  TaskStatus,
  TaskPriority,
  Attendance,
  AttendanceStats,
  HandoverDocument,
  AccessRequest,
  IssuedCredential,
  Meeting,
  TaskImportResult,
  PersonalTodo,
  CreateTodoInput,
  UpdateTodoInput,
  TaskTimeLog,
  DailyActivitySummary,
  EodReport,
  SubmitEodInput,
  ReportsOverview,
} from '../types';

function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || '').trim();

  // In production, never allow localhost / 127.0.0.1 addresses to prevent broken API calls in client browser
  if (import.meta.env.PROD) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return '/api';
    }
  }

  if (envUrl) {
    const trimmed = envUrl.replace(/\/$/, '');
    // Ensure '/api' suffix if host URL provided without it
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  return '/api';
}

const API_BASE = getApiBaseUrl();

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token ? token.replace(/^["']|["']$/g, '').trim() : null;
  if (typeof window !== 'undefined' && window.localStorage) {
    if (inMemoryToken) {
      localStorage.setItem('pms_auth_token', inMemoryToken);
    } else {
      localStorage.removeItem('pms_auth_token');
    }
  }
}

export function getStoredToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = localStorage.getItem('pms_auth_token');
    if (raw) {
      const clean = raw.replace(/^["']|["']$/g, '').trim();
      inMemoryToken = clean;
      return clean;
    }
  }
  return null;
}

function getAuthHeader(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${cleanEndpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !cleanEndpoint.includes('/auth/login')) {
    setAuthToken(null);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pms:unauthorized'));
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Base configuration
  getBaseUrl: () => API_BASE,
  setAuthToken,
  getToken: getStoredToken,

  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: User; message: string; mustChangePassword?: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  changePassword: (payload: { currentPassword?: string; newPassword: string }) =>
    request<{ message: string; user?: User }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Access Requests (Tier 1)
  requestAccess: (payload: { name: string; email: string; requestedRole: Role; companyName?: string }) =>
    request<{ message: string; request: AccessRequest }>('/access-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAccessRequests: (params?: { status?: string }) => {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<AccessRequest[]>(`/access-requests${qs}`);
  },

  approveAccessRequest: (id: string) =>
    request<{
      message: string;
      user: User;
      plaintextPassword: string;
      accessRequest: AccessRequest;
      credentialId: string;
    }>(`/access-requests/${id}/approve`, {
      method: 'POST',
    }),

  rejectAccessRequest: (id: string, reason?: string) =>
    request<{ message: string; accessRequest: AccessRequest }>(`/access-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  // Credentials Vault
  getIssuedCredentials: () => request<IssuedCredential[]>('/credentials'),
  updateCredentialPassword: (userId: string, newPassword?: string) =>
    request<{ message: string; plaintextPassword: string }>(`/credentials/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword }),
    }),

  // Users
  getUsers: (params?: { search?: string; role?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role && params.role !== 'ALL') query.append('role', params.role);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<User[]>(`/users${qs}`);
  },

  getUserById: (id: string) => request<User>(`/users/${id}`),

  createUser: (payload: { name: string; email: string; role: Role; password?: string; profileImage?: string; clientId?: string | null }) =>
    request<User & { generatedPassword?: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUser: (id: string, payload: Partial<{ name: string; email: string; password: string; role: Role; profileImage?: string; clientId?: string | null; skills?: string[] | null }>) =>
    request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteUser: (id: string) =>
    request<{ message: string; deletedId: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),

  // Clients
  getClients: (search?: string) => {
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<Client[]>(`/clients${qs}`);
  },

  getClientById: (id: string) => request<Client>(`/clients/${id}`),

  createClient: (payload: { name: string; company: string; email: string; phone?: string; address?: string }) =>
    request<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createClientWithLogin: (payload: { name: string; company: string; email: string; phone?: string; address?: string }) =>
    request<Client & { generatedPassword?: string; loginEmail?: string }>('/clients/with-login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateClient: (id: string, payload: Partial<{ name: string; company: string; email: string; phone?: string; address?: string }>) =>
    request<Client>(`/clients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteClient: (id: string) =>
    request<{ message: string; deletedId: string }>(`/clients/${id}`, {
      method: 'DELETE',
    }),

  // Projects
  getProjects: (params?: { search?: string; status?: string; priority?: string; clientId?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.priority && params.priority !== 'ALL') query.append('priority', params.priority);
    if (params?.clientId) query.append('clientId', params.clientId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<Project[]>(`/projects${qs}`);
  },

  getProjectById: (id: string) => request<Project>(`/projects/${id}`),

  createProject: (payload: {
    name: string;
    description?: string;
    clientId: string;
    startDate?: string;
    dueDate?: string;
    status?: ProjectStatus;
    priority?: ProjectPriority;
    memberIds?: string[];
  }) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createClientProjectRequest: (payload: {
    name: string;
    description?: string;
    startDate?: string;
    dueDate?: string;
    estimatedBudget?: number;
    leadOwnerId?: string;
    preferredMeetingTime: string;
  }) =>
    request<{ project: Project; meetingLink: string | null; meetingTime: string; message: string }>('/projects/client-request', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateProject: (
    id: string,
    payload: Partial<{
      name: string;
      description?: string;
      clientId: string;
      startDate?: string;
      dueDate?: string;
      status: ProjectStatus;
      priority: ProjectPriority;
      handoverNote?: string | null;
      driveUrl?: string | null;
    }>
  ) =>
    request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  uploadHandoverDoc: (
    projectId: string,
    payload: {
      name: string;
      size?: string;
      type?: string;
      dataUrl?: string;
      note?: string;
    }
  ) =>
    request<{ message: string; doc: HandoverDocument; handoverDocs: HandoverDocument[] }>(
      `/projects/${projectId}/handover-docs`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  deleteHandoverDoc: (projectId: string, docId: string) =>
    request<{ message: string; handoverDocs: HandoverDocument[] }>(
      `/projects/${projectId}/handover-docs/${docId}`,
      {
        method: 'DELETE',
      }
    ),

  downloadProjectAuditReport: async (projectId: string, format: 'pdf' | 'csv' = 'pdf'): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/projects/${projectId}/audit-report?format=${format}`, {
      method: 'GET',
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to download project audit report');
    }
    return response.blob();
  },

  deleteProject: (id: string) =>
    request<{ message: string; deletedId: string }>(`/projects/${id}`, {
      method: 'DELETE',
    }),

  addProjectMember: (projectId: string, userId: string) =>
    request<any>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),

  removeProjectMember: (projectId: string, userId: string) =>
    request<{ message: string }>(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    }),

  // Tasks
  getTasks: (params?: { search?: string; status?: string; priority?: string; projectId?: string; assignedToId?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.priority && params.priority !== 'ALL') query.append('priority', params.priority);
    if (params?.projectId && params.projectId !== 'ALL') query.append('projectId', params.projectId);
    if (params?.assignedToId && params.assignedToId !== 'ALL') query.append('assignedToId', params.assignedToId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<Task[]>(`/tasks${qs}`);
  },

  getTaskById: (id: string) => request<Task>(`/tasks/${id}`),

  createTask: (payload: {
    title: string;
    description?: string;
    projectId: string;
    assignedToId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    progress?: number;
    dueDate?: string;
    allocatedMinutes?: number | null;
  }) =>
    request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTask: (
    id: string,
    payload: Partial<{
      title: string;
      description?: string;
      projectId: string;
      assignedToId?: string;
      status: TaskStatus;
      priority: TaskPriority;
      progress: number;
      dueDate?: string;
      allocatedMinutes?: number | null;
    }>
  ) =>
    request<Task>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateTaskStatus: (id: string, status: TaskStatus) =>
    request<Task>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  approveTask: (id: string) =>
    request<Task>(`/tasks/${id}/approve`, {
      method: 'PATCH',
    }),

  adminApproveTask: (id: string) =>
    request<Task>(`/tasks/${id}/admin-approve`, {
      method: 'PATCH',
    }),

  submitTask: (id: string, payload: { submissionDescription: string; proofDetails?: string; deliverableUrl?: string; file?: File }) => {
    if (payload.file) {
      const formData = new FormData();
      formData.append('submissionDescription', payload.submissionDescription);
      if (payload.proofDetails) formData.append('proofDetails', payload.proofDetails);
      if (payload.deliverableUrl) formData.append('deliverableUrl', payload.deliverableUrl);
      formData.append('file', payload.file);

      return fetch(`${API_BASE}/tasks/${id}/submit`, {
        method: 'POST',
        headers: getAuthHeader(),
        body: formData,
      }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Task submission failed');
        return data as Task;
      });
    }

    return request<Task>(`/tasks/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  submitRevisionRequest: (id: string, payload: {
    feedback: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    targetDate?: string;
    files: { name: string; size: string }[];
  }) =>
    request<Task>(`/tasks/${id}/revision`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  updateTaskProgress: (id: string, progress: number) =>
    request<Task>(`/tasks/${id}/progress`, {
      method: 'PATCH',
      body: JSON.stringify({ progress }),
    }),

  deleteTask: (id: string) =>
    request<{ message: string; deletedId: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    }),

  importTasks: async (formData: FormData): Promise<TaskImportResult> => {
    const response = await fetch(`${API_BASE}/tasks/import`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Failed to import tasks from Excel.');
    }
    return data as TaskImportResult;
  },

  downloadTaskTemplate: async (): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/tasks/import-template`, {
      method: 'GET',
      headers: {
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download task import template.');
    }
    return response.blob();
  },

  // Comments
  getProjectComments: (projectId: string) => request<Comment[]>(`/projects/${projectId}/comments`),
  addProjectComment: (projectId: string, content: string) =>
    request<Comment>(`/projects/${projectId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  getTaskComments: (taskId: string) => request<Comment[]>(`/tasks/${taskId}/comments`),
  addTaskComment: (taskId: string, content: string) =>
    request<Comment>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  deleteComment: (id: string) =>
    request<{ message: string; deletedId: string }>(`/comments/${id}`, {
      method: 'DELETE',
    }),

  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),
  getRecentProjects: () => request<RecentProject[]>('/dashboard/recent-projects'),
  getRecentTasks: () => request<RecentTask[]>('/dashboard/recent-tasks'),
  resetDemoDatabase: () => request<{ message: string }>('/dashboard/reset-seed', { method: 'POST' }),

  // Attendance
  clockIn: (payload?: { timestamp?: string; clockInReason?: string }) =>
    request<{ message: string; attendance: Attendance }>('/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  clockOut: (payload?: { timestamp?: string; earlyClockOutReason?: string; clockOutReason?: string; tomorrowTask?: string }) =>
    request<{ message: string; attendance: Attendance }>('/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  startBreak: (payload?: { timestamp?: string }) =>
    request<{ message: string; attendance: Attendance }>('/attendance/break/start', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  endBreak: (payload?: { timestamp?: string }) =>
    request<{ message: string; attendance: Attendance }>('/attendance/break/end', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  // Task Time Logging
  logTaskTime: (taskId: string, payload: { durationMinutes: number; notes?: string; date?: string }) =>
    request<{ message: string; log: TaskTimeLog }>(`/tasks/${taskId}/time-log`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getTaskTimeLogs: (taskId: string) =>
    request<TaskTimeLog[]>(`/tasks/${taskId}/time-logs`),

  submitTaskOverdueReason: (taskId: string, reason: string) =>
    request<{ message: string; task: Task }>(`/tasks/${taskId}/overdue-reason`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),

  // EOD Reports
  submitEodReport: (payload: SubmitEodInput) =>
    request<{ message: string; report: EodReport }>('/attendance/eod', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getDailyActivitySummary: (params?: { userId?: string; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.userId) query.append('userId', params.userId);
    if (params?.date) query.append('date', params.date);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<DailyActivitySummary>(`/attendance/eod/summary${qs}`);
  },

  getTodayEodReport: (date?: string) => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return request<{ report: EodReport | null }>(`/attendance/eod/today${qs}`);
  },

  getTeamEodReports: (params?: { userId?: string; date?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.userId && params.userId !== 'ALL') query.append('userId', params.userId);
    if (params?.date) query.append('date', params.date);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<EodReport[]>(`/attendance/eod/team${qs}`);
  },

  getTodayAttendance: (date?: string) => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return request<{ attendance: Attendance | null }>(`/attendance/today${qs}`);
  },

  getAttendanceHistory: (params?: {
    userId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.userId && params.userId !== 'ALL') query.append('userId', params.userId);
    if (params?.date) query.append('date', params.date);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<Attendance[]>(`/attendance/history${qs}`);
  },

  getTeamAttendance: (params?: {
    range?: 'today' | 'week' | 'month' | 'custom';
    startDate?: string;
    endDate?: string;
    employeeId?: string;
    status?: string;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.range) query.append('range', params.range);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.employeeId && params.employeeId !== 'ALL') query.append('employeeId', params.employeeId);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<Attendance[]>(`/attendance/team${qs}`);
  },

  getAttendanceById: (id: string) => request<Attendance>(`/attendance/${id}`),

  getAttendanceStats: (date?: string) => {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return request<AttendanceStats>(`/attendance/stats${qs}`);
  },

  // Milestones
  getMilestones: (params?: { projectId?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.projectId && params.projectId !== 'ALL') query.append('projectId', params.projectId);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<any[]>(`/milestones${qs}`);
  },

  getMilestoneById: (id: string) => request<any>(`/milestones/${id}`),

  createMilestone: (payload: {
    name: string;
    description?: string;
    projectId: string;
    dueDate?: string;
    status?: string;
    progress?: number;
  }) =>
    request<any>('/milestones', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateMilestone: (id: string, payload: Partial<{
    name: string;
    description?: string;
    projectId?: string;
    dueDate?: string;
    status?: string;
    progress?: number;
  }>) =>
    request<any>(`/milestones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteMilestone: (id: string) =>
    request<{ success: boolean; message: string }>(`/milestones/${id}`, {
      method: 'DELETE',
    }),

  // Admin Attendance adjustments
  adminUpdateAttendance: (id: string, payload: Partial<Attendance>) =>
    request<{ message: string; attendance: Attendance }>(`/attendance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  adminCreateAttendance: (payload: any) =>
    request<{ message: string; attendance: Attendance }>('/attendance/admin-create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Leaves
  getLeaves: (params?: { userId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.userId && params.userId !== 'ALL') query.append('userId', params.userId);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<any[]>(`/leaves${qs}`);
  },

  getLeaveById: (id: string) => request<any>(`/leaves/${id}`),

  createLeave: (payload: {
    userId?: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    totalDays?: number;
    reason: string;
    isBackdated?: boolean;
  }) =>
    request<{ message: string; leave: any }>('/leaves', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  approveLeave: (id: string) =>
    request<{ message: string; leave: any }>(`/leaves/${id}/approve`, {
      method: 'PUT',
    }),

  rejectLeave: (id: string, rejectionReason: string) =>
    request<{ message: string; leave: any }>(`/leaves/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    }),

  deleteLeave: (id: string) =>
    request<{ message: string }>(`/leaves/${id}`, {
      method: 'DELETE',
    }),

  // SOP Documents
  getSOPs: (params?: { category?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All') query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<any[]>(`/sops${qs}`);
  },

  getSOPById: (id: string) => request<any>(`/sops/${id}`),

  createSOP: (payload: {
    title: string;
    category?: string;
    content: string;
    version?: string;
    tags?: string;
    fileUrl?: string | null;
    fileName?: string | null;
    fileType?: string | null;
    logoUrl?: string | null;
    brandColors?: string | null;
    typography?: string | null;
    clientId?: string | null;
  }) =>
    request<{ message: string; sop: any }>('/sops', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateSOP: (
    id: string,
    payload: Partial<{
      title: string;
      category: string;
      content: string;
      version?: string;
      tags?: string;
      fileUrl?: string | null;
      fileName?: string | null;
      fileType?: string | null;
      logoUrl?: string | null;
      brandColors?: string | null;
      typography?: string | null;
      clientId?: string | null;
    }>
  ) =>
    request<{ message: string; sop: any }>(`/sops/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteSOP: (id: string) =>
    request<{ message: string }>(`/sops/${id}`, {
      method: 'DELETE',
    }),

  // Performance Reviews
  getPerformanceReviews: (params?: { employeeId?: string; reviewerId?: string }) => {
    const query = new URLSearchParams();
    if (params?.employeeId && params.employeeId !== 'ALL') query.append('employeeId', params.employeeId);
    if (params?.reviewerId && params.reviewerId !== 'ALL') query.append('reviewerId', params.reviewerId);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<any[]>(`/reviews${qs}`);
  },

  getPerformanceReviewById: (id: string) => request<any>(`/reviews/${id}`),

  createPerformanceReview: (payload: {
    employeeId: string;
    reviewPeriod: string;
    score: number;
    strengths?: string;
    improvements?: string;
    notes?: string;
    status?: string;
  }) =>
    request<{ message: string; review: any }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updatePerformanceReview: (
    id: string,
    payload: Partial<{
      reviewPeriod?: string;
      score?: number;
      strengths?: string;
      improvements?: string;
      notes?: string;
      status?: string;
    }>
  ) =>
    request<{ message: string; review: any }>(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  acknowledgePerformanceReview: (id: string) =>
    request<{ message: string; review: any }>(`/reviews/${id}/acknowledge`, {
      method: 'PUT',
    }),

  deletePerformanceReview: (id: string) =>
    request<{ message: string }>(`/reviews/${id}`, {
      method: 'DELETE',
    }),

  // Activity Logs
  getActivityLogs: (params?: { userId?: string; entityType?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.userId && params.userId !== 'ALL') query.append('userId', params.userId);
    if (params?.entityType && params.entityType !== 'ALL') query.append('entityType', params.entityType);
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<any[]>(`/activities${qs}`);
  },

  // Team Chat
  getChatChannels: () => request<{ id: string; name: string; type: 'internal' | 'client' }[]>('/chat/channels'),

  getChatMessages: (channel: string = 'internal', limit: number = 100) =>
    request<any[]>(`/chat/messages?channel=${encodeURIComponent(channel)}&limit=${limit}`),

  postChatMessage: (payload: { content: string; channel?: string; attachments?: any }) =>
    request<any>('/chat/messages', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteChatMessage: (id: string) =>
    request<{ message: string }>(`/chat/messages/${id}`, {
      method: 'DELETE',
    }),

  // System Settings & Overrides
  getSettings: () => request<any>('/settings'),

  updateSettings: (payload: any) =>
    request<{ message: string; settings: any }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  getScheduleOverrides: () => request<any[]>('/settings/overrides'),

  getMyScheduleOverride: () => request<{ override: any | null }>('/settings/overrides/mine'),

  setScheduleOverride: (payload: { userId: string; customStartTime: string; customEndTime: string; notes?: string }) =>
    request<{ message: string; override: any }>('/settings/overrides', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteScheduleOverride: (userId: string) =>
    request<{ message: string }>(`/settings/overrides/${userId}`, {
      method: 'DELETE',
    }),

  // Push Notifications
  subscribePush: (payload: any) =>
    request<any>('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  unsubscribePush: (endpoint: string) =>
    request<any>('/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    }),

  // Client Approvals
  getApprovals: (params?: { projectId?: string; status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.projectId && params.projectId !== 'ALL') query.append('projectId', params.projectId);
    if (params?.status && params.status !== 'ALL') query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<any[]>(`/approvals${qs}`);
  },

  getApprovalById: (id: string) => request<any>(`/approvals/${id}`),

  createApproval: (payload: {
    title: string;
    description?: string;
    projectId: string;
    deliverableUrl?: string;
  }) =>
    request<any>('/approvals', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateApproval: (id: string, payload: Partial<{
    status: 'APPROVED' | 'REJECTED' | 'PENDING';
    comments?: string;
    title?: string;
    description?: string;
    deliverableUrl?: string;
  }>) =>
    request<any>(`/approvals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  deleteApproval: (id: string) =>
    request<{ success: boolean; message: string }>(`/approvals/${id}`, {
      method: 'DELETE',
    }),

  // Notifications
  getNotifications: () => request<{ notifications: any[]; unreadCount: number }>('/notifications'),

  getFcmConfig: () =>
    request<{
      configured: boolean;
      hasAdminCredentials?: boolean;
      config: {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
        vapidKey: string;
      };
      adminConfig?: {
        projectId?: string;
        clientEmail?: string;
        hasPrivateKey?: boolean;
      };
    }>('/notifications/fcm-config'),

  saveFcmConfig: (payload: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    vapidKey?: string;
    clientEmail?: string;
    privateKey?: string;
    serviceAccountJson?: string;
  }) =>
    request<{
      success: boolean;
      message: string;
      configured: boolean;
      hasAdminCredentials: boolean;
      adminInitSuccess?: boolean;
      adminError?: string;
      config: any;
    }>('/notifications/fcm-config', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  clearFcmConfig: () =>
    request<{ success: boolean; message: string }>('/notifications/fcm-config', {
      method: 'DELETE',
    }),

  verifyAdminFcm: () =>
    request<{ success: boolean; message: string }>('/notifications/verify-admin-fcm', {
      method: 'POST',
    }),

  registerFcmToken: (token: string) =>
    request<{ success: boolean; message: string; fcmToken?: string }>('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  testFcmPush: (payload?: { title?: string; message?: string; linkUrl?: string }) =>
    request<{ success: boolean; message: string }>('/notifications/test-push', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),

  markNotificationRead: (id: string) =>
    request<{ notification: any; unreadCount: number }>(`/notifications/${id}/read`, {
      method: 'PUT',
    }),

  markAllNotificationsRead: () =>
    request<{ success: boolean; updatedCount: number; unreadCount: number; notifications: any[] }>(
      '/notifications/read-all',
      {
        method: 'PUT',
      }
    ),

  deleteNotification: (id: string) =>
    request<{ success: boolean; message: string; unreadCount: number }>(`/notifications/${id}`, {
      method: 'DELETE',
    }),

  // Reports & Analytics
  getReportsOverview: () => request<ReportsOverview>('/reports/overview'),

  getTeamWorkload: () => request<any[]>('/reports/workload'),

  getTeamMembersWorkload: () => request<any[]>('/users/team-workload'),

  exportReportsCsv: async (): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/reports/export/csv`, {
      method: 'GET',
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to export CSV report');
    }
    return response.blob();
  },

  exportReportsPdf: async (): Promise<Blob> => {
    const response = await fetch(`${API_BASE}/reports/export/pdf`, {
      method: 'GET',
      headers: getAuthHeader(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to export PDF report');
    }
    return response.blob();
  },

  // Google Integration (SUPER_ADMIN)
  getGoogleStatus: () =>
    request<{
      isConnected: boolean;
      email: string | null;
      scopes: string[];
      driveRootFolderId: string | null;
      sheetsAttendanceSpreadsheetId: string | null;
      sheetsAttendanceSheetName: string | null;
      calendarId: string | null;
      lastSyncAt: string | null;
      error: string | null;
    }>('/google/status'),

  getGoogleConnectUrl: () => request<{ url: string }>('/google/connect'),

  disconnectGoogle: () =>
    request<{ success: boolean; message: string }>('/google/disconnect', {
      method: 'POST',
    }),

  updateGoogleSettings: (payload: {
    sheetsAttendanceSpreadsheetId?: string;
    sheetsAttendanceSheetName?: string;
    calendarId?: string;
    driveRootFolderId?: string;
  }) =>
    request<{ message: string; settings: any }>('/google/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  syncGoogleAttendance: () =>
    request<{ success: boolean; syncedCount: number; failedCount: number; error?: string }>(
      '/google/sync-attendance',
      {
        method: 'POST',
      }
    ),

  // Project Meetings (Google Calendar + Meet)
  getProjectMeetings: (projectId: string) =>
    request<Meeting[]>(`/projects/${projectId}/meetings`),

  createProjectMeeting: (
    projectId: string,
    payload: {
      title: string;
      description?: string;
      startTime: string;
      endTime: string;
      attendeeEmails?: string[];
    }
  ) =>
    request<{ message: string; meeting: Meeting; meetLink?: string; calendarEventId?: string }>(
      `/projects/${projectId}/meetings`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  updateProjectMeeting: (
    projectId: string,
    meetingId: string,
    payload: {
      title?: string;
      description?: string;
      startTime?: string;
      endTime?: string;
      status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
    }
  ) =>
    request<{ success: boolean; meeting: Meeting }>(
      `/projects/${projectId}/meetings/${meetingId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    ),

  cancelProjectMeeting: (projectId: string, meetingId: string) =>
    request<{ message: string; meeting: Meeting; success: boolean }>(
      `/projects/${projectId}/meetings/${meetingId}`,
      {
        method: 'DELETE',
      }
    ),

  // Personal Todos
  getTodos: () => request<PersonalTodo[]>('/todos'),

  getTodoById: (id: string) => request<PersonalTodo>(`/todos/${id}`),

  createTodo: (payload: CreateTodoInput) =>
    request<{ message: string; todo: PersonalTodo }>('/todos', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateTodo: (id: string, payload: UpdateTodoInput) =>
    request<{ message: string; todo: PersonalTodo }>(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  toggleTodo: (id: string) =>
    request<{ message: string; todo: PersonalTodo }>(`/todos/${id}/toggle`, {
      method: 'PATCH',
    }),

  deleteTodo: (id: string) =>
    request<{ message: string }>(`/todos/${id}`, {
      method: 'DELETE',
    }),
};
