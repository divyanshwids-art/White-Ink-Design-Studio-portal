export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_MEMBER' | 'CLIENT' | 'CLIENT_ADMIN';
export type ProjectStatus = 'PENDING' | 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'REVISION_REQUESTED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_STATUS'
  | 'PROJECT_ASSIGNED'
  | 'MILESTONE_DUE'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_RESOLVED'
  | 'ATTENDANCE_ALERT'
  | 'LEAVE_REQUESTED'
  | 'LEAVE_RESOLVED'
  | 'PERFORMANCE_REVIEW'
  | 'CHAT_MENTION'
  | 'GENERAL';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  profileImage?: string | null;
  fcmToken?: string | null;
  clientId?: string | null;
  mustChangePassword?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AccessRequest {
  id: string;
  name: string;
  email: string;
  requestedRole: Role;
  companyName?: string | null;
  status: AccessRequestStatus;
  rejectionReason?: string | null;
  reviewedById?: string | null;
  reviewedBy?: User | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface IssuedCredential {
  id: string;
  userId: string;
  email: string;
  plaintextPassword: string;
  createdById: string;
  createdAt: string;
  user?: User | null;
  createdBy?: User | null;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  driveFolderId?: string | null;
  driveFolderUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
  projectCount?: number;
  activeProjectCount?: number;
  projects?: Project[];
}

export interface Milestone {
  id: string;
  name: string;
  description?: string | null;
  projectId: string;
  dueDate?: string | null;
  status: MilestoneStatus;
  progress: number; // 0-100
  createdAt?: string;
  updatedAt?: string;
  project?: { id: string; name: string; status?: ProjectStatus } | null;
}

export interface ClientApproval {
  id: string;
  title: string;
  description?: string | null;
  projectId: string;
  deliverableUrl?: string | null;
  status: ApprovalStatus;
  requestedById: string;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  comments?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: { id: string; name: string; clientId?: string; client?: Client } | null;
  requestedBy?: User | null;
  reviewedBy?: User | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  clientId: string;
  createdById: string;
  startDate?: string | null;
  dueDate?: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  estimatedBudget?: number | null;
  leadOwnerId?: string | null;
  preferredMeetingTime?: string | null;
  meetingLink?: string | null;
  calendarEventId?: string | null;
  driveFolderId?: string | null;
  handoverNote?: string | null;
  driveUrl?: string | null;
  handoverDocs?: string | null;
  handoverDocsList?: HandoverDocument[];
  handoverCompletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  client?: Client | null;
  createdBy?: User | null;
  members?: (User & { memberRecordId?: string })[];
  tasks?: Task[];
  milestones?: Milestone[];
  approvals?: ClientApproval[];
  meetings?: Meeting[];
  comments?: Comment[];
  taskCount?: number;
  completedTaskCount?: number;
  pendingApprovalsCount?: number;
  handoverEligible?: boolean;
  handoverEligibility?: {
    eligible: boolean;
    totalTasks: number;
    completedTasks: number;
    submittedTasks: number;
    approvedTasks: number;
    pendingTasks: number;
    revisionRequestedTasks: number;
  };
  stats?: {
    totalTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    reviewTasks: number;
    completedTasks: number;
  };
}

export interface HandoverDocument {
  id: string;
  name: string;
  size: string;
  type?: string;
  dataUrl?: string | null;
  uploadedAt: string;
  uploadedById?: string;
  uploadedByName?: string;
  note?: string | null;
}

export interface RevisionRequest {
  feedback: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  targetDate?: string | null;
  files: { name: string; size: string }[];
  submittedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  projectId: string;
  assignedToId?: string | null;
  createdById: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  dueDate?: string | null;
  revisionRequest?: RevisionRequest | null;
  submissionDescription?: string | null;
  proofDetails?: string | null;
  deliverableUrl?: string | null;
  driveFileId?: string | null;
  driveFileName?: string | null;
  driveFileSize?: number | null;
  driveFileMimeType?: string | null;
  submittedById?: string | null;
  submittedAt?: string | null;
  clientApprovalStatus?: ApprovalStatus;
  clientReviewComments?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  project?: { id: string; name: string; status?: ProjectStatus } | null;
  assignedTo?: User | null;
  createdBy?: User | null;
  comments?: Comment[];
  commentsCount?: number;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  projectId?: string | null;
  taskId?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id?: string;
    name: string;
    email?: string;
    profileImage?: string | null;
    role?: Role;
  };
}

export interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  planningProjects: number;
  onHoldProjects: number;

  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  completedTasks: number;

  totalClients: number;
  totalTeamMembers: number;
  averageProjectProgress: number;
}

