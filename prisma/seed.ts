import 'dotenv/config';
import type { Role, ProjectStatus, ProjectPriority, TaskStatus, TaskPriority, AttendanceStatus, MilestoneStatus, ApprovalStatus, NotificationType, LeaveType, LeaveStatus, ReviewStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function getSeedData() {
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('123456', salt);

  const clientPasswordHash = await bcrypt.hash('123456', salt);

  const clients = [
    {
      id: 'cli_google_01',
      name: 'jiya',
      company: 'google',
      email: 'jiyawids@gmail.com',
      phone: null,
      address: null,
      driveFolderId: null,
      driveFolderUrl: null,
    },
  ];

  const users = [
    {
      id: 'usr_superadmin_01',
      name: 'Super Admin',
      email: 'superadmin@gmail.com',
      passwordHash: adminPasswordHash,
      role: 'SUPER_ADMIN' as Role,
      clientId: null,
      profileImage: null,
    },
    {
      id: 'usr_jiya_01',
      name: 'jiya',
      email: 'jiyawids@gmail.com',
      passwordHash: clientPasswordHash,
      role: 'CLIENT_ADMIN' as Role,
      clientId: 'cli_google_01',
      profileImage: null,
    },
  ];
  const projects: any[] = [];
  const projectMembers: any[] = [];
  const tasks: any[] = [];
  const milestones: any[] = [];
  const approvals: any[] = [];
  const comments: any[] = [];
  const attendances: any[] = [];
  const breaks: any[] = [];
  const notifications: any[] = [];
  const leaves: any[] = [];
  const sops: any[] = [];
  const reviews: any[] = [];
  const activities: any[] = [];
  const chatMessages: any[] = [];
  const scheduleOverrides: any[] = [];

  // System Settings
  const settings = {
    id: 'system_config',
    officeStartTime: '09:30',
    officeEndTime: '18:30',
    lateThresholdMinutes: 15,
    maxBreakMinutes: 60,
    defaultLeaveAllowance: 20,
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
  };

  return {
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
  };
}

export async function runSeed() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const seed = await getSeedData();

  // Delete in reverse foreign-key order
  try {
    await prisma.pushSubscription.deleteMany();
    await prisma.employeeScheduleOverride.deleteMany();
    await prisma.chatMessage.deleteMany();
    await prisma.activityLog.deleteMany();
    await prisma.performanceReview.deleteMany();
    await prisma.sOPDocument.deleteMany();
    await prisma.leaveRequest.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.break.deleteMany();
    await prisma.attendance.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.clientApproval.deleteMany();
    await prisma.milestone.deleteMany();
    await prisma.meeting.deleteMany();
    await prisma.task.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.personalTodo.deleteMany();
    await prisma.issuedCredential.deleteMany();
    await prisma.accessRequest.deleteMany();
    await prisma.googleIntegration.deleteMany();
    await prisma.user.deleteMany();
    await prisma.client.deleteMany();
    await prisma.systemSettings.deleteMany();
  } catch (e) {
    console.warn('Prisma cleanup note:', e);
  }

  // Insert settings
  try {
    await prisma.systemSettings.create({ data: seed.settings });
  } catch (e) {
    console.warn('Seed settings note:', e);
  }

  // Insert clients before users so User.clientId foreign keys are valid
  for (const c of seed.clients) {
    await prisma.client.create({ data: c });
  }
  for (const u of seed.users) {
    await prisma.user.create({ data: u });
  }
  for (const p of seed.projects) {
    await prisma.project.create({
      data: {
        ...p,
        startDate: p.startDate ? new Date(p.startDate) : null,
        dueDate: p.dueDate ? new Date(p.dueDate) : null,
      },
    });
  }
  for (const pm of seed.projectMembers) {
    await prisma.projectMember.create({ data: pm });
  }
  for (const t of seed.tasks) {
    await prisma.task.create({
      data: {
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
      },
    });
  }
  for (const m of seed.milestones) {
    await prisma.milestone.create({
      data: {
        ...m,
        dueDate: m.dueDate ? new Date(m.dueDate) : null,
      },
    });
  }
  for (const a of seed.approvals) {
    await prisma.clientApproval.create({
      data: {
        ...a,
        reviewedAt: a.reviewedAt ? new Date(a.reviewedAt) : null,
      },
    });
  }
  for (const c of seed.comments) {
    await prisma.comment.create({ data: c });
  }
  for (const att of seed.attendances) {
    await prisma.attendance.create({
      data: {
        ...att,
        clockIn: att.clockIn ? new Date(att.clockIn) : null,
        clockOut: att.clockOut ? new Date(att.clockOut) : null,
      },
    });
  }
  for (const b of seed.breaks) {
    await prisma.break.create({
      data: {
        ...b,
        startTime: new Date(b.startTime),
        endTime: b.endTime ? new Date(b.endTime) : null,
      },
    });
  }
  for (const n of seed.notifications) {
    await prisma.notification.create({ data: n });
  }
  for (const lv of seed.leaves) {
    await prisma.leaveRequest.create({
      data: {
        ...lv,
        reviewedAt: lv.reviewedAt ? new Date(lv.reviewedAt) : null,
      },
    });
  }
  for (const sop of seed.sops) {
    await prisma.sOPDocument.create({ data: sop });
  }
  for (const rev of seed.reviews) {
    await prisma.performanceReview.create({ data: rev });
  }
  for (const act of seed.activities) {
    await prisma.activityLog.create({ data: act });
  }
  for (const msg of seed.chatMessages) {
    await prisma.chatMessage.create({ data: msg });
  }
  for (const ovr of seed.scheduleOverrides) {
    await prisma.employeeScheduleOverride.create({ data: ovr });
  }

  console.log('Database seeded successfully with Prisma');
  await prisma.$disconnect();
}

if (process.argv[1]?.includes('seed.ts')) {
  runSeed()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
