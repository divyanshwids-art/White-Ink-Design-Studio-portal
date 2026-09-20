import { prisma, isPrismaConfigured } from './prisma.ts';
import { runSeed, getSeedData } from '../prisma/seed.ts';
import { sendFcmPushNotification } from './firebase.ts';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'TEAM_MEMBER' | 'CLIENT' | 'CLIENT_ADMIN';
export type ProjectStatus = 'PENDING' | 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'REVISION_REQUESTED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE';
export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
export type ApprovalStatus = 'INTERNAL_REVIEW' | 'PENDING' | 'APPROVED' | 'REJECTED';
export type LeaveType =
  | 'CASUAL'
  | 'SICK'
  | 'ANNUAL'
  | 'UNPAID'
  | 'EMERGENCY'
  | 'MATERNITY_PATERNITY'
  | 'OTHER';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ReviewStatus = 'DRAFT' | 'PUBLISHED' | 'ACKNOWLEDGED';
export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

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

export type AccessRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AccessRequestRecord {
  id: string;
  name: string;
  email: string;
  requestedRole: Role;
  companyName?: string | null;
  status: AccessRequestStatus;
  rejectionReason?: string | null;
  reviewedById?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

export interface IssuedCredentialRecord {
  id: string;
  userId: string;
  email: string;
  plaintextPassword: string;
  createdById: string;
  createdAt: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  profileImage?: string | null;
  skills?: string[] | null;
  fcmToken?: string | null;
  clientId?: string | null;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientRecord {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  driveFolderId?: string | null;
  driveFolderUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRecord {
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
  handoverCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HandoverDocRecord {
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

export interface ProjectMemberRecord {
  id: string;
  projectId: string;
  userId: string;
}

export interface TaskRecord {
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
  allocatedMinutes?: number | null;
  revisionRequest?: string | null; // JSON string of RevisionRequest
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
  overdueReason?: string | null;
  overdueReasonSubmittedAt?: string | null;
  overdueNotifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneRecord {
  id: string;
  name: string;
  description?: string | null;
  projectId: string;
  dueDate?: string | null;
  status: MilestoneStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClientApprovalRecord {
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
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface CommentRecord {
  id: string;
  content: string;
  userId: string;
  projectId?: string | null;
  taskId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BreakRecord {
  id: string;
  attendanceId: string;
  startTime: string;
  endTime?: string | null;
  durationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  clockIn?: string | null;
  clockOut?: string | null;
  earlyClockOutReason?: string | null;
  clockInReason?: string | null;
  clockOutReason?: string | null;
  status: AttendanceStatus;
  totalWorkingMinutes: number;
  totalBreakMinutes: number;
  effectiveWorkingMinutes: number;
  sheetsSyncedAt?: string | null;
  sheetsRowIndex?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTimeLogRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName?: string;
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  notes?: string | null;
  createdAt: string;
}

export interface EodTaskReportItemRecord {
  id: string;
  title: string;
  projectName?: string;
  timeSpentMinutes?: number;
  progress?: number;
  status?: string;
  type: 'TASK' | 'TODO';
}

export interface EodReportRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  date: string; // YYYY-MM-DD
  totalWorkingMinutes: number;
  totalBreakMinutes: number;
  completedTasks: EodTaskReportItemRecord[];
  inProgressTasks: EodTaskReportItemRecord[];
  summaryNote?: string | null;
  blockers?: string | null;
  submittedAt: string;
}


export interface MeetingRecord {
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
}

export interface PersonalTodoRecord {
  id: string;
  title: string;
  description?: string | null;
  completed: boolean;
  dueDate?: string | null;
  createdById: string;
  assignedToId?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    profileImage?: string | null;
  };
  assignedTo?: {
    id: string;
    name: string;
    email: string;
    role: Role;
    profileImage?: string | null;
  } | null;
}

export interface GoogleIntegrationRecord {
  id: string;
  connectedEmail?: string | null;
  encryptedRefreshToken?: string | null;
  accessToken?: string | null;
  tokenExpiry?: string | null;
  scopes?: string | null;
  isConnected: boolean;
  driveRootFolderId?: string | null;
  sheetsAttendanceSpreadsheetId?: string | null;
  sheetsAttendanceSheetName?: string | null;
  calendarId?: string | null;
  lastSyncAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceWithDetails extends AttendanceRecord {
  user?: Omit<UserRecord, 'passwordHash'>;
  breaks: BreakRecord[];
  activeBreak?: BreakRecord | null;
  isCurrentlyWorking?: boolean;
  liveWorkingMinutes?: number;
  liveBreakMinutes?: number;
  liveEffectiveMinutes?: number;
}

export interface LeaveRecord {
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
  user?: Omit<UserRecord, 'passwordHash'>;
  approvedBy?: Omit<UserRecord, 'passwordHash'> | null;
}

export interface SOPRecord {
  id: string;
  title: string;
  category: string;
  content: string;
  version: string;
  tags?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: Omit<UserRecord, 'passwordHash'>;
}

export interface PerformanceReviewRecord {
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
  employee?: Omit<UserRecord, 'passwordHash'>;
  reviewer?: Omit<UserRecord, 'passwordHash'>;
}

export interface ActivityLogRecord {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
  user?: Omit<UserRecord, 'passwordHash'>;
}

export interface ChatMessageRecord {
  id: string;
  senderId: string;
  channel: string;
  content: string;
  attachments?: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: Omit<UserRecord, 'passwordHash'>;
}

export interface SystemSettingsRecord {
  id: string;
  officeStartTime: string;
  officeEndTime: string;
  lateThresholdMinutes: number;
  maxBreakMinutes: number;
  defaultLeaveAllowance: number;
  taskRules?: string | null;
  reasonsList?: string | null;
  meetingLink?: string | null;
  updatedAt: string;
}

export interface EmployeeScheduleOverrideRecord {
  id: string;
  userId: string;
  customStartTime: string;
  customEndTime: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: Omit<UserRecord, 'passwordHash'>;
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  authKey: string;
  p256dhKey: string;
  createdAt: string;
}

export interface DatabaseSchema {
  users: UserRecord[];
  clients: ClientRecord[];
  projects: ProjectRecord[];
  projectMembers: ProjectMemberRecord[];
  tasks: TaskRecord[];
  comments: CommentRecord[];
  attendances: AttendanceRecord[];
  breaks: BreakRecord[];
  milestones: MilestoneRecord[];
  approvals: ClientApprovalRecord[];
  notifications: NotificationRecord[];
  leaves: LeaveRecord[];
  sops: SOPRecord[];
  reviews: PerformanceReviewRecord[];
  activities: ActivityLogRecord[];
  chatMessages: ChatMessageRecord[];
  settings: SystemSettingsRecord;
  scheduleOverrides: EmployeeScheduleOverrideRecord[];
  pushSubscriptions: PushSubscriptionRecord[];
  accessRequests: AccessRequestRecord[];
  issuedCredentials: IssuedCredentialRecord[];
  meetings: MeetingRecord[];
  googleIntegration: GoogleIntegrationRecord | null;
  todos: PersonalTodoRecord[];
  taskTimeLogs: TaskTimeLogRecord[];
  eodReports: EodReportRecord[];
}

export function getTodayDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toIsoSafe(val: any, fallback = new Date().toISOString()): string {
  if (!val) return fallback;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? fallback : d.toISOString();
  }
  return fallback;
}

function toNullableIsoSafe(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

class DatabaseService {
  private data: DatabaseSchema = {
    users: [],
    clients: [],
    projects: [],
    projectMembers: [],
    tasks: [],
    comments: [],
    attendances: [],
    breaks: [],
    milestones: [],
    approvals: [],
    notifications: [],
    leaves: [],
    sops: [],
    reviews: [],
    activities: [],
    chatMessages: [],
    accessRequests: [],
    issuedCredentials: [],
    meetings: [],
    googleIntegration: null,
    todos: [],
    taskTimeLogs: [],
    eodReports: [],
    settings: {
      id: 'system_config',
      officeStartTime: '09:00',
      officeEndTime: '18:00',
      lateThresholdMinutes: 15,
      maxBreakMinutes: 60,
      defaultLeaveAllowance: 20,
      meetingLink: null,
      taskRules: JSON.stringify({
        requireReviewBeforeComplete: true,
        allowSelfAssign: true,
        maxActiveTasksPerMember: 5,
      }),
      reasonsList: JSON.stringify([
        'Traffic Congestion / Transit Delay',
        'Medical / Health Issue',
        'Family Emergency',
        'Bad Weather / Monsoon',
        'Vehicle Breakdown',
        'Prior Approved Late Entry',
        'Work From Remote Location',
        'Client Meeting Outside Office',
      ]),
      updatedAt: new Date().toISOString(),
    },
    scheduleOverrides: [],
    pushSubscriptions: [],
  };
  private isInitialized = false;
  private isPrismaActive = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.init().catch((err) => {
      console.warn('Database async init note:', err?.message);
    });
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        if (isPrismaConfigured && prisma) {
          await prisma.$connect();
          this.isPrismaActive = true;
          const userCount = await prisma.user.count();
          if (userCount === 0) {
            await this.resetToSeed();
          } else {
            await this.loadFromPrisma();
          }
        } else {
          const seed = await getSeedData();
          this.populateInMemory(seed);
        }
        this.isInitialized = true;
      } catch (err: any) {
        this.isPrismaActive = false;
        console.info('Operating with robust in-memory database store (Prisma note:', err?.message, ')');
        if (this.data.users.length === 0) {
          const seed = await getSeedData();
          this.populateInMemory(seed);
        }
        this.isInitialized = true;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private async loadFromPrisma() {
    if (!prisma || !this.isPrismaActive) return;
    try {
      const [
        users,
        clients,
        projects,
        projectMembers,
        tasks,
        comments,
        attendances,
        breaks,
        milestones,
        approvals,
        notifications,
        leaves,
        sops,
        reviews,
        activities,
        chatMessages,
        settings,
        scheduleOverrides,
        pushSubscriptions,
        accessRequests,
        issuedCredentials,
        meetings,
        googleInt,
        todos,
      ] = await Promise.all([
        prisma.user.findMany().catch((err) => { console.warn('Prisma load users err:', err?.message); return []; }),
        prisma.client.findMany().catch((err) => { console.warn('Prisma load clients err:', err?.message); return []; }),
        prisma.project.findMany().catch((err) => { console.warn('Prisma load projects err:', err?.message); return []; }),
        prisma.projectMember.findMany().catch((err) => { console.warn('Prisma load projectMembers err:', err?.message); return []; }),
        prisma.task.findMany().catch((err) => { console.warn('Prisma load tasks err:', err?.message); return []; }),
        prisma.comment.findMany().catch((err) => { console.warn('Prisma load comments err:', err?.message); return []; }),
        prisma.attendance.findMany().catch((err) => { console.warn('Prisma load attendances err:', err?.message); return []; }),
        prisma.break.findMany().catch((err) => { console.warn('Prisma load breaks err:', err?.message); return []; }),
        prisma.milestone.findMany().catch((err) => { console.warn('Prisma load milestones err:', err?.message); return []; }),
        prisma.clientApproval.findMany().catch((err) => { console.warn('Prisma load approvals err:', err?.message); return []; }),
        prisma.notification.findMany().catch((err) => { console.warn('Prisma load notifications err:', err?.message); return []; }),
        prisma.leaveRequest.findMany().catch((err) => { console.warn('Prisma load leaves err:', err?.message); return []; }),
        prisma.sOPDocument.findMany().catch((err) => { console.warn('Prisma load sops err:', err?.message); return []; }),
        prisma.performanceReview.findMany().catch((err) => { console.warn('Prisma load reviews err:', err?.message); return []; }),
        prisma.activityLog.findMany().catch((err) => { console.warn('Prisma load activities err:', err?.message); return []; }),
        prisma.chatMessage.findMany().catch((err) => { console.warn('Prisma load chatMessages err:', err?.message); return []; }),
        prisma.systemSettings.findFirst().catch((err) => { console.warn('Prisma load settings err:', err?.message); return null; }),
        prisma.employeeScheduleOverride.findMany().catch((err) => { console.warn('Prisma load scheduleOverrides err:', err?.message); return []; }),
        prisma.pushSubscription.findMany().catch((err) => { console.warn('Prisma load pushSubscriptions err:', err?.message); return []; }),
        prisma.accessRequest.findMany().catch((err) => { console.warn('Prisma load accessRequests err:', err?.message); return []; }),
        prisma.issuedCredential.findMany().catch((err) => { console.warn('Prisma load issuedCredentials err:', err?.message); return []; }),
        prisma.meeting.findMany().catch((err) => { console.warn('Prisma load meetings err:', err?.message); return []; }),
        prisma.googleIntegration.findFirst().catch((err) => { console.warn('Prisma load googleIntegration err:', err?.message); return null; }),
        (prisma as any).personalTodo?.findMany().catch((err: any) => { console.warn('Prisma load todos err:', err?.message); return []; }) || [],
      ]);

      this.data = {
        users: users.map((u) => ({
          ...u,
          createdAt: toIsoSafe(u.createdAt),
          updatedAt: toIsoSafe(u.updatedAt),
        })) as UserRecord[],
        clients: clients.map((c) => ({
          ...c,
          createdAt: toIsoSafe(c.createdAt),
          updatedAt: toIsoSafe(c.updatedAt),
        })) as ClientRecord[],
        projects: projects.map((p: any) => ({
          ...p,
          startDate: toNullableIsoSafe(p.startDate),
          dueDate: toNullableIsoSafe(p.dueDate),
          preferredMeetingTime: toNullableIsoSafe(p.preferredMeetingTime),
          handoverCompletedAt: toNullableIsoSafe(p.handoverCompletedAt),
          createdAt: toIsoSafe(p.createdAt),
          updatedAt: toIsoSafe(p.updatedAt),
        })) as unknown as ProjectRecord[],
        projectMembers: projectMembers as ProjectMemberRecord[],
        tasks: tasks.map((t) => ({
          ...t,
          dueDate: toNullableIsoSafe(t.dueDate),
          submittedAt: toNullableIsoSafe(t.submittedAt),
          reviewedAt: toNullableIsoSafe(t.reviewedAt),
          createdAt: toIsoSafe(t.createdAt),
          updatedAt: toIsoSafe(t.updatedAt),
        })) as TaskRecord[],
        comments: comments.map((c) => ({
          ...c,
          createdAt: toIsoSafe(c.createdAt),
          updatedAt: toIsoSafe(c.updatedAt),
        })) as CommentRecord[],
        attendances: attendances.map((a: any) => ({
          ...a,
          clockIn: toNullableIsoSafe(a.clockIn),
          clockOut: toNullableIsoSafe(a.clockOut),
          earlyClockOutReason: a.earlyClockOutReason ?? null,
          sheetsSyncedAt: toNullableIsoSafe(a.sheetsSyncedAt),
          sheetsRowIndex: a.sheetsRowIndex ?? null,
          createdAt: toIsoSafe(a.createdAt),
          updatedAt: toIsoSafe(a.updatedAt),
        })) as AttendanceRecord[],
        breaks: breaks.map((b) => ({
          ...b,
          startTime: toIsoSafe(b.startTime),
          endTime: toNullableIsoSafe(b.endTime),
          createdAt: toIsoSafe(b.createdAt),
          updatedAt: toIsoSafe(b.updatedAt),
        })) as BreakRecord[],
        milestones: milestones.map((m) => ({
          ...m,
          dueDate: toNullableIsoSafe(m.dueDate),
          createdAt: toIsoSafe(m.createdAt),
          updatedAt: toIsoSafe(m.updatedAt),
        })) as MilestoneRecord[],
        approvals: approvals.map((a) => ({
          ...a,
          reviewedAt: toNullableIsoSafe(a.reviewedAt),
          createdAt: toIsoSafe(a.createdAt),
          updatedAt: toIsoSafe(a.updatedAt),
        })) as ClientApprovalRecord[],
        notifications: notifications.map((n) => ({
          ...n,
          createdAt: toIsoSafe(n.createdAt),
        })) as NotificationRecord[],
        leaves: leaves.map((l) => ({
          ...l,
          reviewedAt: toNullableIsoSafe(l.reviewedAt),
          createdAt: toIsoSafe(l.createdAt),
          updatedAt: toIsoSafe(l.updatedAt),
        })) as LeaveRecord[],
        sops: sops.map((s) => ({
          ...s,
          createdAt: toIsoSafe(s.createdAt),
          updatedAt: toIsoSafe(s.updatedAt),
        })) as SOPRecord[],
        reviews: reviews.map((r) => ({
          ...r,
          createdAt: toIsoSafe(r.createdAt),
          updatedAt: toIsoSafe(r.updatedAt),
        })) as PerformanceReviewRecord[],
        activities: activities.map((a) => ({
          ...a,
          createdAt: toIsoSafe(a.createdAt),
        })) as ActivityLogRecord[],
        chatMessages: chatMessages.map((m) => ({
          ...m,
          createdAt: toIsoSafe(m.createdAt),
          updatedAt: toIsoSafe(m.updatedAt),
        })) as ChatMessageRecord[],
        settings: settings
          ? {
              ...settings,
              updatedAt: toIsoSafe(settings.updatedAt),
            }
          : this.data.settings,
        scheduleOverrides: scheduleOverrides.map((o) => ({
          ...o,
          createdAt: toIsoSafe(o.createdAt),
          updatedAt: toIsoSafe(o.updatedAt),
        })) as EmployeeScheduleOverrideRecord[],
        pushSubscriptions: pushSubscriptions.map((ps) => ({
          ...ps,
          createdAt: toIsoSafe(ps.createdAt),
        })) as PushSubscriptionRecord[],
        accessRequests: (accessRequests || []).map((a: any) => ({
          ...a,
          reviewedAt: toNullableIsoSafe(a.reviewedAt),
          createdAt: toIsoSafe(a.createdAt),
          updatedAt: toIsoSafe(a.updatedAt),
        })) as AccessRequestRecord[],
        issuedCredentials: (issuedCredentials || []).map((c: any) => ({
          id: String(c.id),
          userId: String(c.userId),
          email: String(c.email),
          plaintextPassword: String(c.plaintextPassword),
          createdById: String(c.createdById),
          createdAt: toIsoSafe(c.createdAt),
        })) as IssuedCredentialRecord[],
        meetings: (meetings || []).map((m: any) => ({
          ...m,
          startTime: toIsoSafe(m.startTime),
          endTime: toIsoSafe(m.endTime),
          createdAt: toIsoSafe(m.createdAt),
          updatedAt: toIsoSafe(m.updatedAt),
        })) as MeetingRecord[],
        todos: (todos || []).map((t: any) => ({
          ...t,
          dueDate: toNullableIsoSafe(t.dueDate),
          createdAt: toIsoSafe(t.createdAt),
          updatedAt: toIsoSafe(t.updatedAt),
        })) as PersonalTodoRecord[],
        taskTimeLogs: this.data?.taskTimeLogs || [],
        eodReports: this.data?.eodReports || [],
        googleIntegration: googleInt
          ? ({
              ...googleInt,
              tokenExpiry: toNullableIsoSafe(googleInt.tokenExpiry),
              lastSyncAt: toNullableIsoSafe(googleInt.lastSyncAt),
              createdAt: toIsoSafe(googleInt.createdAt),
              updatedAt: toIsoSafe(googleInt.updatedAt),
            } as GoogleIntegrationRecord)
          : null,
      };

      this.recalculateAllProjectProgress();
      this.ensureClientAdmins();
    } catch (e) {
      console.warn('Prisma load skipped or table query failed:', e);
    }
  }

  private ensureClientAdmins() {
    for (const client of this.data.clients) {
      const clientUsers = this.data.users.filter(
        (u) => u.clientId === client.id || (u.role === 'CLIENT' && u.email.toLowerCase() === client.email.toLowerCase())
      );
      if (clientUsers.length > 0) {
        let hasAdmin = clientUsers.some((u) => u.role === 'CLIENT_ADMIN');
        for (let i = 0; i < clientUsers.length; i++) {
          const u = clientUsers[i];
          if (!u.clientId) {
            u.clientId = client.id;
            if (prisma && this.isPrismaActive) {
              prisma.user.update({ where: { id: u.id }, data: { clientId: client.id } }).catch(() => {});
            }
          }
          if (!hasAdmin && i === 0 && u.role === 'CLIENT') {
            u.role = 'CLIENT_ADMIN';
            hasAdmin = true;
            if (prisma && this.isPrismaActive) {
              prisma.user.update({ where: { id: u.id }, data: { role: 'CLIENT_ADMIN' } }).catch(() => {});
            }
          }
        }
      }
    }
  }

  private populateInMemory(seed: any) {
    const now = new Date().toISOString();
    this.data = {
      users: (seed.users || []) as UserRecord[],
      clients: (seed.clients || []) as ClientRecord[],
      projects: (seed.projects || []) as ProjectRecord[],
      projectMembers: (seed.projectMembers || []) as ProjectMemberRecord[],
      tasks: (seed.tasks || []) as TaskRecord[],
      comments: (seed.comments || []) as CommentRecord[],
      attendances: (seed.attendances || []) as AttendanceRecord[],
      breaks: (seed.breaks || []) as BreakRecord[],
      milestones: (seed.milestones || []) as MilestoneRecord[],
      approvals: (seed.approvals || []) as ClientApprovalRecord[],
      notifications: (seed.notifications || []) as NotificationRecord[],
      leaves: (seed.leaves || []).map((l: any) => ({
        ...l,
        createdAt: l.createdAt || now,
        updatedAt: l.updatedAt || now,
      })) as LeaveRecord[],
      sops: (seed.sops || []).map((s: any) => ({
        ...s,
        createdAt: s.createdAt || now,
        updatedAt: s.updatedAt || now,
      })) as SOPRecord[],
      reviews: (seed.reviews || []).map((r: any) => ({
        ...r,
        createdAt: r.createdAt || now,
        updatedAt: r.updatedAt || now,
      })) as PerformanceReviewRecord[],
      activities: (seed.activities || []).map((a: any) => ({
        ...a,
        createdAt: a.createdAt || now,
      })) as ActivityLogRecord[],
      chatMessages: (seed.chatMessages || []).map((m: any) => ({
        ...m,
        createdAt: m.createdAt || now,
        updatedAt: m.updatedAt || now,
      })) as ChatMessageRecord[],
      settings: seed.settings
        ? {
            ...seed.settings,
            updatedAt: seed.settings.updatedAt || now,
          }
        : this.data.settings,
      scheduleOverrides: (seed.scheduleOverrides || []).map((o: any) => ({
        ...o,
        createdAt: o.createdAt || now,
        updatedAt: o.updatedAt || now,
      })) as EmployeeScheduleOverrideRecord[],
      pushSubscriptions: [],
      accessRequests: [],
      issuedCredentials: [],
      meetings: [],
      googleIntegration: null,
      todos: (seed.todos || []) as PersonalTodoRecord[],
      taskTimeLogs: (seed.taskTimeLogs || []) as TaskTimeLogRecord[],
      eodReports: (seed.eodReports || []) as EodReportRecord[],
    };
    this.recalculateAllProjectProgress();
    this.ensureClientAdmins();
  }

  public async resetToSeed() {
    try {
      if (isPrismaConfigured && prisma && this.isPrismaActive) {
        await runSeed();
        await this.loadFromPrisma();
      } else {
        const seed = await getSeedData();
        this.populateInMemory(seed);
      }
    } catch (err) {
      console.warn('Direct Prisma seed error, seeding in-memory:', err);
      const seed = await getSeedData();
      this.populateInMemory(seed);
    }
  }

  // --- Dynamic Project Progress Calculation ---
  public recalculateProjectProgress(projectId: string) {
    const projectTasks = this.data.tasks.filter((t) => t.projectId === projectId);
    const project = this.data.projects.find((p) => p.id === projectId);
    if (!project) return;

    if (projectTasks.length === 0) {
      project.progress = 0;
      project.updatedAt = new Date().toISOString();
      if (prisma && this.isPrismaActive) {
        prisma.project
          .update({
            where: { id: projectId },
            data: { progress: 0 },
          })
          .catch(() => {});
      }
      return;
    }

    const totalProgress = projectTasks.reduce((sum, task) => {
      if (task.status === 'COMPLETED') return sum + 100;
      if (task.status === 'REVIEW') return sum + Math.max(task.progress, 75);
      if (task.status === 'IN_PROGRESS') return sum + Math.max(task.progress, 50);
      return sum + (task.progress || 0);
    }, 0);

    const allTasksCompleted = projectTasks.length > 0 && projectTasks.every((t) => t.status === 'COMPLETED');
    if (allTasksCompleted) {
      project.progress = 100;
      if (project.status !== 'COMPLETED') project.status = 'ACTIVE';
    } else {
      project.progress = Math.min(Math.round(totalProgress / projectTasks.length), 99);
      if (project.status === 'COMPLETED') {
        project.status = 'ACTIVE';
        project.handoverCompletedAt = null;
      }
    }
    project.updatedAt = new Date().toISOString();

    if (prisma && this.isPrismaActive) {
      prisma.project
        .update({
          where: { id: projectId },
          data: {
            progress: project.progress,
            status: project.status,
            handoverCompletedAt: project.handoverCompletedAt ? new Date(project.handoverCompletedAt) : null,
          },
        })
        .catch(() => {});
    }
  }

  public recalculateAllProjectProgress() {
    for (const project of this.data.projects) {
      this.recalculateProjectProgress(project.id);
    }
  }

  // --- USERS ---
  public getUsers() {
    return this.data.users;
  }

  public getUserById(id: string) {
    return this.data.users.find((u) => u.id === id);
  }

  public getUserByEmail(email: string) {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: Omit<UserRecord, 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const newUser: UserRecord = {
      ...user,
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.push(newUser);

    if (prisma && this.isPrismaActive) {
      prisma.user
        .create({
          data: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            passwordHash: newUser.passwordHash,
            role: newUser.role,
            profileImage: newUser.profileImage,
            clientId: newUser.clientId,
            mustChangePassword: newUser.mustChangePassword ?? false,
          },
        })
        .catch(() => {});
    }

    return newUser;
  }

  public updateUser(id: string, updates: Partial<Omit<UserRecord, 'id' | 'createdAt'>>) {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    this.data.users[index] = {
      ...this.data.users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (prisma && this.isPrismaActive) {
      prisma.user
        .update({
          where: { id },
          data: updates as any,
        })
        .catch(() => {});
    }

    return this.data.users[index];
  }

  public deleteUser(id: string) {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    this.data.users.splice(index, 1);
    this.data.projectMembers = this.data.projectMembers.filter((pm) => pm.userId !== id);
    this.data.issuedCredentials = this.data.issuedCredentials.filter((c) => c.userId !== id && c.createdById !== id);
    this.data.accessRequests = this.data.accessRequests.filter((a) => a.reviewedById !== id);

    if (prisma && this.isPrismaActive) {
      prisma.user
        .delete({ where: { id } })
        .catch(() => {});
    }

    return true;
  }

  public updateUserFcmToken(id: string, fcmToken: string | null) {
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return null;
    user.fcmToken = fcmToken;
    user.updatedAt = new Date().toISOString();

    if (prisma && this.isPrismaActive) {
      prisma.user
        .update({
          where: { id },
          data: { fcmToken },
        })
        .catch(() => {});
    }

    return user;
  }

  // --- CLIENTS ---
  public getClients() {
    return this.data.clients;
  }

  public getClientById(id: string) {
    return this.data.clients.find((c) => c.id === id);
  }

  public getClientByEmail(email: string) {
    return this.data.clients.find((c) => c.email.toLowerCase() === email.toLowerCase());
  }

  public createClient(client: Omit<ClientRecord, 'createdAt' | 'updatedAt'>) {
    const now = new Date().toISOString();
    const newClient: ClientRecord = {
      ...client,
      createdAt: now,
      updatedAt: now,
    };
    this.data.clients.push(newClient);

    if (prisma && this.isPrismaActive) {
      prisma.client
        .create({
          data: {
            id: newClient.id,
            name: newClient.name,
            company: newClient.company,
            email: newClient.email,
            phone: newClient.phone,
            address: newClient.address,
            driveFolderId: newClient.driveFolderId || null,
            driveFolderUrl: newClient.driveFolderUrl || null,
          },
        })
        .catch(() => {});
    }

    return newClient;
  }

  public updateClient(id: string, updates: Partial<Omit<ClientRecord, 'id' | 'createdAt'>>) {
    const index = this.data.clients.findIndex((c) => c.id === id);
    if (index === -1) return null;
    this.data.clients[index] = {
      ...this.data.clients[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (prisma && this.isPrismaActive) {
      prisma.client
        .update({
          where: { id },
          data: updates as any,
        })
        .catch(() => {});
    }

    return this.data.clients[index];
  }

  public deleteClient(id: string) {
    const index = this.data.clients.findIndex((c) => c.id === id);
    if (index === -1) return false;
    this.data.clients.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.client
        .delete({ where: { id } })
        .catch(() => {});
    }

    return true;
  }

  // --- PROJECTS ---
  public getProjects() {
    return this.data.projects;
  }

  public getProjectById(id: string) {
    return this.data.projects.find((p) => p.id === id);
  }

  public createProject(project: Omit<ProjectRecord, 'id' | 'createdAt' | 'updatedAt' | 'progress'> & { id?: string; progress?: number }) {
    const now = new Date().toISOString();
    const id = project.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newProject: ProjectRecord = {
      ...project,
      id,
      progress: project.progress || 0,
      createdAt: now,
      updatedAt: now,
    };
    this.data.projects.push(newProject);

    if (prisma && this.isPrismaActive) {
      prisma.project
        .create({
          data: {
            id: newProject.id,
            name: newProject.name,
            description: newProject.description,
            clientId: newProject.clientId,
            createdById: newProject.createdById,
            startDate: newProject.startDate ? new Date(newProject.startDate) : null,
            dueDate: newProject.dueDate ? new Date(newProject.dueDate) : null,
            status: newProject.status,
            priority: newProject.priority,
            progress: newProject.progress,
            estimatedBudget: newProject.estimatedBudget || null,
            leadOwnerId: newProject.leadOwnerId || null,
            preferredMeetingTime: newProject.preferredMeetingTime ? new Date(newProject.preferredMeetingTime) : null,
            meetingLink: newProject.meetingLink || null,
            calendarEventId: newProject.calendarEventId || null,
            driveFolderId: newProject.driveFolderId || null,
            handoverNote: newProject.handoverNote || null,
            driveUrl: newProject.driveUrl || null,
            handoverDocs: newProject.handoverDocs || null,
            handoverCompletedAt: newProject.handoverCompletedAt ? new Date(newProject.handoverCompletedAt) : null,
          },
        })
        .catch(() => {});
    }

    return newProject;
  }

  public getMeetingLink(): string {
    return this.data.settings?.meetingLink || 'https://meet.google.com/pnf-wfrm-qtm';
  }

  public updateProject(id: string, updates: Partial<Omit<ProjectRecord, 'id' | 'createdAt'>>) {
    const index = this.data.projects.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.data.projects[index] = {
      ...this.data.projects[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const prismaData: any = { ...updates };
    if (updates.startDate !== undefined) prismaData.startDate = updates.startDate ? new Date(updates.startDate) : null;
    if (updates.dueDate !== undefined) prismaData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    if (updates.handoverCompletedAt !== undefined) prismaData.handoverCompletedAt = updates.handoverCompletedAt ? new Date(updates.handoverCompletedAt) : null;

    if (prisma && this.isPrismaActive) {
      prisma.project
        .update({
          where: { id },
          data: prismaData,
        })
        .catch(() => {});
    }

    return this.data.projects[index];
  }

  public addHandoverDoc(projectId: string, doc: Omit<HandoverDocRecord, 'id' | 'uploadedAt'> & { id?: string }) {
    const project = this.getProjectById(projectId);
    if (!project) return null;

    let docs: HandoverDocRecord[] = [];
    if (project.handoverDocs) {
      try {
        docs = JSON.parse(project.handoverDocs);
      } catch (e) {
        docs = [];
      }
    }

    const newDoc: HandoverDocRecord = {
      ...doc,
      id: doc.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      uploadedAt: new Date().toISOString(),
    };

    docs.push(newDoc);
    this.updateProject(projectId, {
      handoverDocs: JSON.stringify(docs),
    });

    return newDoc;
  }

  public deleteHandoverDoc(projectId: string, docId: string) {
    const project = this.getProjectById(projectId);
    if (!project) return false;

    let docs: HandoverDocRecord[] = [];
    if (project.handoverDocs) {
      try {
        docs = JSON.parse(project.handoverDocs);
      } catch (e) {
        docs = [];
      }
    }

    const filtered = docs.filter((d) => d.id !== docId);
    if (filtered.length === docs.length) return false;

    this.updateProject(projectId, {
      handoverDocs: JSON.stringify(filtered),
    });

    return true;
  }

  public deleteProject(id: string) {
    const index = this.data.projects.findIndex((p) => p.id === id);
    if (index === -1) return false;
    this.data.projects.splice(index, 1);
    this.data.projectMembers = this.data.projectMembers.filter((pm) => pm.projectId !== id);
    this.data.tasks = this.data.tasks.filter((t) => t.projectId !== id);
    this.data.milestones = this.data.milestones.filter((m) => m.projectId !== id);
    this.data.approvals = this.data.approvals.filter((a) => a.projectId !== id);

    if (prisma && this.isPrismaActive) {
      prisma.project
        .delete({ where: { id } })
        .catch(() => {});
    }

    return true;
  }

  // --- PROJECT MEMBERS ---
  public getAllProjectMembers() {
    return this.data.projectMembers;
  }

  public getProjectMembers(projectId: string) {
    return this.data.projectMembers.filter((pm) => pm.projectId === projectId);
  }

  public getProjectMembersByUserId(userId: string) {
    return this.data.projectMembers.filter((pm) => pm.userId === userId);
  }

  public addProjectMember(projectId: string, userId: string): ProjectMemberRecord | null {
    const exists = this.data.projectMembers.some(
      (pm) => pm.projectId === projectId && pm.userId === userId
    );
    if (exists) return null;
    const newMember: ProjectMemberRecord = {
      id: `pm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      projectId,
      userId,
    };
    this.data.projectMembers.push(newMember);

    if (prisma && this.isPrismaActive) {
      prisma.projectMember
        .create({
          data: {
            id: newMember.id,
            projectId,
            userId,
          },
        })
        .catch(() => {});
    }

    return newMember;
  }

  public removeProjectMember(projectId: string, userId: string) {
    const index = this.data.projectMembers.findIndex(
      (pm) => pm.projectId === projectId && pm.userId === userId
    );
    if (index === -1) return false;
    this.data.projectMembers.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.projectMember
        .deleteMany({
          where: { projectId, userId },
        })
        .catch(() => {});
    }

    return true;
  }

  // --- TASKS ---
  public getTasks() {
    return this.data.tasks;
  }

  public getTaskById(id: string) {
    return this.data.tasks.find((t) => t.id === id);
  }

  public createTask(task: Omit<TaskRecord, 'createdAt' | 'updatedAt' | 'progress'> & { progress?: number }) {
    const now = new Date().toISOString();
    let initialProgress = task.progress ?? 0;
    if (task.status === 'COMPLETED') initialProgress = 100;
    else if (task.status === 'REVIEW' && initialProgress < 75) initialProgress = 75;
    else if (task.status === 'IN_PROGRESS' && initialProgress < 25) initialProgress = 25;

    const newTask: TaskRecord = {
      ...task,
      progress: initialProgress,
      clientApprovalStatus: task.clientApprovalStatus || 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
    this.data.tasks.push(newTask);
    this.recalculateProjectProgress(newTask.projectId);

    if (prisma && this.isPrismaActive) {
      prisma.task
        .create({
          data: {
            id: newTask.id,
            title: newTask.title,
            description: newTask.description,
            projectId: newTask.projectId,
            assignedToId: newTask.assignedToId,
            createdById: newTask.createdById,
            status: newTask.status,
            priority: newTask.priority,
            progress: newTask.progress,
            dueDate: newTask.dueDate ? new Date(newTask.dueDate) : null,
            submissionDescription: newTask.submissionDescription,
            proofDetails: newTask.proofDetails,
            deliverableUrl: newTask.deliverableUrl,
            driveFileId: newTask.driveFileId || null,
            driveFileName: newTask.driveFileName || null,
            driveFileSize: newTask.driveFileSize ?? null,
            driveFileMimeType: newTask.driveFileMimeType || null,
            submittedById: newTask.submittedById,
            submittedAt: newTask.submittedAt ? new Date(newTask.submittedAt) : null,
            clientApprovalStatus: newTask.clientApprovalStatus,
            clientReviewComments: newTask.clientReviewComments,
            reviewedById: newTask.reviewedById,
            reviewedAt: newTask.reviewedAt ? new Date(newTask.reviewedAt) : null,
          },
        })
        .catch(() => {});
    }

    if (newTask.assignedToId && newTask.assignedToId !== newTask.createdById) {
      this.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: newTask.assignedToId,
        title: 'New Task Assigned',
        message: `You have been assigned to task: "${newTask.title}"`,
        type: 'TASK_ASSIGNED',
        linkUrl: `/projects/${newTask.projectId}`,
        isRead: false,
      });
    }

    return newTask;
  }

  public updateTask(id: string, updates: Partial<Omit<TaskRecord, 'id' | 'createdAt'>>) {
    const index = this.data.tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const oldTask = this.data.tasks[index];

    let newProgress = updates.progress !== undefined ? updates.progress : oldTask.progress;
    if (updates.status) {
      if (updates.status === 'COMPLETED') newProgress = 100;
      else if (updates.status === 'REVIEW' && newProgress < 75) newProgress = 75;
      else if (updates.status === 'IN_PROGRESS' && newProgress === 0) newProgress = 25;
      else if (updates.status === 'TODO' && newProgress === 100) newProgress = 0;
      else if (updates.status === 'REVISION_REQUESTED') newProgress = Math.min(newProgress, 99);
    }

    // Clear revisionRequest when team member moves task back into active work
    if (updates.status && ['IN_PROGRESS', 'REVIEW', 'COMPLETED'].includes(updates.status) &&
        oldTask.status === 'REVISION_REQUESTED' && updates.revisionRequest === undefined) {
      updates.revisionRequest = null;
    }

    this.data.tasks[index] = {
      ...oldTask,
      ...updates,
      progress: newProgress,
      updatedAt: new Date().toISOString(),
    };

    const updatedTask = this.data.tasks[index];
    this.recalculateProjectProgress(updatedTask.projectId);

    const prismaData: any = { ...updates, progress: newProgress };
    if (updates.dueDate !== undefined) prismaData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;
    if (updates.submittedAt !== undefined) prismaData.submittedAt = updates.submittedAt ? new Date(updates.submittedAt) : null;
    if (updates.reviewedAt !== undefined) prismaData.reviewedAt = updates.reviewedAt ? new Date(updates.reviewedAt) : null;

    if (prisma && this.isPrismaActive) {
      prisma.task
        .update({
          where: { id },
          data: prismaData,
        })
        .catch(() => {});
    }

    if (updates.status && updates.status !== oldTask.status && updatedTask.createdById) {
      if (updatedTask.createdById !== updatedTask.assignedToId) {
        this.createNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: updatedTask.createdById,
          title: 'Task Status Updated',
          message: `Task "${updatedTask.title}" moved to ${updatedTask.status.replace('_', ' ')}`,
          type: 'TASK_STATUS',
          linkUrl: `/projects/${updatedTask.projectId}`,
          isRead: false,
        });
      }
    }

    return updatedTask;
  }

  public deleteTask(id: string) {
    const index = this.data.tasks.findIndex((t) => t.id === id);
    if (index === -1) return false;
    const projectId = this.data.tasks[index].projectId;
    this.data.tasks.splice(index, 1);
    this.data.comments = this.data.comments.filter((c) => c.taskId !== id);
    this.recalculateProjectProgress(projectId);

    if (prisma && this.isPrismaActive) {
      prisma.task
        .delete({ where: { id } })
        .catch(() => {});
    }

    return true;
  }

  public checkAndNotifyOverdueTasks(): number {
    const now = new Date();
    const tasks = this.data.tasks.filter((t) => {
      if (t.status === 'COMPLETED') return false;
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate);
      return !isNaN(due.getTime()) && due < now && !t.overdueNotifiedAt;
    });

    const admins = this.data.users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN');
    let count = 0;

    for (const t of tasks) {
      t.overdueNotifiedAt = now.toISOString();
      const assignee = t.assignedToId ? this.getUserById(t.assignedToId) : null;
      const dueStr = new Date(t.dueDate!).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      for (const admin of admins) {
        this.createNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: admin.id,
          title: '🚨 Task Deadline Missed / Overdue Alert',
          message: `Task "${t.title}" assigned to ${assignee?.name || 'Team Member'} has missed its deadline (${dueStr}) and is still incomplete.`,
          type: 'TASK_STATUS',
          linkUrl: '/tasks',
          isRead: false,
        });
      }
      count++;
    }

    return count;
  }

  public setTaskOverdueReason(taskId: string, userId: string, reason: string): TaskRecord | null {
    const task = this.getTaskById(taskId);
    if (!task) return null;

    const user = this.getUserById(userId);
    // Only assigned team member, creator, or admin can set delay reason
    if (task.assignedToId !== userId && task.createdById !== userId && user?.role === 'TEAM_MEMBER') {
      return null;
    }

    const now = new Date().toISOString();
    task.overdueReason = reason.trim();
    task.overdueReasonSubmittedAt = now;
    task.updatedAt = now;

    // Send notification to Admins
    const admins = this.data.users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN');
    for (const admin of admins) {
      this.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: admin.id,
        title: '📝 Delay Reason Submitted by Team Member',
        message: `${user?.name || 'Team Member'} submitted delay explanation for task "${task.title}": "${reason.trim()}"`,
        type: 'TASK_STATUS',
        linkUrl: '/tasks',
        isRead: false,
      });
    }

    return task;
  }

  // --- COMMENTS ---
  public getComments() {
    return this.data.comments;
  }

  public getCommentById(id: string) {
    return this.data.comments.find((c) => c.id === id);
  }

  public createComment(comment: Omit<CommentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const id = comment.id || `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newComment: CommentRecord = {
      ...comment,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.data.comments.push(newComment);

    if (prisma && this.isPrismaActive) {
      prisma.comment
        .create({
          data: {
            id: newComment.id,
            content: newComment.content,
            userId: newComment.userId,
            projectId: newComment.projectId,
            taskId: newComment.taskId,
          },
        })
        .catch(() => {});
    }

    return newComment;
  }

  public deleteComment(id: string) {
    const index = this.data.comments.findIndex((c) => c.id === id);
    if (index === -1) return false;
    this.data.comments.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.comment
        .delete({ where: { id } })
        .catch(() => {});
    }

    return true;
  }

  // --- ATTENDANCE & BREAKS ---
  public getBreaksForAttendance(attendanceId: string): BreakRecord[] {
    return this.data.breaks.filter((b) => b.attendanceId === attendanceId);
  }

  public getAttendanceWithDetails(attendance: AttendanceRecord): AttendanceWithDetails {
    const user = this.getUserById(attendance.userId);
    const breaks = this.getBreaksForAttendance(attendance.id);
    const activeBreak = breaks.find((b) => !b.endTime) || null;

    let liveWorkingMinutes = attendance.totalWorkingMinutes;
    let liveBreakMinutes = attendance.totalBreakMinutes;

    if (attendance.clockIn && !attendance.clockOut) {
      const now = new Date();
      const inTime = new Date(attendance.clockIn);
      const totalElapsed = Math.max(0, Math.floor((now.getTime() - inTime.getTime()) / 60000));

      if (activeBreak) {
        const breakStart = new Date(activeBreak.startTime);
        const ongoingBreakMins = Math.max(0, Math.floor((now.getTime() - breakStart.getTime()) / 60000));
        liveBreakMinutes += ongoingBreakMins;
      }
      liveWorkingMinutes = Math.max(0, totalElapsed - liveBreakMinutes);
    }

    const liveEffectiveMinutes = Math.max(0, liveWorkingMinutes);
    const isCurrentlyWorking = !!attendance.clockIn && !attendance.clockOut && !activeBreak;

    return {
      ...attendance,
      user: user ? { id: user.id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage, createdAt: user.createdAt, updatedAt: user.updatedAt } : undefined,
      breaks,
      activeBreak,
      isCurrentlyWorking,
      liveWorkingMinutes,
      liveBreakMinutes,
      liveEffectiveMinutes,
    };
  }

  public getAttendances(filters?: { userId?: string; date?: string; startDate?: string; endDate?: string; status?: AttendanceStatus }) {
    let result = [...this.data.attendances];
    if (!filters) return result.map((a) => this.getAttendanceWithDetails(a));

    if (filters.userId) result = result.filter((a) => a.userId === filters.userId);
    if (filters.date) result = result.filter((a) => a.date === filters.date);
    if (filters.startDate) result = result.filter((a) => a.date >= filters.startDate!);
    if (filters.endDate) result = result.filter((a) => a.date <= filters.endDate!);
    if (filters.status) result = result.filter((a) => a.status === filters.status);

    result.sort((a, b) => b.date.localeCompare(a.date));
    return result.map((a) => this.getAttendanceWithDetails(a));
  }

  public getAttendanceById(id: string): AttendanceWithDetails | null {
    const record = this.data.attendances.find((a) => a.id === id);
    if (!record) return null;
    return this.getAttendanceWithDetails(record);
  }

  public getTodayAttendance(userId: string, dateStr: string = getTodayDateString()): AttendanceWithDetails | null {
    const record = this.data.attendances.find((a) => a.userId === userId && a.date === dateStr);
    if (!record) return null;
    return this.getAttendanceWithDetails(record);
  }

  public clockIn(userId: string, customTimestamp?: string, clockInReason?: string): AttendanceWithDetails {
    const now = customTimestamp ? new Date(customTimestamp) : new Date();
    const today = getTodayDateString(now);

    let record = this.data.attendances.find((a) => a.userId === userId && a.date === today);
    const clockInTimeIso = now.toISOString();

    const settings = this.getSettings();
    const override = this.getScheduleOverrideByUserId(userId);
    const officeStart = override?.customStartTime || settings?.officeStartTime || '09:00';
    const graceMinutes = settings?.lateThresholdMinutes !== undefined ? settings.lateThresholdMinutes : 15;

    const [startH, startM] = officeStart.split(':').map((v) => parseInt(v, 10) || 0);
    const scheduledStartMins = startH * 60 + startM + graceMinutes;
    const actualClockInMins = now.getHours() * 60 + now.getMinutes();
    const isLate = actualClockInMins > scheduledStartMins;
    const initialStatus: AttendanceStatus = isLate ? 'LATE' : 'PRESENT';

    const cleanReason = (clockInReason || '').trim() || null;

    if (record) {
      if (!record.clockIn) {
        record.clockIn = clockInTimeIso;
        record.status = initialStatus;
        if (cleanReason) record.clockInReason = cleanReason;
        record.updatedAt = new Date().toISOString();

        if (prisma && this.isPrismaActive) {
          prisma.attendance
            .update({
              where: { id: record.id },
              data: {
                clockIn: new Date(clockInTimeIso),
                status: initialStatus,
              },
            })
            .catch(() => {});
        }
      }
    } else {
      const newAttendance: AttendanceRecord = {
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId,
        date: today,
        clockIn: clockInTimeIso,
        clockOut: null,
        clockInReason: cleanReason,
        status: initialStatus,
        totalWorkingMinutes: 0,
        totalBreakMinutes: 0,
        effectiveWorkingMinutes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.attendances.push(newAttendance);
      record = newAttendance;

      if (prisma && this.isPrismaActive) {
        prisma.attendance
          .create({
            data: {
              id: newAttendance.id,
              userId: newAttendance.userId,
              date: newAttendance.date,
              clockIn: new Date(clockInTimeIso),
              status: newAttendance.status,
              totalWorkingMinutes: 0,
              totalBreakMinutes: 0,
              effectiveWorkingMinutes: 0,
            },
          })
          .catch(() => {});
      }
    }

    return this.getAttendanceWithDetails(record);
  }

  public clockOut(userId: string, customTimestamp?: string, earlyClockOutReason?: string, clockOutReason?: string, tomorrowTask?: string): AttendanceWithDetails {
    const now = customTimestamp ? new Date(customTimestamp) : new Date();
    const today = getTodayDateString(now);

    const record = this.data.attendances.find((a) => a.userId === userId && a.date === today);
    if (!record) {
      throw new Error('No active attendance record found for today. Please clock in first.');
    }

    if (!record.clockIn) {
      throw new Error('Cannot clock out without clocking in first.');
    }

    const settings = this.getSettings();
    const override = this.getScheduleOverrideByUserId(userId);
    const officeEnd = override?.customEndTime || settings?.officeEndTime || '18:00';

    const [endH, endM] = officeEnd.split(':').map((v) => parseInt(v, 10) || 0);
    const scheduledEndMins = endH * 60 + endM;
    const actualClockOutMins = now.getHours() * 60 + now.getMinutes();
    const isEarly = actualClockOutMins < scheduledEndMins;

    const trimmedReason = (earlyClockOutReason || clockOutReason || '').trim();
    if (isEarly && !trimmedReason) {
      throw new Error('You are clocking out before your regular working time (6:00 PM). Please provide a reason.');
    }

    const finalReason = trimmedReason || null;
    const clockOutIso = now.toISOString();

    const activeBreak = this.data.breaks.find((b) => b.attendanceId === record.id && !b.endTime);
    if (activeBreak) {
      activeBreak.endTime = clockOutIso;
      const bStart = new Date(activeBreak.startTime).getTime();
      const bEnd = now.getTime();
      activeBreak.durationMinutes = Math.max(0, Math.floor((bEnd - bStart) / 60000));
      activeBreak.updatedAt = new Date().toISOString();

      if (prisma && this.isPrismaActive) {
        prisma.break
          .update({
            where: { id: activeBreak.id },
            data: {
              endTime: new Date(clockOutIso),
              durationMinutes: activeBreak.durationMinutes,
            },
          })
          .catch(() => {});
      }
    }

    const breaks = this.getBreaksForAttendance(record.id);
    const totalBreakMinutes = breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);

    const inTime = new Date(record.clockIn).getTime();
    const outTime = now.getTime();
    const totalWorkingMinutes = Math.max(0, Math.floor((outTime - inTime) / 60000) - totalBreakMinutes);
    const effectiveWorkingMinutes = totalWorkingMinutes;

    let status = record.status;
    if (totalWorkingMinutes < 240 && status !== 'ON_LEAVE') {
      status = 'HALF_DAY';
    }

    record.clockOut = clockOutIso;
    record.earlyClockOutReason = finalReason;
    record.clockOutReason = finalReason;
    record.totalBreakMinutes = totalBreakMinutes;
    record.totalWorkingMinutes = totalWorkingMinutes;
    record.effectiveWorkingMinutes = effectiveWorkingMinutes;
    record.status = status;
    record.updatedAt = new Date().toISOString();

    if (prisma && this.isPrismaActive) {
      prisma.attendance
        .update({
          where: { id: record.id },
          data: {
            clockOut: new Date(clockOutIso),
            earlyClockOutReason: finalReason,
            totalBreakMinutes,
            totalWorkingMinutes,
            effectiveWorkingMinutes,
            status,
          } as any,
        })
        .catch(() => {});
    }

    // Auto-create tomorrow's To-Do and send reminder notification if provided
    if (tomorrowTask && tomorrowTask.trim()) {
      try {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDateStr = getTodayDateString(tomorrow);
        this.createTodo({
          title: tomorrowTask.trim(),
          createdById: userId,
          assignedToId: userId,
          dueDate: tomorrowDateStr,
        });
        this.createNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId,
          title: '📋 Kal Ka Task Scheduled',
          message: `Kal ka ye task planned hai: "${tomorrowTask.trim()}". Stay prepared!`,
          type: 'TASK_ASSIGNED',
          isRead: false,
        });
      } catch (err: any) {
        console.warn('[TODO/NOTIFICATION] Failed to auto-schedule tomorrow task:', err?.message);
      }
    }

    return this.getAttendanceWithDetails(record);
  }

  public startBreak(userId: string, customTimestamp?: string): AttendanceWithDetails {
    const now = customTimestamp ? new Date(customTimestamp) : new Date();
    const today = getTodayDateString(now);

    const record = this.data.attendances.find((a) => a.userId === userId && a.date === today);
    if (!record || !record.clockIn || record.clockOut) {
      throw new Error('You must be clocked in and actively working to start a break.');
    }

    const activeBreak = this.data.breaks.find((b) => b.attendanceId === record.id && !b.endTime);
    if (activeBreak) {
      throw new Error('You already have an active break in progress.');
    }

    const newBreak: BreakRecord = {
      id: `brk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      attendanceId: record.id,
      startTime: now.toISOString(),
      endTime: null,
      durationMinutes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.breaks.push(newBreak);

    if (prisma && this.isPrismaActive) {
      prisma.break
        .create({
          data: {
            id: newBreak.id,
            attendanceId: newBreak.attendanceId,
            startTime: new Date(newBreak.startTime),
            durationMinutes: 0,
          },
        })
        .catch(() => {});
    }

    return this.getAttendanceWithDetails(record);
  }

  public endBreak(userId: string, customTimestamp?: string): AttendanceWithDetails {
    const now = customTimestamp ? new Date(customTimestamp) : new Date();
    const today = getTodayDateString(now);

    const record = this.data.attendances.find((a) => a.userId === userId && a.date === today);
    if (!record) {
      throw new Error('No attendance record found for today.');
    }

    const activeBreak = this.data.breaks.find((b) => b.attendanceId === record.id && !b.endTime);
    if (!activeBreak) {
      throw new Error('No active break found to end.');
    }

    const endIso = now.toISOString();
    activeBreak.endTime = endIso;
    const bStart = new Date(activeBreak.startTime).getTime();
    const bEnd = now.getTime();
    activeBreak.durationMinutes = Math.max(0, Math.floor((bEnd - bStart) / 60000));
    activeBreak.updatedAt = new Date().toISOString();

    const breaks = this.getBreaksForAttendance(record.id);
    record.totalBreakMinutes = breaks.reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
    record.updatedAt = new Date().toISOString();

    if (prisma && this.isPrismaActive) {
      prisma.break
        .update({
          where: { id: activeBreak.id },
          data: {
            endTime: new Date(endIso),
            durationMinutes: activeBreak.durationMinutes,
          },
        })
        .catch(() => {});

      prisma.attendance
        .update({
          where: { id: record.id },
          data: { totalBreakMinutes: record.totalBreakMinutes },
        })
        .catch(() => {});
    }

    return this.getAttendanceWithDetails(record);
  }

  public getAttendanceStats(dateStr: string = getTodayDateString()) {
    const teamMembers = this.data.users.filter((u) => u.role !== 'CLIENT');
    const totalTeamMembers = teamMembers.length;
    const records = this.data.attendances.filter((a) => a.date === dateStr);

    let presentToday = 0;
    let absentToday = 0;
    let currentlyWorking = 0;
    let onBreak = 0;
    let lateToday = 0;
    let halfDayToday = 0;
    let onLeaveToday = 0;
    let totalMinsWorked = 0;

    const attendedUserIds = new Set<string>();

    for (const r of records) {
      attendedUserIds.add(r.userId);
      const detailed = this.getAttendanceWithDetails(r);

      if (r.status === 'ON_LEAVE') {
        onLeaveToday++;
      } else {
        presentToday++;
      }

      if (r.status === 'LATE') lateToday++;
      if (r.status === 'HALF_DAY') halfDayToday++;

      if (detailed.isCurrentlyWorking) currentlyWorking++;
      if (detailed.activeBreak) onBreak++;

      totalMinsWorked += detailed.liveWorkingMinutes || r.totalWorkingMinutes || 0;
    }

    absentToday = Math.max(0, totalTeamMembers - attendedUserIds.size - onLeaveToday);

    const avgWorkingMinutes = presentToday > 0 ? Math.round(totalMinsWorked / presentToday) : 0;
    const avgWorkingHours = Number((avgWorkingMinutes / 60).toFixed(1));

    const statusBreakdown = {
      PRESENT: records.filter((r) => r.status === 'PRESENT').length,
      LATE: lateToday,
      HALF_DAY: halfDayToday,
      ON_LEAVE: onLeaveToday,
      ABSENT: absentToday,
    };

    const weeklyTrend: Array<{ date: string; day: string; present: number; absent: number; late: number }> = [];
    const baseDate = new Date(dateStr);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const ds = getTodayDateString(d);
      const dRecords = this.data.attendances.filter((a) => a.date === ds);
      const dAttended = new Set(dRecords.map((a) => a.userId));
      const dLeaves = dRecords.filter((a) => a.status === 'ON_LEAVE').length;
      const dPresents = dRecords.filter((a) => a.status !== 'ON_LEAVE').length;
      const dLates = dRecords.filter((a) => a.status === 'LATE').length;
      const dAbsents = Math.max(0, totalTeamMembers - dAttended.size - dLeaves);

      weeklyTrend.push({
        date: ds,
        day: dayNames[d.getDay()],
        present: dPresents,
        absent: dAbsents,
        late: dLates,
      });
    }

    return {
      today: dateStr,
      totalTeamMembers,
      presentToday,
      absentToday,
      currentlyWorking,
      onBreak,
      lateToday,
      halfDayToday,
      onLeaveToday,
      avgWorkingHours,
      avgWorkingMinutes,
      statusBreakdown,
      weeklyTrend,
    };
  }

  // --- TASK TIME LOGGING & DAILY ACTIVITY ---
  public logTaskTime(data: {
    taskId: string;
    userId: string;
    durationMinutes: number;
    notes?: string;
    date?: string;
  }): TaskTimeLogRecord {
    const task = this.getTaskById(data.taskId);
    const user = this.getUserById(data.userId);
    const project = task ? this.getProjectById(task.projectId) : null;
    const date = data.date || getTodayDateString();

    const record: TaskTimeLogRecord = {
      id: `ttl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      taskId: data.taskId,
      taskTitle: task?.title || 'Untitled Task',
      projectId: task?.projectId || '',
      projectName: project?.name || 'General Project',
      userId: data.userId,
      userName: user?.name || 'Team Member',
      date,
      durationMinutes: Math.max(1, Math.round(data.durationMinutes)),
      notes: data.notes || null,
      createdAt: new Date().toISOString(),
    };

    if (!this.data.taskTimeLogs) this.data.taskTimeLogs = [];
    this.data.taskTimeLogs.push(record);
    return record;
  }

  public getTaskTimeLogs(filters?: { userId?: string; date?: string; taskId?: string }): TaskTimeLogRecord[] {
    if (!this.data.taskTimeLogs) this.data.taskTimeLogs = [];
    let list = [...this.data.taskTimeLogs];
    if (filters?.userId) list = list.filter((l) => l.userId === filters.userId);
    if (filters?.date) list = list.filter((l) => l.date === filters.date);
    if (filters?.taskId) list = list.filter((l) => l.taskId === filters.taskId);
    return list;
  }

  public getDailyTaskSummary(userId: string, date: string = getTodayDateString()) {
    const user = this.getUserById(userId);
    const timeLogs = this.getTaskTimeLogs({ userId, date });
    const attendance = this.getTodayAttendance(userId, date);

    const allAssignedTasks = this.data.tasks.filter((t) => t.assignedToId === userId);
    const allAssignedTodos = (this.data.todos || []).filter((t) => t.assignedToId === userId || t.createdById === userId);

    const taskMap = new Map<string, any>();

    // Add logged tasks
    timeLogs.forEach((log) => {
      const existing = taskMap.get(log.taskId);
      if (existing) {
        existing.totalLoggedMinutes += log.durationMinutes;
      } else {
        const task = this.getTaskById(log.taskId);
        const item = {
          id: log.taskId,
          title: log.taskTitle,
          projectName: log.projectName,
          projectId: log.projectId,
          status: task?.status || 'IN_PROGRESS',
          priority: task?.priority || 'MEDIUM',
          totalLoggedMinutes: log.durationMinutes,
          isCompleted: task?.status === 'COMPLETED',
          type: 'TASK',
        };
        taskMap.set(log.taskId, item);
      }
    });

    // Add any tasks assigned to this user that are active or completed
    allAssignedTasks.forEach((t) => {
      if (!taskMap.has(t.id)) {
        const p = this.getProjectById(t.projectId);
        taskMap.set(t.id, {
          id: t.id,
          title: t.title,
          projectName: p?.name || 'Project',
          projectId: t.projectId,
          status: t.status,
          priority: t.priority,
          totalLoggedMinutes: 0,
          isCompleted: t.status === 'COMPLETED',
          type: 'TASK',
        });
      }
    });

    // Add todos
    allAssignedTodos.forEach((todo) => {
      taskMap.set(todo.id, {
        id: todo.id,
        title: todo.title,
        projectName: 'Personal Todo',
        projectId: undefined,
        status: todo.completed ? 'COMPLETED' : 'TODO',
        priority: 'MEDIUM',
        totalLoggedMinutes: 0,
        isCompleted: todo.completed,
        type: 'TODO',
      });
    });

    const tasksList = Array.from(taskMap.values());
    const totalLoggedTaskMinutes = timeLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
    const completedCount = tasksList.filter((t) => t.isCompleted).length;
    const inProgressCount = tasksList.filter((t) => !t.isCompleted).length;

    return {
      date,
      userId,
      userName: user?.name || 'Team Member',
      totalWorkingMinutes: attendance?.effectiveWorkingMinutes || attendance?.liveWorkingMinutes || 0,
      totalLoggedTaskMinutes,
      completedTasksCount: completedCount,
      inProgressTasksCount: inProgressCount,
      tasks: tasksList,
    };
  }

  // --- EOD REPORTS ---
  public submitEodReport(data: {
    userId: string;
    date?: string;
    summaryNote?: string;
    blockers?: string;
    completedTasks?: any[];
    inProgressTasks?: any[];
    tomorrowTask?: string;
  }): EodReportRecord {
    if (!this.data.eodReports) this.data.eodReports = [];
    const date = data.date || getTodayDateString();
    const user = this.getUserById(data.userId);
    const attendance = this.getTodayAttendance(data.userId, date);

    let completedTasks = data.completedTasks;
    let inProgressTasks = data.inProgressTasks;

    if (!completedTasks || !inProgressTasks) {
      const summary = this.getDailyTaskSummary(data.userId, date);
      if (!completedTasks) {
        completedTasks = summary.tasks
          .filter((t: any) => t.isCompleted)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            projectName: t.projectName,
            timeSpentMinutes: t.totalLoggedMinutes,
            status: t.status,
            type: t.type,
          }));
      }
      if (!inProgressTasks) {
        inProgressTasks = summary.tasks
          .filter((t: any) => !t.isCompleted)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            projectName: t.projectName,
            timeSpentMinutes: t.totalLoggedMinutes,
            status: t.status,
            type: t.type,
          }));
      }
    }

    const existingIndex = this.data.eodReports.findIndex((r) => r.userId === data.userId && r.date === date);
    const report: EodReportRecord = {
      id: existingIndex >= 0 ? this.data.eodReports[existingIndex].id : `eod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: data.userId,
      userName: user?.name || 'Team Member',
      userEmail: user?.email || '',
      date,
      totalWorkingMinutes: attendance?.effectiveWorkingMinutes || attendance?.liveWorkingMinutes || 0,
      totalBreakMinutes: attendance?.totalBreakMinutes || attendance?.liveBreakMinutes || 0,
      completedTasks: completedTasks || [],
      inProgressTasks: inProgressTasks || [],
      summaryNote: data.summaryNote || null,
      blockers: data.blockers || null,
      submittedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      this.data.eodReports[existingIndex] = report;
    } else {
      this.data.eodReports.push(report);
    }

    if (data.tomorrowTask && data.tomorrowTask.trim()) {
      try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowDateStr = getTodayDateString(tomorrow);
        this.createTodo({
          title: data.tomorrowTask.trim(),
          createdById: data.userId,
          assignedToId: data.userId,
          dueDate: tomorrowDateStr,
        });
        this.createNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: data.userId,
          title: '📋 Kal Ka Task Scheduled',
          message: `Kal ka ye task planned hai: "${data.tomorrowTask.trim()}". Stay prepared!`,
          type: 'TASK_ASSIGNED',
          isRead: false,
        });
      } catch (err: any) {
        console.warn('[TODO/NOTIFICATION] Failed to auto-schedule tomorrow task in EOD:', err?.message);
      }
    }

    return report;
  }

  public getEodReports(filters?: { userId?: string; date?: string; startDate?: string; endDate?: string }): (EodReportRecord & { user?: any })[] {
    if (!this.data.eodReports) this.data.eodReports = [];
    let list = [...this.data.eodReports];
    if (filters?.userId) list = list.filter((r) => r.userId === filters.userId);
    if (filters?.date) list = list.filter((r) => r.date === filters.date);
    if (filters?.startDate) list = list.filter((r) => r.date >= filters.startDate!);
    if (filters?.endDate) list = list.filter((r) => r.date <= filters.endDate!);

    list.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return list.map((r) => {
      const u = this.getUserById(r.userId);
      return {
        ...r,
        user: u ? { id: u.id, name: u.name, email: u.email, role: u.role, profileImage: u.profileImage } : undefined,
      };
    });
  }

  public getTodayEodReport(userId: string, date: string = getTodayDateString()): EodReportRecord | null {
    if (!this.data.eodReports) this.data.eodReports = [];
    return this.data.eodReports.find((r) => r.userId === userId && r.date === date) || null;
  }

  // --- MILESTONES ---
  public getMilestones() {
    return this.data.milestones;
  }

  public getMilestoneById(id: string) {
    return this.data.milestones.find((m) => m.id === id);
  }

  public getMilestonesByProjectId(projectId: string) {
    return this.data.milestones.filter((m) => m.projectId === projectId);
  }

  public createMilestone(milestone: Omit<MilestoneRecord, 'id' | 'createdAt' | 'updatedAt' | 'progress'> & { id?: string; progress?: number }) {
    const now = new Date().toISOString();
    const id = milestone.id || `mls_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMilestone: MilestoneRecord = {
      ...milestone,
      id,
      progress: milestone.progress || 0,
      createdAt: now,
      updatedAt: now,
    };
    this.data.milestones.push(newMilestone);

    if (prisma && this.isPrismaActive) {
      prisma.milestone
        .create({
          data: {
            id: newMilestone.id,
            name: newMilestone.name,
            description: newMilestone.description,
            projectId: newMilestone.projectId,
            dueDate: newMilestone.dueDate ? new Date(newMilestone.dueDate) : null,
            status: newMilestone.status,
            progress: newMilestone.progress,
          },
        })
        .catch(() => {});
    }

    return newMilestone;
  }

  public updateMilestone(id: string, updates: Partial<Omit<MilestoneRecord, 'id' | 'createdAt'>>) {
    const index = this.data.milestones.findIndex((m) => m.id === id);
    if (index === -1) return null;
    this.data.milestones[index] = {
      ...this.data.milestones[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const prismaData: any = { ...updates };
    if (updates.dueDate !== undefined) prismaData.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;

    if (prisma && this.isPrismaActive) {
      prisma.milestone
        .update({
          where: { id },
          data: prismaData,
        })
        .catch(() => {});
    }

    return this.data.milestones[index];
  }

  public deleteMilestone(id: string) {
    const index = this.data.milestones.findIndex((m) => m.id === id);
    if (index === -1) return false;
    this.data.milestones.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.milestone
        .delete({ where: { id } })
        .catch(() => {});
    }

    return true;
  }

  // --- APPROVALS ---
  public getApprovals() {
    return this.data.approvals;
  }

  public getApprovalById(id: string) {
    return this.data.approvals.find((a) => a.id === id);
  }

  public getApprovalsByProjectId(projectId: string) {
    return this.data.approvals.filter((a) => a.projectId === projectId);
  }

  public createApproval(approval: Omit<ClientApprovalRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const id = approval.id || `appr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newApproval: ClientApprovalRecord = {
      ...approval,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.data.approvals.push(newApproval);

    if (prisma && this.isPrismaActive) {
      prisma.clientApproval
        .create({
          data: {
            id: newApproval.id,
            title: newApproval.title,
            description: newApproval.description,
            projectId: newApproval.projectId,
            deliverableUrl: newApproval.deliverableUrl,
            status: newApproval.status,
            requestedById: newApproval.requestedById,
            reviewedById: newApproval.reviewedById,
            reviewedAt: newApproval.reviewedAt ? new Date(newApproval.reviewedAt) : null,
            comments: newApproval.comments,
          },
        })
        .catch(() => {});
    }

    const project = this.getProjectById(newApproval.projectId);
    if (project) {
      const client = this.getClientById(project.clientId);
      if (client) {
        const clientUser = this.getUserByEmail(client.email);
        if (clientUser) {
          this.createNotification({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: clientUser.id,
            title: 'Approval Requested',
            message: `New approval requested for project "${project.name}": "${newApproval.title}"`,
            type: 'APPROVAL_REQUESTED',
            linkUrl: `/projects/${project.id}`,
            isRead: false,
          });
        }
      }
    }

    return newApproval;
  }

  public updateApproval(id: string, updates: Partial<Omit<ClientApprovalRecord, 'id' | 'createdAt'>>) {
    const index = this.data.approvals.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const old = this.data.approvals[index];

    this.data.approvals[index] = {
      ...old,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const updated = this.data.approvals[index];
    const prismaData: any = { ...updates };
    if (updates.reviewedAt !== undefined) prismaData.reviewedAt = updates.reviewedAt ? new Date(updates.reviewedAt) : null;

    if (prisma && this.isPrismaActive) {
      prisma.clientApproval
        .update({
          where: { id },
          data: prismaData,
        })
        .catch(() => {});
    }

    if (updates.status && updates.status !== old.status && updated.requestedById) {
      this.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: updated.requestedById,
        title: `Approval ${updated.status === 'APPROVED' ? 'Granted' : 'Rejected'}`,
        message: `Approval request "${updated.title}" has been ${updated.status.toLowerCase()}`,
        type: 'APPROVAL_RESOLVED',
        linkUrl: `/projects/${updated.projectId}`,
        isRead: false,
      });
    }

    return updated;
  }

  public deleteApproval(id: string) {
    const index = this.data.approvals.findIndex((a) => a.id === id);
    if (index === -1) return false;
    this.data.approvals.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.clientApproval
        .delete({ where: { id } })
        .catch(() => {});
    }

    return true;
  }

  // --- NOTIFICATIONS ---
  public getNotifications() {
    return this.data.notifications;
  }

  public getNotificationsByUserId(userId: string) {
    return this.data.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public createNotification(notif: Omit<NotificationRecord, 'createdAt'>) {
    const newNotif: NotificationRecord = {
      ...notif,
      createdAt: new Date().toISOString(),
    };
    this.data.notifications.push(newNotif);

    if (prisma && this.isPrismaActive) {
      const allowedPrismaTypes = [
        'TASK_ASSIGNED',
        'TASK_STATUS',
        'PROJECT_ASSIGNED',
        'MILESTONE_DUE',
        'APPROVAL_REQUESTED',
        'APPROVAL_RESOLVED',
        'ATTENDANCE_ALERT',
        'LEAVE_REQUESTED',
        'LEAVE_RESOLVED',
        'PERFORMANCE_REVIEW',
        'CHAT_MENTION',
        'GENERAL',
      ];
      const prismaType = allowedPrismaTypes.includes(newNotif.type) ? newNotif.type : 'GENERAL';

      prisma.notification
        .create({
          data: {
            id: newNotif.id,
            userId: newNotif.userId,
            title: newNotif.title,
            message: newNotif.message,
            type: prismaType as any,
            linkUrl: newNotif.linkUrl || null,
            isRead: Boolean(newNotif.isRead),
          },
        })
        .catch((e) => {
          // If custom enum failed against remote database enum constraint, retry with fallback GENERAL
          if (prisma && this.isPrismaActive && prismaType !== 'GENERAL') {
            prisma.notification
              .create({
                data: {
                  id: newNotif.id,
                  userId: newNotif.userId,
                  title: newNotif.title,
                  message: newNotif.message,
                  type: 'GENERAL' as any,
                  linkUrl: newNotif.linkUrl || null,
                  isRead: Boolean(newNotif.isRead),
                },
              })
              .catch(() => {});
          }
        });
    }

    // Dispatch FCM push notification to recipient's device if token is registered
    const recipient = this.getUserById(newNotif.userId);
    if (recipient && recipient.fcmToken) {
      sendFcmPushNotification(recipient.fcmToken, {
        title: newNotif.title,
        body: newNotif.message,
        linkUrl: newNotif.linkUrl || '/',
        data: {
          notificationId: newNotif.id,
          type: newNotif.type,
          linkUrl: newNotif.linkUrl || '/',
        },
      })
        .then((result) => {
          if (!result.success) {
            console.warn(`[FCM Notification] Push failed for user ${recipient.id}: ${result.error}`);
            if (result.isInvalidToken) {
              console.info(`[FCM Notification] Invalid/expired token detected for user ${recipient.id}. Removing from record.`);
              this.updateUserFcmToken(recipient.id, null);
            }
          }
        })
        .catch((err) => {
          console.error('[FCM Notification] Unexpected error sending push notification:', err);
        });
    }

    return newNotif;
  }

  public markNotificationRead(id: string, userId: string) {
    const notif = this.data.notifications.find((n) => n.id === id && n.userId === userId);
    if (!notif) return null;
    notif.isRead = true;

    if (prisma && this.isPrismaActive) {
      prisma.notification
        .update({
          where: { id },
          data: { isRead: true },
        })
        .catch(() => {});
    }

    return notif;
  }

  public markAllNotificationsRead(userId: string): { updatedCount: number } {
    let updatedCount = 0;
    for (const notif of this.data.notifications) {
      if (notif.userId === userId && !notif.isRead) {
        notif.isRead = true;
        updatedCount++;
      }
    }

    if (prisma && this.isPrismaActive) {
      prisma.notification
        .updateMany({
          where: { userId, isRead: false },
          data: { isRead: true },
        })
        .catch(() => {});
    }

    return { updatedCount };
  }

  public deleteNotification(id: string, userId: string) {
    const index = this.data.notifications.findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) return false;
    this.data.notifications.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.notification
        .delete({ where: { id } })
        .catch(() => {});
    }

    return true;
  }

  // --- WORKLOAD & ANALYTICS ---
  public getTeamMemberWorkload(userId: string) {
    const user = this.getUserById(userId);
    if (!user) return null;

    const assignedTasks = this.data.tasks.filter((t) => t.assignedToId === userId);
    const activeTasks = assignedTasks.filter((t) => t.status !== 'COMPLETED');
    const completedTasks = assignedTasks.filter((t) => t.status === 'COMPLETED');

    const assignedProjectIds = new Set(this.data.projectMembers.filter((pm) => pm.userId === userId).map((pm) => pm.projectId));
    assignedTasks.forEach((t) => assignedProjectIds.add(t.projectId));

    const totalTasksCount = assignedTasks.length;
    const activeTasksCount = activeTasks.length;
    const completedTasksCount = completedTasks.length;

    let workloadLevel: 'LOW' | 'OPTIMAL' | 'HIGH' | 'OVERLOADED' = 'OPTIMAL';
    if (activeTasksCount === 0) workloadLevel = 'LOW';
    else if (activeTasksCount <= 3) workloadLevel = 'OPTIMAL';
    else if (activeTasksCount <= 6) workloadLevel = 'HIGH';
    else workloadLevel = 'OVERLOADED';

    const todayAttendance = this.getTodayAttendance(userId);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage,
      },
      assignedProjectCount: assignedProjectIds.size,
      totalTasksCount,
      activeTasksCount,
      completedTasksCount,
      workloadLevel,
      todayAttendanceStatus: todayAttendance?.status || 'ABSENT',
      isCurrentlyWorking: todayAttendance?.isCurrentlyWorking || false,
      isOnBreak: !!todayAttendance?.activeBreak,
    };
  }

  public getAllTeamMembersWorkload() {
    const teamMembers = this.data.users.filter((u) => u.role !== 'CLIENT');
    return teamMembers.map((u) => this.getTeamMemberWorkload(u.id)!);
  }

  public getReportsOverview(callerUser?: { id: string; role: Role }) {
    let projects = this.data.projects;
    let tasks = this.data.tasks;
    let milestones = this.data.milestones;
    let approvals = this.data.approvals;

    if (callerUser && callerUser.role === 'CLIENT') {
      const client = this.data.clients.find((c) => c.email === this.getUserById(callerUser.id)?.email);
      if (client) {
        const clientProjectIds = projects.filter((p) => p.clientId === client.id).map((p) => p.id);
        projects = projects.filter((p) => clientProjectIds.includes(p.id));
        tasks = tasks.filter((t) => clientProjectIds.includes(t.projectId));
        milestones = milestones.filter((m) => clientProjectIds.includes(m.projectId));
        approvals = approvals.filter((a) => clientProjectIds.includes(a.projectId));
      }
    }

    const totalProjects = projects.length;
    const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length;
    const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
    const onHoldProjects = projects.filter((p) => p.status === 'ON_HOLD').length;
    const planningProjects = projects.filter((p) => p.status === 'PLANNING').length;
    const totalProgress = projects.reduce((sum, p) => sum + p.progress, 0);
    const averageProgress = totalProjects > 0 ? Math.round(totalProgress / totalProjects) : 0;

    const projectPriorityCounts: Record<ProjectPriority, number> = {
      LOW: projects.filter((p) => p.priority === 'LOW').length,
      MEDIUM: projects.filter((p) => p.priority === 'MEDIUM').length,
      HIGH: projects.filter((p) => p.priority === 'HIGH').length,
      URGENT: projects.filter((p) => p.priority === 'URGENT').length,
    };

    const totalTasks = tasks.length;
    const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const reviewTasks = tasks.filter((t) => t.status === 'REVIEW').length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate).getTime() < Date.now()
    ).length;

    const taskPriorityCounts: Record<TaskPriority, number> = {
      LOW: tasks.filter((t) => t.priority === 'LOW').length,
      MEDIUM: tasks.filter((t) => t.priority === 'MEDIUM').length,
      HIGH: tasks.filter((t) => t.priority === 'HIGH').length,
      URGENT: tasks.filter((t) => t.priority === 'URGENT').length,
    };

    const totalMilestones = milestones.length;
    const pendingMilestones = milestones.filter((m) => m.status === 'PENDING').length;
    const inProgressMilestones = milestones.filter((m) => m.status === 'IN_PROGRESS').length;
    const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED').length;
    const overdueMilestones = milestones.filter((m) => m.status === 'OVERDUE').length;
    const milestoneCompletionRate =
      totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    const totalApprovals = approvals.length;
    const pendingApprovals = approvals.filter((a) => a.status === 'PENDING').length;
    const approvedApprovals = approvals.filter((a) => a.status === 'APPROVED').length;
    const rejectedApprovals = approvals.filter((a) => a.status === 'REJECTED').length;

    const attendanceSummary = this.getAttendanceStats();
    const teamWorkload = this.getAllTeamMembersWorkload();

    return {
      projectMetrics: {
        total: totalProjects,
        active: activeProjects,
        completed: completedProjects,
        onHold: onHoldProjects,
        planning: planningProjects,
        averageProgress,
        byPriority: projectPriorityCounts,
      },
      taskMetrics: {
        total: totalTasks,
        todo: todoTasks,
        inProgress: inProgressTasks,
        review: reviewTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        completionRate,
        byPriority: taskPriorityCounts,
      },
      milestoneMetrics: {
        total: totalMilestones,
        pending: pendingMilestones,
        inProgress: inProgressMilestones,
        completed: completedMilestones,
        overdue: overdueMilestones,
        completionRate: milestoneCompletionRate,
      },
      approvalMetrics: {
        total: totalApprovals,
        pending: pendingApprovals,
        approved: approvedApprovals,
        rejected: rejectedApprovals,
      },
      attendanceSummary,
      teamWorkload,
      projects: {
        total: totalProjects,
        active: activeProjects,
        inProgress: activeProjects,
        completed: completedProjects,
        onHold: onHoldProjects,
        planning: planningProjects,
        averageProgress,
      },
      tasks: {
        total: totalTasks,
        todo: todoTasks,
        inProgress: inProgressTasks,
        review: reviewTasks,
        completed: completedTasks,
        overdue: overdueTasks,
      },
      milestones: {
        total: totalMilestones,
        pending: pendingMilestones,
        inProgress: inProgressMilestones,
        completed: completedMilestones,
        overdue: overdueMilestones,
      },
      approvals: {
        total: totalApprovals,
        pending: pendingApprovals,
        approved: approvedApprovals,
        rejected: rejectedApprovals,
      },
      attendance: {
        presentToday: attendanceSummary?.presentToday || 0,
        activeOnBreak: attendanceSummary?.onBreak || 0,
        avgWorkingHours: attendanceSummary?.avgWorkingHours || 0,
        totalTrackedHours: Math.round(
          this.data.attendances.reduce((sum, a) => sum + (a.effectiveWorkingMinutes || 0), 0) / 60
        ),
      },
    };
  }

  // --- LEAVES MANAGEMENT ---
  public getLeaves(filters?: { userId?: string; status?: LeaveStatus }) {
    let result = [...this.data.leaves];
    if (filters?.userId) result = result.filter((l) => l.userId === filters.userId);
    if (filters?.status) result = result.filter((l) => l.status === filters.status);

    return result
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((l) => {
        const user = this.getUserById(l.userId);
        const approvedBy = l.approvedById ? this.getUserById(l.approvedById) : null;
        return {
          ...l,
          user: user ? { id: user.id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage, createdAt: user.createdAt, updatedAt: user.updatedAt } : undefined,
          approvedBy: approvedBy ? { id: approvedBy.id, name: approvedBy.name, email: approvedBy.email, role: approvedBy.role, profileImage: approvedBy.profileImage, createdAt: approvedBy.createdAt, updatedAt: approvedBy.updatedAt } : null,
        };
      });
  }

  public getLeaveById(id: string) {
    const leave = this.data.leaves.find((l) => l.id === id);
    if (!leave) return null;
    const user = this.getUserById(leave.userId);
    const approvedBy = leave.approvedById ? this.getUserById(leave.approvedById) : null;
    return {
      ...leave,
      user: user ? { id: user.id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage, createdAt: user.createdAt, updatedAt: user.updatedAt } : undefined,
      approvedBy: approvedBy ? { id: approvedBy.id, name: approvedBy.name, email: approvedBy.email, role: approvedBy.role, profileImage: approvedBy.profileImage, createdAt: approvedBy.createdAt, updatedAt: approvedBy.updatedAt } : null,
    };
  }

  public createLeave(leave: Omit<LeaveRecord, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'approvedById' | 'rejectionReason' | 'reviewedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const newLeave: LeaveRecord = {
      ...leave,
      id: leave.id || `lv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'PENDING',
      approvedById: null,
      rejectionReason: null,
      reviewedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.data.leaves.push(newLeave);

    if (prisma && this.isPrismaActive) {
      prisma.leaveRequest
        .create({
          data: {
            id: newLeave.id,
            userId: newLeave.userId,
            leaveType: newLeave.leaveType,
            startDate: newLeave.startDate,
            endDate: newLeave.endDate,
            totalDays: newLeave.totalDays,
            reason: newLeave.reason,
            isBackdated: newLeave.isBackdated,
            status: newLeave.status,
          },
        })
        .catch((e) => console.warn('Prisma createLeave failed:', e.message));
    }

    // Notify Admins
    const admins = this.data.users.filter((u) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN');
    const applicant = this.getUserById(newLeave.userId);
    for (const admin of admins) {
      this.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: admin.id,
        title: 'New Leave Request',
        message: `${applicant?.name || 'An employee'} submitted a ${newLeave.leaveType} leave request for ${newLeave.totalDays} day(s).`,
        type: 'LEAVE_REQUESTED',
        linkUrl: '/leaves',
        isRead: false,
      });
    }

    this.logActivity({
      userId: newLeave.userId,
      action: 'LEAVE_APPLIED',
      entityType: 'LEAVE',
      entityId: newLeave.id,
      details: `${applicant?.name || 'Employee'} applied for ${newLeave.leaveType} leave from ${newLeave.startDate} to ${newLeave.endDate}`,
    });

    return this.getLeaveById(newLeave.id);
  }

  public approveLeave(id: string, approvedById: string) {
    const index = this.data.leaves.findIndex((l) => l.id === id);
    if (index === -1) return null;
    const leave = this.data.leaves[index];
    const now = new Date().toISOString();

    leave.status = 'APPROVED';
    leave.approvedById = approvedById;
    leave.reviewedAt = now;
    leave.rejectionReason = null;
    leave.updatedAt = now;

    if (prisma && this.isPrismaActive) {
      prisma.leaveRequest
        .update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedById,
            reviewedAt: new Date(now),
            rejectionReason: null,
          },
        })
        .catch((e) => console.warn('Prisma approveLeave failed:', e.message));
    }

    // Sync Attendance: Mark all dates in range as ON_LEAVE
    try {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const cur = new Date(start);

      while (cur <= end) {
        const dateStr = getTodayDateString(cur);
        let att = this.data.attendances.find((a) => a.userId === leave.userId && a.date === dateStr);
        if (att) {
          att.status = 'ON_LEAVE';
          att.updatedAt = now;
          if (prisma && this.isPrismaActive) {
            prisma.attendance.update({ where: { id: att.id }, data: { status: 'ON_LEAVE' } }).catch(() => {});
          }
        } else {
          const newAtt: AttendanceRecord = {
            id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: leave.userId,
            date: dateStr,
            clockIn: null,
            clockOut: null,
            status: 'ON_LEAVE',
            totalWorkingMinutes: 0,
            totalBreakMinutes: 0,
            effectiveWorkingMinutes: 0,
            createdAt: now,
            updatedAt: now,
          };
          this.data.attendances.push(newAtt);
          if (prisma && this.isPrismaActive) {
            prisma.attendance.create({ data: newAtt as any }).catch(() => {});
          }
        }
        cur.setDate(cur.getDate() + 1);
      }
    } catch (e) {
      console.warn('Error syncing attendance for approved leave:', e);
    }

    // Notify employee
    this.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: leave.userId,
      title: 'Leave Request Approved',
      message: `Your ${leave.leaveType} leave request from ${leave.startDate} to ${leave.endDate} was approved.`,
      type: 'LEAVE_RESOLVED',
      linkUrl: '/leaves',
      isRead: false,
    });

    const approver = this.getUserById(approvedById);
    const applicant = this.getUserById(leave.userId);
    this.logActivity({
      userId: approvedById,
      action: 'LEAVE_APPROVED',
      entityType: 'LEAVE',
      entityId: leave.id,
      details: `${approver?.name || 'Admin'} approved leave request for ${applicant?.name || 'employee'}`,
    });

    return this.getLeaveById(id);
  }

  public rejectLeave(id: string, reviewerId: string, rejectionReason: string) {
    const index = this.data.leaves.findIndex((l) => l.id === id);
    if (index === -1) return null;
    const leave = this.data.leaves[index];
    const now = new Date().toISOString();

    leave.status = 'REJECTED';
    leave.approvedById = reviewerId;
    leave.reviewedAt = now;
    leave.rejectionReason = rejectionReason || 'Leave request declined by management.';
    leave.updatedAt = now;

    if (prisma && this.isPrismaActive) {
      prisma.leaveRequest
        .update({
          where: { id },
          data: {
            status: 'REJECTED',
            approvedById: reviewerId,
            reviewedAt: new Date(now),
            rejectionReason: leave.rejectionReason,
          },
        })
        .catch((e) => console.warn('Prisma rejectLeave failed:', e.message));
    }

    // Notify employee
    this.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: leave.userId,
      title: 'Leave Request Rejected',
      message: `Your ${leave.leaveType} leave request was rejected: "${leave.rejectionReason}"`,
      type: 'LEAVE_RESOLVED',
      linkUrl: '/leaves',
      isRead: false,
    });

    const reviewer = this.getUserById(reviewerId);
    const applicant = this.getUserById(leave.userId);
    this.logActivity({
      userId: reviewerId,
      action: 'LEAVE_REJECTED',
      entityType: 'LEAVE',
      entityId: leave.id,
      details: `${reviewer?.name || 'Admin'} rejected leave request for ${applicant?.name || 'employee'}. Reason: ${leave.rejectionReason}`,
    });

    return this.getLeaveById(id);
  }

  public deleteLeave(id: string) {
    const index = this.data.leaves.findIndex((l) => l.id === id);
    if (index === -1) return false;
    this.data.leaves.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.leaveRequest.delete({ where: { id } }).catch(() => {});
    }
    return true;
  }

  // --- SOP DOCUMENTS ---
  public getSOPs(filters?: { category?: string; search?: string }) {
    let result = [...this.data.sops];
    if (filters?.category && filters.category !== 'All') {
      result = result.filter((s) => s.category.toLowerCase() === filters.category!.toLowerCase());
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.content.toLowerCase().includes(q) ||
          (s.tags && s.tags.toLowerCase().includes(q))
      );
    }
    return result
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((s) => ({
        ...s,
        createdBy: this.getUserById(s.createdById) ? {
          id: s.createdById,
          name: this.getUserById(s.createdById)!.name,
          email: this.getUserById(s.createdById)!.email,
          role: this.getUserById(s.createdById)!.role,
        } : undefined,
      }));
  }

  public getSOPById(id: string) {
    const sop = this.data.sops.find((s) => s.id === id);
    if (!sop) return null;
    return {
      ...sop,
      createdBy: this.getUserById(sop.createdById) ? {
        id: sop.createdById,
        name: this.getUserById(sop.createdById)!.name,
        email: this.getUserById(sop.createdById)!.email,
        role: this.getUserById(sop.createdById)!.role,
      } : undefined,
    };
  }

  public createSOP(sop: Omit<SOPRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const newSOP: SOPRecord = {
      ...sop,
      id: sop.id || `sop_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.sops.push(newSOP);

    if (prisma && this.isPrismaActive) {
      prisma.sOPDocument.create({ data: newSOP as any }).catch(() => {});
    }

    this.logActivity({
      userId: newSOP.createdById,
      action: 'SOP_CREATED',
      entityType: 'SOP',
      entityId: newSOP.id,
      details: `Created new SOP "${newSOP.title}" in category ${newSOP.category}`,
    });

    return this.getSOPById(newSOP.id);
  }

  public updateSOP(id: string, updates: Partial<Omit<SOPRecord, 'id' | 'createdAt' | 'createdById'>>, userId?: string) {
    const index = this.data.sops.findIndex((s) => s.id === id);
    if (index === -1) return null;
    const now = new Date().toISOString();
    this.data.sops[index] = {
      ...this.data.sops[index],
      ...updates,
      updatedAt: now,
    };

    if (prisma && this.isPrismaActive) {
      prisma.sOPDocument.update({ where: { id }, data: { ...updates, updatedAt: new Date(now) } as any }).catch(() => {});
    }

    if (userId) {
      this.logActivity({
        userId,
        action: 'SOP_UPDATED',
        entityType: 'SOP',
        entityId: id,
        details: `Updated SOP "${this.data.sops[index].title}"`,
      });
    }

    return this.getSOPById(id);
  }

  public deleteSOP(id: string, userId?: string) {
    const index = this.data.sops.findIndex((s) => s.id === id);
    if (index === -1) return false;
    const sop = this.data.sops[index];
    this.data.sops.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.sOPDocument.delete({ where: { id } }).catch(() => {});
    }

    if (userId) {
      this.logActivity({
        userId,
        action: 'SOP_DELETED',
        entityType: 'SOP',
        entityId: id,
        details: `Deleted SOP "${sop.title}"`,
      });
    }
    return true;
  }

  // --- PERFORMANCE REVIEWS ---
  public getPerformanceReviews(filters?: { employeeId?: string; reviewerId?: string }) {
    let result = [...this.data.reviews];
    if (filters?.employeeId) result = result.filter((r) => r.employeeId === filters.employeeId);
    if (filters?.reviewerId) result = result.filter((r) => r.reviewerId === filters.reviewerId);

    return result
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((r) => {
        const employee = this.getUserById(r.employeeId);
        const reviewer = this.getUserById(r.reviewerId);
        return {
          ...r,
          employee: employee ? { id: employee.id, name: employee.name, email: employee.email, role: employee.role } : undefined,
          reviewer: reviewer ? { id: reviewer.id, name: reviewer.name, email: reviewer.email, role: reviewer.role } : undefined,
        };
      });
  }

  public getPerformanceReviewById(id: string) {
    const rev = this.data.reviews.find((r) => r.id === id);
    if (!rev) return null;
    const employee = this.getUserById(rev.employeeId);
    const reviewer = this.getUserById(rev.reviewerId);
    return {
      ...rev,
      employee: employee ? { id: employee.id, name: employee.name, email: employee.email, role: employee.role } : undefined,
      reviewer: reviewer ? { id: reviewer.id, name: reviewer.name, email: reviewer.email, role: reviewer.role } : undefined,
    };
  }

  public createPerformanceReview(review: Omit<PerformanceReviewRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const newRev: PerformanceReviewRecord = {
      ...review,
      id: review.id || `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.reviews.push(newRev);

    if (prisma && this.isPrismaActive) {
      prisma.performanceReview.create({ data: newRev as any }).catch(() => {});
    }

    // Notify employee
    this.createNotification({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: newRev.employeeId,
      title: 'Performance Review Published',
      message: `Your performance review for period ${newRev.reviewPeriod} is available to view.`,
      type: 'PERFORMANCE_REVIEW',
      linkUrl: '/reviews',
      isRead: false,
    });

    this.logActivity({
      userId: newRev.reviewerId,
      action: 'REVIEW_PUBLISHED',
      entityType: 'REVIEW',
      entityId: newRev.id,
      details: `Published performance review for employee ID: ${newRev.employeeId} (${newRev.reviewPeriod})`,
    });

    return this.getPerformanceReviewById(newRev.id);
  }

  public updatePerformanceReview(id: string, updates: Partial<Omit<PerformanceReviewRecord, 'id' | 'createdAt'>>) {
    const index = this.data.reviews.findIndex((r) => r.id === id);
    if (index === -1) return null;
    const now = new Date().toISOString();
    this.data.reviews[index] = {
      ...this.data.reviews[index],
      ...updates,
      updatedAt: now,
    };

    if (prisma && this.isPrismaActive) {
      prisma.performanceReview.update({ where: { id }, data: { ...updates, updatedAt: new Date(now) } as any }).catch(() => {});
    }

    return this.getPerformanceReviewById(id);
  }

  public acknowledgePerformanceReview(id: string, employeeId: string) {
    const index = this.data.reviews.findIndex((r) => r.id === id && r.employeeId === employeeId);
    if (index === -1) return null;
    const now = new Date().toISOString();
    this.data.reviews[index].status = 'ACKNOWLEDGED';
    this.data.reviews[index].updatedAt = now;

    if (prisma && this.isPrismaActive) {
      prisma.performanceReview.update({ where: { id }, data: { status: 'ACKNOWLEDGED', updatedAt: new Date(now) } as any }).catch(() => {});
    }

    this.logActivity({
      userId: employeeId,
      action: 'REVIEW_ACKNOWLEDGED',
      entityType: 'REVIEW',
      entityId: id,
      details: `Employee acknowledged performance review for period ${this.data.reviews[index].reviewPeriod}`,
    });

    return this.getPerformanceReviewById(id);
  }

  public deletePerformanceReview(id: string) {
    const index = this.data.reviews.findIndex((r) => r.id === id);
    if (index === -1) return false;
    this.data.reviews.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.performanceReview.delete({ where: { id } }).catch(() => {});
    }
    return true;
  }

  // --- ACTIVITY LOGS & AUDIT ---
  public logActivity(activity: Omit<ActivityLogRecord, 'id' | 'createdAt'> & { id?: string }) {
    const newAct: ActivityLogRecord = {
      ...activity,
      id: activity.id || `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.data.activities.unshift(newAct);

    // Keep memory tidy
    if (this.data.activities.length > 500) {
      this.data.activities.pop();
    }

    if (prisma && this.isPrismaActive) {
      prisma.activityLog.create({ data: newAct as any }).catch(() => {});
    }

    return newAct;
  }

  public getActivities(filters?: { userId?: string; entityType?: string; limit?: number }) {
    let result = [...this.data.activities];
    if (filters?.userId) result = result.filter((a) => a.userId === filters.userId);
    if (filters?.entityType && filters.entityType !== 'ALL') {
      result = result.filter((a) => a.entityType === filters.entityType);
    }
    const limit = filters?.limit || 100;
    return result.slice(0, limit).map((a) => {
      const user = this.getUserById(a.userId);
      return {
        ...a,
        user: user ? { id: user.id, name: user.name, email: user.email, role: user.role, profileImage: user.profileImage } : undefined,
      };
    });
  }

  // --- TEAM CHAT ---
  public getChatMessages(filters?: { channel?: string; limit?: number }) {
    const channel = filters?.channel || 'general';
    const limit = filters?.limit || 100;
    const msgs = this.data.chatMessages
      .filter((m) => m.channel === channel && !m.isDeleted)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(-limit);

    return msgs.map((m) => {
      const sender = this.getUserById(m.senderId);
      return {
        ...m,
        sender: sender ? { id: sender.id, name: sender.name, email: sender.email, role: sender.role, profileImage: sender.profileImage } : undefined,
      };
    });
  }

  public createChatMessage(msg: Omit<ChatMessageRecord, 'id' | 'isDeleted' | 'createdAt' | 'updatedAt'> & { id?: string }) {
    const now = new Date().toISOString();
    const newMsg: ChatMessageRecord = {
      ...msg,
      id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };
    this.data.chatMessages.push(newMsg);

    if (prisma && this.isPrismaActive) {
      prisma.chatMessage.create({ data: newMsg as any }).catch(() => {});
    }

    // Handle @mentions or @all notifications
    const sender = this.getUserById(newMsg.senderId);
    const content = newMsg.content;

    if (content.includes('@all')) {
      const allUsers = this.data.users.filter((u) => u.id !== newMsg.senderId && u.role !== 'CLIENT');
      for (const target of allUsers) {
        this.createNotification({
          id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId: target.id,
          title: `Mention in #${newMsg.channel}`,
          message: `${sender?.name || 'Someone'} broadcast in #${newMsg.channel}: "${content.slice(0, 80)}"`,
          type: 'CHAT_MENTION',
          linkUrl: '/chat',
          isRead: false,
        });
      }
    } else {
      // Check for specific user mentions
      for (const user of this.data.users) {
        if (user.id !== newMsg.senderId && content.toLowerCase().includes(`@${user.name.toLowerCase()}`)) {
          this.createNotification({
            id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            userId: user.id,
            title: `Mentioned by ${sender?.name || 'a teammate'}`,
            message: `${sender?.name || 'Teammate'} mentioned you in #${newMsg.channel}: "${content.slice(0, 80)}"`,
            type: 'CHAT_MENTION',
            linkUrl: '/chat',
            isRead: false,
          });
        }
      }
    }

    return {
      ...newMsg,
      sender: sender ? { id: sender.id, name: sender.name, email: sender.email, role: sender.role, profileImage: sender.profileImage } : undefined,
    };
  }

  public deleteChatMessage(id: string, callerUserId: string, isAdmin: boolean) {
    const msg = this.data.chatMessages.find((m) => m.id === id);
    if (!msg) return false;
    if (msg.senderId !== callerUserId && !isAdmin) {
      throw new Error('Unauthorized to delete this message.');
    }
    msg.isDeleted = true;
    msg.updatedAt = new Date().toISOString();

    if (prisma && this.isPrismaActive) {
      prisma.chatMessage.update({ where: { id }, data: { isDeleted: true } }).catch(() => {});
    }
    return true;
  }

  // --- SYSTEM SETTINGS & OVERRIDES ---
  public getSettings(): SystemSettingsRecord {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<Omit<SystemSettingsRecord, 'id' | 'updatedAt'> & { meetingLink?: string | null }>, userId?: string) {
    const now = new Date().toISOString();
    this.data.settings = {
      ...this.data.settings,
      ...updates,
      updatedAt: now,
    };

    if (prisma && this.isPrismaActive) {
      prisma.systemSettings
        .upsert({
          where: { id: 'system_config' },
          create: { id: 'system_config', ...this.data.settings, updatedAt: new Date(now) },
          update: { ...updates, updatedAt: new Date(now) },
        })
        .catch(() => {});
    }

    if (userId) {
      this.logActivity({
        userId,
        action: 'SETTINGS_UPDATED',
        entityType: 'SETTINGS',
        entityId: 'system_config',
        details: 'System attendance and policy settings updated',
      });
    }

    return this.data.settings;
  }

  public getScheduleOverrides() {
    return this.data.scheduleOverrides.map((o) => {
      const user = this.getUserById(o.userId);
      return {
        ...o,
        user: user ? { id: user.id, name: user.name, email: user.email, role: user.role } : undefined,
      };
    });
  }

  public getScheduleOverrideByUserId(userId: string) {
    return this.data.scheduleOverrides.find((o) => o.userId === userId) || null;
  }

  public setScheduleOverride(override: { userId: string; customStartTime: string; customEndTime: string; notes?: string }, adminUserId?: string) {
    const now = new Date().toISOString();
    const index = this.data.scheduleOverrides.findIndex((o) => o.userId === override.userId);
    let record: EmployeeScheduleOverrideRecord;

    if (index >= 0) {
      this.data.scheduleOverrides[index] = {
        ...this.data.scheduleOverrides[index],
        ...override,
        updatedAt: now,
      };
      record = this.data.scheduleOverrides[index];
    } else {
      record = {
        id: `ovr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...override,
        createdAt: now,
        updatedAt: now,
      };
      this.data.scheduleOverrides.push(record);
    }

    if (prisma && this.isPrismaActive) {
      prisma.employeeScheduleOverride
        .upsert({
          where: { userId: override.userId },
          create: {
            id: record.id,
            userId: override.userId,
            customStartTime: override.customStartTime,
            customEndTime: override.customEndTime,
            notes: override.notes,
          },
          update: {
            customStartTime: override.customStartTime,
            customEndTime: override.customEndTime,
            notes: override.notes,
            updatedAt: new Date(now),
          },
        })
        .catch(() => {});
    }

    if (adminUserId) {
      const user = this.getUserById(override.userId);
      this.logActivity({
        userId: adminUserId,
        action: 'SCHEDULE_OVERRIDE_SET',
        entityType: 'SETTINGS',
        entityId: record.id,
        details: `Set custom working hours for ${user?.name || override.userId}: ${override.customStartTime} - ${override.customEndTime}`,
      });
    }

    return record;
  }

  public deleteScheduleOverride(userId: string, adminUserId?: string) {
    const index = this.data.scheduleOverrides.findIndex((o) => o.userId === userId);
    if (index === -1) return false;
    this.data.scheduleOverrides.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.employeeScheduleOverride.delete({ where: { userId } }).catch(() => {});
    }

    if (adminUserId) {
      this.logActivity({
        userId: adminUserId,
        action: 'SCHEDULE_OVERRIDE_REMOVED',
        entityType: 'SETTINGS',
        details: `Removed schedule override for user ID: ${userId}`,
      });
    }
    return true;
  }

  // --- ADMIN ATTENDANCE ADJUSTMENTS ---
  public adminUpdateAttendance(id: string, updates: Partial<Omit<AttendanceRecord, 'id' | 'createdAt'>>, adminUserId: string) {
    const index = this.data.attendances.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const old = this.data.attendances[index];
    const now = new Date().toISOString();

    this.data.attendances[index] = {
      ...old,
      ...updates,
      updatedAt: now,
    };

    if (prisma && this.isPrismaActive) {
      prisma.attendance.update({ where: { id }, data: { ...updates, updatedAt: new Date(now) } as any }).catch(() => {});
    }

    const employee = this.getUserById(old.userId);
    this.logActivity({
      userId: adminUserId,
      action: 'ATTENDANCE_ADMIN_MODIFIED',
      entityType: 'ATTENDANCE',
      entityId: id,
      details: `Administrator adjusted attendance record for ${employee?.name || old.userId} on ${old.date} to status ${this.data.attendances[index].status}`,
    });

    return this.getAttendanceWithDetails(this.data.attendances[index]);
  }

  public adminCreateAttendance(attendance: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'>, adminUserId: string) {
    const now = new Date().toISOString();
    const newAtt: AttendanceRecord = {
      ...attendance,
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    this.data.attendances.push(newAtt);

    if (prisma && this.isPrismaActive) {
      prisma.attendance.create({ data: newAtt as any }).catch(() => {});
    }

    const employee = this.getUserById(attendance.userId);
    this.logActivity({
      userId: adminUserId,
      action: 'ATTENDANCE_ADMIN_CREATED',
      entityType: 'ATTENDANCE',
      entityId: newAtt.id,
      details: `Administrator created attendance record for ${employee?.name || attendance.userId} on ${attendance.date}`,
    });

    return this.getAttendanceWithDetails(newAtt);
  }

  public updateAttendanceSyncStatus(
    id: string,
    syncData: { sheetsSyncedAt: string; sheetsRowIndex?: number }
  ) {
    const index = this.data.attendances.findIndex((a) => a.id === id);
    if (index === -1) return null;
    const old = this.data.attendances[index];

    this.data.attendances[index] = {
      ...old,
      sheetsSyncedAt: syncData.sheetsSyncedAt,
      ...(syncData.sheetsRowIndex !== undefined ? { sheetsRowIndex: syncData.sheetsRowIndex } : {}),
      updatedAt: new Date().toISOString(),
    };

    if (prisma && this.isPrismaActive) {
      prisma.attendance
        .update({
          where: { id },
          data: {
            sheetsSyncedAt: new Date(syncData.sheetsSyncedAt),
            ...(syncData.sheetsRowIndex !== undefined ? { sheetsRowIndex: syncData.sheetsRowIndex } : {}),
          },
        })
        .catch(() => {});
    }

    return this.data.attendances[index];
  }

  // --- PUSH NOTIFICATIONS ---
  public savePushSubscription(sub: { userId: string; endpoint: string; authKey: string; p256dhKey: string }) {
    const index = this.data.pushSubscriptions.findIndex((p) => p.endpoint === sub.endpoint);
    const now = new Date().toISOString();
    if (index >= 0) {
      this.data.pushSubscriptions[index] = {
        ...this.data.pushSubscriptions[index],
        userId: sub.userId,
        authKey: sub.authKey,
        p256dhKey: sub.p256dhKey,
      };
      return this.data.pushSubscriptions[index];
    } else {
      const record: PushSubscriptionRecord = {
        id: `ps_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...sub,
        createdAt: now,
      };
      this.data.pushSubscriptions.push(record);
      if (prisma && this.isPrismaActive) {
        prisma.pushSubscription.create({ data: record }).catch(() => {});
      }
      return record;
    }
  }

  public getPushSubscriptions(userId?: string) {
    if (userId) return this.data.pushSubscriptions.filter((p) => p.userId === userId);
    return this.data.pushSubscriptions;
  }

  public removePushSubscription(endpoint: string) {
    const index = this.data.pushSubscriptions.findIndex((p) => p.endpoint === endpoint);
    if (index === -1) return false;
    this.data.pushSubscriptions.splice(index, 1);
    if (prisma && this.isPrismaActive) {
      prisma.pushSubscription.deleteMany({ where: { endpoint } }).catch(() => {});
    }
    return true;
  }

  // --- ACCESS REQUESTS ---
  public getAccessRequests(status?: string) {
    if (status && status !== 'ALL') {
      return this.data.accessRequests.filter((r) => r.status === status);
    }
    return this.data.accessRequests;
  }

  public getAccessRequestById(id: string) {
    return this.data.accessRequests.find((r) => r.id === id);
  }

  public getAccessRequestByEmail(email: string) {
    return this.data.accessRequests.find((r) => r.email.toLowerCase() === email.toLowerCase());
  }

  public createAccessRequest(req: Omit<AccessRequestRecord, 'id' | 'createdAt' | 'status'> & { id?: string; status?: AccessRequestStatus }) {
    const id = req.id || `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newReq: AccessRequestRecord = {
      id,
      name: req.name,
      email: req.email,
      requestedRole: req.requestedRole,
      companyName: req.companyName || null,
      status: req.status || 'PENDING',
      rejectionReason: req.rejectionReason || null,
      reviewedById: req.reviewedById || null,
      createdAt: now,
      reviewedAt: req.reviewedAt || null,
    };
    this.data.accessRequests.push(newReq);

    if (prisma && this.isPrismaActive) {
      const p = prisma as any;
      if (p.accessRequest) {
        p.accessRequest
          .create({
            data: {
              id: newReq.id,
              name: newReq.name,
              email: newReq.email,
              requestedRole: newReq.requestedRole,
              companyName: newReq.companyName,
              status: newReq.status,
              rejectionReason: newReq.rejectionReason,
              reviewedById: newReq.reviewedById,
              createdAt: new Date(newReq.createdAt),
              reviewedAt: newReq.reviewedAt ? new Date(newReq.reviewedAt) : null,
            },
          })
          .catch(() => {});
      }
    }

    return newReq;
  }

  public updateAccessRequest(id: string, updates: Partial<Omit<AccessRequestRecord, 'id' | 'createdAt'>>) {
    const index = this.data.accessRequests.findIndex((r) => r.id === id);
    if (index === -1) return null;
    this.data.accessRequests[index] = {
      ...this.data.accessRequests[index],
      ...updates,
    };

    if (prisma && this.isPrismaActive) {
      const p = prisma as any;
      if (p.accessRequest) {
        const dataToUpdate: any = { ...updates };
        if (updates.reviewedAt) dataToUpdate.reviewedAt = new Date(updates.reviewedAt);
        p.accessRequest
          .update({
            where: { id },
            data: dataToUpdate,
          })
          .catch(() => {});
      }
    }

    return this.data.accessRequests[index];
  }

  // --- ISSUED CREDENTIALS ---
  public getIssuedCredentials(filter?: { createdById?: string }) {
    let list = this.data.issuedCredentials;
    if (filter?.createdById) {
      list = list.filter((c) => c.createdById === filter.createdById);
    }
    return list;
  }

  public getIssuedCredentialByUserId(userId: string): IssuedCredentialRecord | undefined {
    return this.data.issuedCredentials.find((c) => c.userId === userId);
  }

  public createIssuedCredential(cred: Omit<IssuedCredentialRecord, 'id' | 'createdAt'> & { id?: string }) {
    return this.upsertIssuedCredential(cred);
  }

  public upsertIssuedCredential(cred: {
    id?: string;
    userId: string;
    email: string;
    plaintextPassword: string;
    createdById: string;
  }) {
    const existingIndex = this.data.issuedCredentials.findIndex((c) => c.userId === cred.userId);
    const now = new Date().toISOString();
    const credId = cred.id || (existingIndex !== -1 ? this.data.issuedCredentials[existingIndex].id : `crd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);

    // Ensure valid createdById to satisfy PostgreSQL foreign key constraint
    const issuerExists = this.data.users.some((u) => u.id === cred.createdById);
    const validCreatedById = issuerExists
      ? cred.createdById
      : (this.data.users.find((u) => u.role === 'SUPER_ADMIN')?.id || cred.userId);

    const record: IssuedCredentialRecord = {
      id: credId,
      userId: cred.userId,
      email: cred.email,
      plaintextPassword: cred.plaintextPassword,
      createdById: validCreatedById,
      createdAt: now,
    };

    if (existingIndex !== -1) {
      this.data.issuedCredentials[existingIndex] = record;
    } else {
      this.data.issuedCredentials.push(record);
    }

    if (prisma && this.isPrismaActive) {
      const p = prisma as any;
      if (p.issuedCredential) {
        const executeUpsert = async () => {
          try {
            await p.issuedCredential.upsert({
              where: { userId: cred.userId },
              update: {
                email: cred.email,
                plaintextPassword: cred.plaintextPassword,
                createdById: validCreatedById,
                createdAt: new Date(now),
              },
              create: {
                id: credId,
                userId: cred.userId,
                email: cred.email,
                plaintextPassword: cred.plaintextPassword,
                createdById: validCreatedById,
                createdAt: new Date(now),
              },
            });
          } catch (err: any) {
            // If foreign key constraint failed due to user creation in-flight, retry after brief delay
            if (err?.code === 'P2003' || String(err?.message || '').includes('Foreign key')) {
              setTimeout(async () => {
                try {
                  await p.issuedCredential.upsert({
                    where: { userId: cred.userId },
                    update: {
                      email: cred.email,
                      plaintextPassword: cred.plaintextPassword,
                      createdById: validCreatedById,
                      createdAt: new Date(now),
                    },
                    create: {
                      id: credId,
                      userId: cred.userId,
                      email: cred.email,
                      plaintextPassword: cred.plaintextPassword,
                      createdById: validCreatedById,
                      createdAt: new Date(now),
                    },
                  });
                } catch (retryErr: any) {
                  console.warn('[CREDENTIALS] Retry upsert to PostgreSQL failed:', retryErr?.message);
                }
              }, 250);
            } else {
              console.warn('[CREDENTIALS] PostgreSQL upsert error:', err?.message);
            }
          }
        };

        executeUpsert();
      }
    }

    return record;
  }

  // --- GOOGLE INTEGRATION (SINGLETON) ---
  public getGoogleIntegration(): GoogleIntegrationRecord {
    if (!this.data.googleIntegration) {
      this.data.googleIntegration = {
        id: 'primary',
        connectedEmail: null,
        encryptedRefreshToken: null,
        accessToken: null,
        tokenExpiry: null,
        scopes: null,
        isConnected: false,
        driveRootFolderId: null,
        sheetsAttendanceSpreadsheetId: null,
        sheetsAttendanceSheetName: 'Attendance_Log',
        calendarId: 'primary',
        lastSyncAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    return this.data.googleIntegration;
  }

  public updateGoogleIntegration(updates: Partial<Omit<GoogleIntegrationRecord, 'id' | 'createdAt'>>): GoogleIntegrationRecord {
    const current = this.getGoogleIntegration();
    const now = new Date().toISOString();
    this.data.googleIntegration = {
      ...current,
      ...updates,
      updatedAt: now,
    };

    if (prisma && this.isPrismaActive) {
      const prismaData: any = { ...updates, updatedAt: new Date(now) };
      if (updates.tokenExpiry !== undefined) {
        prismaData.tokenExpiry = updates.tokenExpiry ? new Date(updates.tokenExpiry) : null;
      }
      if (updates.lastSyncAt !== undefined) {
        prismaData.lastSyncAt = updates.lastSyncAt ? new Date(updates.lastSyncAt) : null;
      }

      prisma.googleIntegration
        .upsert({
          where: { id: 'primary' },
          update: prismaData,
          create: {
            id: 'primary',
            connectedEmail: this.data.googleIntegration.connectedEmail || null,
            encryptedRefreshToken: this.data.googleIntegration.encryptedRefreshToken || null,
            accessToken: this.data.googleIntegration.accessToken || null,
            tokenExpiry: this.data.googleIntegration.tokenExpiry ? new Date(this.data.googleIntegration.tokenExpiry) : null,
            scopes: this.data.googleIntegration.scopes || null,
            isConnected: this.data.googleIntegration.isConnected || false,
            driveRootFolderId: this.data.googleIntegration.driveRootFolderId || null,
            sheetsAttendanceSpreadsheetId: this.data.googleIntegration.sheetsAttendanceSpreadsheetId || null,
            sheetsAttendanceSheetName: this.data.googleIntegration.sheetsAttendanceSheetName || 'Attendance_Log',
            calendarId: this.data.googleIntegration.calendarId || 'primary',
            lastSyncAt: this.data.googleIntegration.lastSyncAt ? new Date(this.data.googleIntegration.lastSyncAt) : null,
          },
        })
        .catch(() => {});
    }

    return this.data.googleIntegration;
  }

  // --- MEETINGS ---
  public getMeetings(projectId?: string): MeetingRecord[] {
    if (projectId) {
      return this.data.meetings.filter((m) => m.projectId === projectId);
    }
    return this.data.meetings;
  }

  public getMeetingById(id: string): MeetingRecord | undefined {
    return this.data.meetings.find((m) => m.id === id);
  }

  public createMeeting(meeting: Omit<MeetingRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): MeetingRecord {
    const now = new Date().toISOString();
    const id = meeting.id || `meet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newMeeting: MeetingRecord = {
      ...meeting,
      id,
      status: meeting.status || 'SCHEDULED',
      createdAt: now,
      updatedAt: now,
    };
    this.data.meetings.push(newMeeting);

    if (prisma && this.isPrismaActive) {
      prisma.meeting
        .create({
          data: {
            id: newMeeting.id,
            projectId: newMeeting.projectId,
            title: newMeeting.title,
            description: newMeeting.description || null,
            startTime: new Date(newMeeting.startTime),
            endTime: new Date(newMeeting.endTime),
            calendarEventId: newMeeting.calendarEventId || null,
            meetLink: newMeeting.meetLink || null,
            status: newMeeting.status,
          },
        })
        .catch(() => {});
    }

    return newMeeting;
  }

  public updateMeeting(id: string, updates: Partial<Omit<MeetingRecord, 'id' | 'createdAt'>>): MeetingRecord | null {
    const index = this.data.meetings.findIndex((m) => m.id === id);
    if (index === -1) return null;
    const now = new Date().toISOString();
    this.data.meetings[index] = {
      ...this.data.meetings[index],
      ...updates,
      updatedAt: now,
    };

    if (prisma && this.isPrismaActive) {
      const prismaData: any = { ...updates, updatedAt: new Date(now) };
      if (updates.startTime !== undefined) prismaData.startTime = new Date(updates.startTime);
      if (updates.endTime !== undefined) prismaData.endTime = new Date(updates.endTime);

      prisma.meeting
        .update({
          where: { id },
          data: prismaData,
        })
        .catch(() => {});
    }

    return this.data.meetings[index];
  }

  public deleteMeeting(id: string): boolean {
    const index = this.data.meetings.findIndex((m) => m.id === id);
    if (index === -1) return false;
    this.data.meetings.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      prisma.meeting
        .delete({ where: { id } })
        .catch(() => {});
    }

    return true;
  }

  // --- CHAT ACCESSIBILITY ---
  public getAccessibleClientIdsForTeamMember(userId: string): string[] {
    const memberProjectIds = new Set(
      this.getProjectMembersByUserId(userId).map((pm) => pm.projectId)
    );
    this.getTasks()
      .filter((t) => t.assignedToId === userId)
      .forEach((t) => memberProjectIds.add(t.projectId));

    const clientIds = new Set<string>();
    this.getProjects()
      .filter((p) => memberProjectIds.has(p.id) && p.clientId)
      .forEach((p) => clientIds.add(p.clientId));

    return Array.from(clientIds);
  }

  // --- PERSONAL TODOS ---
  private formatTodo(todo: PersonalTodoRecord): PersonalTodoRecord {
    const creator = this.getUserById(todo.createdById);
    const assignee = todo.assignedToId ? this.getUserById(todo.assignedToId) : null;

    return {
      ...todo,
      createdBy: creator
        ? {
            id: creator.id,
            name: creator.name,
            email: creator.email,
            role: creator.role,
            profileImage: creator.profileImage || null,
          }
        : undefined,
      assignedTo: assignee
        ? {
            id: assignee.id,
            name: assignee.name,
            email: assignee.email,
            role: assignee.role,
            profileImage: assignee.profileImage || null,
          }
        : null,
    };
  }

  public getTodos(userId: string): PersonalTodoRecord[] {
    const userTodos = this.data.todos.filter(
      (t) => t.createdById === userId || t.assignedToId === userId
    );

    // Sort: uncompleted first, then by dueDate asc (with nulls last), then createdAt desc
    return userTodos
      .sort((a, b) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .map((t) => this.formatTodo(t));
  }

  public getTodoById(id: string): PersonalTodoRecord | null {
    const todo = this.data.todos.find((t) => t.id === id);
    if (!todo) return null;
    return this.formatTodo(todo);
  }

  public createTodo(data: {
    title: string;
    description?: string | null;
    dueDate?: string | null;
    createdById: string;
    assignedToId?: string | null;
  }): PersonalTodoRecord {
    const now = new Date().toISOString();
    const newTodo: PersonalTodoRecord = {
      id: `todo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      completed: false,
      dueDate: toNullableIsoSafe(data.dueDate),
      createdById: data.createdById,
      assignedToId: data.assignedToId || null,
      createdAt: now,
      updatedAt: now,
    };

    this.data.todos.push(newTodo);

    if (prisma && this.isPrismaActive) {
      (prisma as any).personalTodo
        ?.create({
          data: {
            id: newTodo.id,
            title: newTodo.title,
            description: newTodo.description,
            completed: newTodo.completed,
            dueDate: newTodo.dueDate ? new Date(newTodo.dueDate) : null,
            createdById: newTodo.createdById,
            assignedToId: newTodo.assignedToId,
            createdAt: new Date(now),
            updatedAt: new Date(now),
          },
        })
        .catch((e: any) => console.warn('Prisma createTodo failed:', e.message));
    }

    // Notify assigned member if assigned to a colleague
    if (newTodo.assignedToId && newTodo.assignedToId !== newTodo.createdById) {
      const creator = this.getUserById(newTodo.createdById);
      this.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: newTodo.assignedToId,
        title: 'New Todo Assigned',
        message: `${creator?.name || 'A team member'} assigned a Todo to you: "${newTodo.title}"`,
        type: 'TASK_ASSIGNED',
        linkUrl: '/todos',
        isRead: false,
      });
    }

    this.logActivity({
      userId: newTodo.createdById,
      action: 'TODO_CREATED',
      entityType: 'TODO',
      entityId: newTodo.id,
      details: `Created personal todo: "${newTodo.title}"`,
    });

    return this.formatTodo(newTodo);
  }

  public updateTodo(
    id: string,
    updates: Partial<{
      title: string;
      description?: string | null;
      dueDate?: string | null;
      assignedToId?: string | null;
      completed?: boolean;
    }>,
    userId: string
  ): PersonalTodoRecord | null {
    const index = this.data.todos.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const todo = this.data.todos[index];

    // Check permissions:
    // If updating metadata (title, description, dueDate, assignedToId), must be the creator.
    const isOwner = todo.createdById === userId;
    const isAssignee = todo.assignedToId === userId;

    if (!isOwner && !isAssignee) {
      return null;
    }

    // If not owner, assignee can ONLY toggle completed
    if (!isOwner && isAssignee) {
      if (
        updates.title !== undefined ||
        updates.description !== undefined ||
        updates.dueDate !== undefined ||
        updates.assignedToId !== undefined
      ) {
        return null; // Assignee cannot alter creator's metadata
      }
    }

    const now = new Date().toISOString();
    const oldAssigneeId = todo.assignedToId;

    if (updates.title !== undefined) todo.title = updates.title.trim();
    if (updates.description !== undefined) todo.description = updates.description?.trim() || null;
    if (updates.dueDate !== undefined) todo.dueDate = toNullableIsoSafe(updates.dueDate);
    if (updates.assignedToId !== undefined) todo.assignedToId = updates.assignedToId || null;
    if (updates.completed !== undefined) todo.completed = Boolean(updates.completed);
    todo.updatedAt = now;

    if (prisma && this.isPrismaActive) {
      const prismaData: any = { updatedAt: new Date(now) };
      if (updates.title !== undefined) prismaData.title = todo.title;
      if (updates.description !== undefined) prismaData.description = todo.description;
      if (updates.dueDate !== undefined) prismaData.dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
      if (updates.assignedToId !== undefined) prismaData.assignedToId = todo.assignedToId;
      if (updates.completed !== undefined) prismaData.completed = todo.completed;

      (prisma as any).personalTodo
        ?.update({
          where: { id },
          data: prismaData,
        })
        .catch((e: any) => console.warn('Prisma updateTodo failed:', e.message));
    }

    // Notify new assignee if assignment changed to a different colleague
    if (
      updates.assignedToId &&
      updates.assignedToId !== oldAssigneeId &&
      updates.assignedToId !== todo.createdById
    ) {
      const creator = this.getUserById(todo.createdById);
      this.createNotification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: updates.assignedToId,
        title: 'New Todo Assigned',
        message: `${creator?.name || 'A team member'} assigned a Todo to you: "${todo.title}"`,
        type: 'TASK_ASSIGNED',
        linkUrl: '/todos',
        isRead: false,
      });
    }

    return this.formatTodo(todo);
  }

  public toggleTodo(id: string, userId: string): PersonalTodoRecord | null {
    const index = this.data.todos.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const todo = this.data.todos[index];
    if (todo.createdById !== userId && todo.assignedToId !== userId) {
      return null;
    }

    const now = new Date().toISOString();
    todo.completed = !todo.completed;
    todo.updatedAt = now;

    if (prisma && this.isPrismaActive) {
      (prisma as any).personalTodo
        ?.update({
          where: { id },
          data: { completed: todo.completed, updatedAt: new Date(now) },
        })
        .catch((e: any) => console.warn('Prisma toggleTodo failed:', e.message));
    }

    return this.formatTodo(todo);
  }

  public deleteTodo(id: string, userId: string): boolean {
    const index = this.data.todos.findIndex((t) => t.id === id);
    if (index === -1) return false;

    const todo = this.data.todos[index];
    // Only creator can delete their personal Todo
    if (todo.createdById !== userId) {
      return false;
    }

    this.data.todos.splice(index, 1);

    if (prisma && this.isPrismaActive) {
      (prisma as any).personalTodo
        ?.delete({ where: { id } })
        .catch((e: any) => console.warn('Prisma deleteTodo failed:', e.message));
    }

    this.logActivity({
      userId,
      action: 'TODO_DELETED',
      entityType: 'TODO',
      entityId: id,
      details: `Deleted personal todo: "${todo.title}"`,
    });

    return true;
  }
}

export const db = new DatabaseService();