export interface RecentProject {
  id: string;
  name: string;
  clientName: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  startDate?: string | null;
  dueDate?: string | null;
  taskCount: number;
  completedTaskCount: number;
}

export interface RecentTask {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  dueDate?: string | null;
  assignedTo?: User | null;
}

export interface Break {
  id: string;
  attendanceId: string;
  startTime: string;
  endTime?: string | null;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Attendance {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn?: string | null;
  clockOut?: string | null;
  status: AttendanceStatus;
  totalWorkingMinutes: number;
  totalBreakMinutes: number;
  effectiveWorkingMinutes: number;
  sheetsSyncedAt?: string | null;
  sheetsRowIndex?: number | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  breaks: Break[];
  activeBreak?: Break | null;
  isCurrentlyWorking?: boolean;
  liveWorkingMinutes?: number;
  liveBreakMinutes?: number;
  liveEffectiveMinutes?: number;
}

export interface AttendanceStats {
  today: string;
  totalTeamMembers: number;
  presentToday: number;
  absentToday: number;
  currentlyWorking: number;
  onBreak: number;
  lateToday: number;
  halfDayToday: number;
  onLeaveToday: number;
  avgWorkingHours: number;
  avgWorkingMinutes: number;
  statusBreakdown: {
    PRESENT: number;
    LATE: number;
    HALF_DAY: number;
    ON_LEAVE: number;
    ABSENT: number;
  };
  weeklyTrend: {
    date: string;
    day: string;
    present: number;
    late: number;
    onLeave: number;
  }[];
}

export interface TeamMemberWorkload {
  user: User;
  totalTasksCount: number;
  activeTasksCount: number;
  completedTasksCount: number;
  assignedProjectCount: number;
  inProgressTasksCount?: number;
  activeProjectsCount?: number;
  workloadLevel: 'LOW' | 'OPTIMAL' | 'HIGH' | 'OVERLOADED';
  todayAttendanceStatus: string;
  isCurrentlyWorking: boolean;
  isOnBreak: boolean;
}

export interface ReportsOverview {
  projectMetrics: {
    total: number;
    active: number;
    completed: number;
    onHold: number;
    planning: number;
    averageProgress: number;
    byPriority: Record<ProjectPriority, number>;
  };
  taskMetrics: {
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    completed: number;
    completionRate: number;
    byPriority: Record<TaskPriority, number>;
  };
  milestoneMetrics: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  approvalMetrics: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  attendanceSummary: AttendanceStats;
  teamWorkload: TeamMemberWorkload[];
}

export type LeaveType =
  | 'CASUAL'
  | 'SICK'
  | 'ANNUAL'
  | 'UNPAID'
  | 'EMERGENCY'
  | 'MATERNITY_PATERNITY'
  | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveRequest {
  id: string;
  userId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  isBackdated: boolean;
  status: LeaveStatus;
  approvedById?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
  approvedBy?: User | null;
}

export interface SOPDocument {
  id: string;
  title: string;
  category: string;
  content: string;
  version: string;
  tags?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: User;
}

export type ReviewStatus = 'DRAFT' | 'PUBLISHED' | 'ACKNOWLEDGED';

export interface PerformanceReview {
  id: string;
  employeeId: string;
  reviewerId: string;
  reviewPeriod: string;
  score: number;
  strengths?: string | null;
  improvements?: string | null;
  notes?: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  employee?: User;
  reviewer?: User;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: User;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  channel: string;
  content: string;
  attachments?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: User;
}

export interface SystemSettings {
  id: string;
  officeStartTime: string;
  officeEndTime: string;
  lateThresholdMinutes: number;
  maxBreakMinutes: number;
  defaultLeaveAllowance: number;
  taskRules?: string | null;
  reasonsList?: string | null;
  updatedAt: string;
}

export interface EmployeeScheduleOverride {
  id: string;
  userId: string;
  customStartTime: string;
  customEndTime: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface Meeting {
  id: string;
  projectId: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime: string;
  calendarEventId?: string | null;
  meetLink?: string | null;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string };
}

export interface GoogleIntegrationStatus {
  isConnected: boolean;
  connectedEmail?: string | null;
  driveRootFolderId?: string | null;
  sheetsAttendanceSpreadsheetId?: string | null;
  sheetsAttendanceSheetName?: string | null;
  calendarId?: string | null;
  lastSyncAt?: string | null;
  updatedAt?: string;
}

export interface TaskImportFailedRow {
  row: number;
  title: string;
  reason: string;
}

export interface TaskImportResult {
  total: number;
  imported: number;
  failed: number;
  failedRows: TaskImportFailedRow[];
  importedTasks: Task[];
}
