import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { AttendanceEventsListener } from '../src/modules/attendance/events/attendance-events.listener';
import { AttendanceAbsenceEvent } from '../src/modules/attendance/events/attendance-absence.event';

const PASSWORD = 'Password123!';
const ADMIN_EMAIL = 'admin@demoschool.ng';
const BURSAR_EMAIL = 'bursar@demoschool.ng';
const RUN_ID = Date.now().toString(36);

interface IdResponse {
  id: string;
}

interface MessageTemplateResponse {
  id: string;
  key: string | null;
  name: string;
  body: string;
}

interface NoticeResponse {
  id: string;
  title: string;
  category: string;
}

interface BroadcastResponse {
  id: string;
  recipientCount: number;
  targetType: string;
}

interface BroadcastDryRunResponse {
  id: string | null;
  recipientCount: number;
  channels: string[];
  recipients: { recipientType: string; name: string }[];
}

interface DeliveryStatusResponse {
  broadcastId: string;
  recipientCount: number;
  byChannel: Record<
    string,
    { sent: number; delivered: number; read: number; failed: number }
  >;
}

interface ConversationResponse {
  id: string;
  staffId: string;
  guardianId: string | null;
  studentId: string;
  messages: { id: string; senderType: string; body: string }[];
}

interface ConversationListItemResponse {
  id: string;
  staffName: string;
  guardianName: string | null;
  studentName: string;
  lastMessage: { body: string; senderType: string; createdAt: string } | null;
  unreadCount: number;
}

interface NotificationSummaryResponse {
  unreadCount: number;
  items: {
    type: 'BROADCAST' | 'MESSAGE';
    id: string;
    conversationId?: string;
    title: string;
    preview: string;
    read: boolean;
  }[];
}

interface FeeReminderRunResponse {
  checked: number;
  fired: number;
  details: { invoiceId: string; threshold: string }[];
}

describe('Communication (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let attendanceListener: AttendanceEventsListener;

  let adminToken: string;
  let bursarToken: string;

  // Fixtures mirroring attendance.e2e-spec.ts's pattern for class-scoping —
  // classId/armAId/armBId share one class (so a SUBJECT_TEACHER assigned
  // at the class level is in-scope for both arms); classId2/armCId is a
  // wholly separate class, out of scope for everyone except ADMIN.
  let classId: string;
  let armAId: string; // owned by classTeacher
  let armBId: string; // same class as armA, NOT owned by classTeacher
  let classId2: string;
  let armCId: string; // different class entirely
  let subjectId: string;
  let classSubjectId: string;
  let currentTermId: string;

  let classTeacherId: string;
  let classTeacherToken: string;
  let subjectTeacherId: string;
  let subjectTeacherToken: string;

  const studentIds: string[] = [];
  const guardianIds: string[] = [];
  let studentAId: string; // enrolled in armA
  let guardianAId: string;
  let guardianAToken: string;
  let studentCId: string; // enrolled in armC (out of scope)
  let guardianCId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    attendanceListener = moduleFixture.get(AttendanceEventsListener);

    const server = app.getHttpServer();
    adminToken = await loginAndGetToken(ADMIN_EMAIL);
    bursarToken = await loginAndGetToken(BURSAR_EMAIL);

    currentTermId = (
      (await request(server).get('/terms/current').set(asAdmin()))
        .body as IdResponse
    ).id;

    classId = (
      (
        await request(server)
          .post('/classes')
          .set(asAdmin())
          .send({ name: `COMM-${RUN_ID}`, level: 96 })
          .expect(201)
      ).body as IdResponse
    ).id;
    armAId = (
      (
        await request(server)
          .post(`/classes/${classId}/arms`)
          .set(asAdmin())
          .send({ name: 'A' })
          .expect(201)
      ).body as IdResponse
    ).id;
    armBId = (
      (
        await request(server)
          .post(`/classes/${classId}/arms`)
          .set(asAdmin())
          .send({ name: 'B' })
          .expect(201)
      ).body as IdResponse
    ).id;

    classId2 = (
      (
        await request(server)
          .post('/classes')
          .set(asAdmin())
          .send({ name: `COMM2-${RUN_ID}`, level: 97 })
          .expect(201)
      ).body as IdResponse
    ).id;
    armCId = (
      (
        await request(server)
          .post(`/classes/${classId2}/arms`)
          .set(asAdmin())
          .send({ name: 'C' })
          .expect(201)
      ).body as IdResponse
    ).id;

    subjectId = (
      (
        await request(server)
          .post('/subjects')
          .set(asAdmin())
          .send({ name: `CommSubj-${RUN_ID}` })
          .expect(201)
      ).body as IdResponse
    ).id;
    classSubjectId = (
      (
        await request(server)
          .post(`/subjects/${subjectId}/classes`)
          .set(asAdmin())
          .send({ classId })
          .expect(201)
      ).body as IdResponse
    ).id;

    // Class Teacher — owns armA only (not armB, same class).
    classTeacherId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'Comm',
            lastName: `ClassTeacher${RUN_ID}`,
            email: `commclassteacher.${RUN_ID}@demoschool.ng`,
            password: PASSWORD,
            roles: ['CLASS_TEACHER'],
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    await request(server)
      .patch(`/arms/${armAId}`)
      .set(asAdmin())
      .send({ classTeacherId })
      .expect(200);
    classTeacherToken = await loginAndGetToken(
      `commclassteacher.${RUN_ID}@demoschool.ng`,
    );

    // Subject Teacher — assigned at the class level, so in scope for BOTH
    // armA and armB (proves the scope is class-level, not arm-level, for
    // this role — see ClassScopeService's comment).
    subjectTeacherId = (
      (
        await request(server)
          .post('/staff')
          .set(asAdmin())
          .send({
            firstName: 'Comm',
            lastName: `SubjectTeacher${RUN_ID}`,
            email: `commsubjectteacher.${RUN_ID}@demoschool.ng`,
            password: PASSWORD,
            roles: ['SUBJECT_TEACHER'],
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    await request(server)
      .post(`/staff/${subjectTeacherId}/teaching-assignments`)
      .set(asAdmin())
      .send({ classSubjectId, termId: currentTermId })
      .expect(201);
    subjectTeacherToken = await loginAndGetToken(
      `commsubjectteacher.${RUN_ID}@demoschool.ng`,
    );

    // Student A (armA) + guardian with a phone — the primary fixture used
    // by most CLASS/INDIVIDUAL targeting tests below.
    studentAId = (
      (
        await request(server)
          .post('/students')
          .set(asAdmin())
          .send({
            firstName: 'Comm',
            lastName: `StudentA${RUN_ID}`,
            dateOfBirth: '2012-01-01',
            gender: 'MALE',
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    studentIds.push(studentAId);
    await request(server)
      .post(`/students/${studentAId}/enrollments`)
      .set(asAdmin())
      .send({ classId, armId: armAId, termId: currentTermId })
      .expect(201);
    const guardianALink = await request(server)
      .post(`/students/${studentAId}/guardians`)
      .set(asAdmin())
      .send({
        firstName: 'GuardianA',
        lastName: `Comm${RUN_ID}`,
        email: `guardiana.${RUN_ID}@example.com`,
        phone: '+2348011110001',
        relationship: 'Mother',
      })
      .expect(201);
    guardianAId = (guardianALink.body as { guardianId: string }).guardianId;
    guardianIds.push(guardianAId);
    await prisma.guardian.update({
      where: { id: guardianAId },
      data: { passwordHash: await bcrypt.hash(PASSWORD, 10) },
    });
    guardianAToken = await loginAndGetToken(`guardiana.${RUN_ID}@example.com`);

    // Student C (armC, different class) + guardian — out of scope for the
    // class/subject teachers above; used for the rejection tests.
    studentCId = (
      (
        await request(server)
          .post('/students')
          .set(asAdmin())
          .send({
            firstName: 'Comm',
            lastName: `StudentC${RUN_ID}`,
            dateOfBirth: '2012-01-01',
            gender: 'FEMALE',
          })
          .expect(201)
      ).body as IdResponse
    ).id;
    studentIds.push(studentCId);
    await request(server)
      .post(`/students/${studentCId}/enrollments`)
      .set(asAdmin())
      .send({ classId: classId2, armId: armCId, termId: currentTermId })
      .expect(201);
    const guardianCLink = await request(server)
      .post(`/students/${studentCId}/guardians`)
      .set(asAdmin())
      .send({
        firstName: 'GuardianC',
        lastName: `Comm${RUN_ID}`,
        email: `guardianc.${RUN_ID}@example.com`,
        phone: '+2348011110002',
        relationship: 'Father',
      })
      .expect(201);
    guardianCId = (guardianCLink.body as { guardianId: string }).guardianId;
    guardianIds.push(guardianCId);
  });

  afterAll(async () => {
    // Unscoped deleteMany({}) on BroadcastLog/Conversation — deliberate,
    // not an undefined-collapse accident (see fees/results/attendance
    // .e2e-spec.ts's guards for that failure mode). Safe specifically
    // because: (1) both tables were introduced this stage and are written
    // ONLY by code this file (plus the absence-event listener, exercised
    // by attendance.e2e-spec.ts) exercises — no other spec file's
    // fixtures or assertions touch them; (2) FeeReminderLog/
    // BroadcastRecipient/Message all cascade-delete from these via the
    // schema's onDelete: Cascade, so deleting the parent rows is
    // sufficient and an explicit child-table deleteMany would be
    // redundant, not safer.
    await prisma.broadcastLog.deleteMany({}).catch(() => undefined);
    await prisma.conversation.deleteMany({}).catch(() => undefined);
    // The notice and ad-hoc template created in their own describe blocks
    // are already deleted by those tests themselves — nothing left to
    // scope a cleanup to here.

    await prisma.discount
      .deleteMany({ where: { invoice: { studentId: { in: studentIds } } } })
      .catch(() => undefined);
    await prisma.invoiceLineItem
      .deleteMany({ where: { invoice: { studentId: { in: studentIds } } } })
      .catch(() => undefined);
    await prisma.invoice
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);

    await prisma.studentGuardian
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.refreshToken
      .deleteMany({ where: { guardianId: { in: guardianIds } } })
      .catch(() => undefined);
    await prisma.guardian
      .deleteMany({ where: { id: { in: guardianIds } } })
      .catch(() => undefined);
    await prisma.enrollment
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.refreshToken
      .deleteMany({ where: { studentId: { in: studentIds } } })
      .catch(() => undefined);
    await prisma.student
      .deleteMany({ where: { id: { in: studentIds } } })
      .catch(() => undefined);

    await prisma.teacherAssignment
      .deleteMany({
        where: { staffId: { in: [subjectTeacherId].filter(Boolean) } },
      })
      .catch(() => undefined);
    if (classSubjectId) {
      await prisma.classSubject
        .delete({ where: { id: classSubjectId } })
        .catch(() => undefined);
    }
    if (subjectId) {
      await prisma.subject
        .delete({ where: { id: subjectId } })
        .catch(() => undefined);
    }

    for (const staffId of [classTeacherId, subjectTeacherId].filter(Boolean)) {
      await prisma.refreshToken
        .deleteMany({ where: { staffId } })
        .catch(() => undefined);
      await prisma.staffRole
        .deleteMany({ where: { staffId } })
        .catch(() => undefined);
      await prisma.staff
        .delete({ where: { id: staffId } })
        .catch(() => undefined);
    }

    if (armAId)
      await prisma.arm.delete({ where: { id: armAId } }).catch(() => undefined);
    if (armBId)
      await prisma.arm.delete({ where: { id: armBId } }).catch(() => undefined);
    if (armCId)
      await prisma.arm.delete({ where: { id: armCId } }).catch(() => undefined);
    if (classId)
      await prisma.class
        .delete({ where: { id: classId } })
        .catch(() => undefined);
    if (classId2)
      await prisma.class
        .delete({ where: { id: classId2 } })
        .catch(() => undefined);

    await app.close();
    // This fixture's cleanup is the most sequential-step-heavy of any spec
    // file (2 classes, 3 arms, 2 staff with 3 sub-deletes each, students,
    // guardians, invoices, plus the unscoped broadcast/conversation
    // wipes) — comfortably exceeds Jest's 5s default hook timeout under
    // any DB latency variance, so give it real headroom rather than
    // trimming cleanup steps for speed.
  }, 30_000);

  async function loginAndGetToken(email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: PASSWORD });
    return (res.body as { accessToken: string }).accessToken;
  }
  function asAdmin() {
    return { Authorization: `Bearer ${adminToken}` };
  }
  function as(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  // -----------------------------------------------------------------------
  // Message Templates
  // -----------------------------------------------------------------------
  describe('Message Templates', () => {
    let adHocTemplateId: string;

    it('lets a staff member create an ad-hoc template', async () => {
      const res = await request(app.getHttpServer())
        .post('/message-templates')
        .set(as(bursarToken))
        .send({
          name: `Ad-hoc ${RUN_ID}`,
          body: 'School closes at {{due_date}}.',
        })
        .expect(201);
      const template = res.body as MessageTemplateResponse;
      expect(template.key).toBeNull();
      adHocTemplateId = template.id;

      const auditEntry = await prisma.auditLog.findFirst({
        where: {
          action: 'MESSAGE_TEMPLATE_CREATED',
          entityId: adHocTemplateId,
        },
      });
      expect(auditEntry).toBeTruthy();
    });

    it('rejects template management for students/parents', async () => {
      await request(app.getHttpServer())
        .post('/message-templates')
        .set(as(guardianAToken))
        .send({ name: 'Nope', body: 'Nope' })
        .expect(403);
    });

    it('lists the seeded system templates plus the ad-hoc one', async () => {
      const res = await request(app.getHttpServer())
        .get('/message-templates')
        .set(asAdmin())
        .expect(200);
      const templates = res.body as MessageTemplateResponse[];
      expect(templates.some((t) => t.key === 'ABSENCE_ALERT')).toBe(true);
      expect(templates.some((t) => t.key === 'FEE_REMINDER_T7')).toBe(true);
      expect(templates.some((t) => t.id === adHocTemplateId)).toBe(true);
    });

    it('allows editing a system template body but blocks deleting it', async () => {
      const system = (
        (
          await request(app.getHttpServer())
            .get('/message-templates')
            .set(asAdmin())
        ).body as MessageTemplateResponse[]
      ).find((t) => t.key === 'ABSENCE_ALERT')!;

      await request(app.getHttpServer())
        .patch(`/message-templates/${system.id}`)
        .set(as(bursarToken))
        .send({ body: `${system.body} (edited ${RUN_ID})` })
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/message-templates/${system.id}`)
        .set(asAdmin())
        .expect(409);

      // restore so other tests/the seed's invariant aren't left edited
      await request(app.getHttpServer())
        .patch(`/message-templates/${system.id}`)
        .set(as(bursarToken))
        .send({ body: system.body })
        .expect(200);
    });

    it('allows deleting the ad-hoc (non-system) template', async () => {
      await request(app.getHttpServer())
        .delete(`/message-templates/${adHocTemplateId}`)
        .set(as(bursarToken))
        .expect(200);
      await request(app.getHttpServer())
        .get(`/message-templates/${adHocTemplateId}`)
        .set(asAdmin())
        .expect(404);
    });
  });

  // -----------------------------------------------------------------------
  // Notices
  // -----------------------------------------------------------------------
  describe('Notices', () => {
    let noticeId: string;

    it('lets a staff member post a notice, visible to everyone', async () => {
      const res = await request(app.getHttpServer())
        .post('/notices')
        .set(as(bursarToken))
        .send({
          title: `PTA meeting ${RUN_ID}`,
          body: 'Saturday 10am.',
          category: 'Event',
        })
        .expect(201);
      noticeId = (res.body as NoticeResponse).id;

      await request(app.getHttpServer())
        .get(`/notices/${noticeId}`)
        .set(as(guardianAToken))
        .expect(200);
      const list = (
        await request(app.getHttpServer())
          .get('/notices')
          .query({ category: 'Event' })
          .set(asAdmin())
          .expect(200)
      ).body as NoticeResponse[];
      expect(list.some((n) => n.id === noticeId)).toBe(true);
    });

    it('rejects notice creation for parents/students', async () => {
      await request(app.getHttpServer())
        .post('/notices')
        .set(as(guardianAToken))
        .send({ title: 'Nope', body: 'Nope', category: 'General' })
        .expect(403);
    });

    it('lets a staff member edit and delete a notice', async () => {
      await request(app.getHttpServer())
        .patch(`/notices/${noticeId}`)
        .set(as(bursarToken))
        .send({ title: `PTA meeting (updated) ${RUN_ID}` })
        .expect(200);
      await request(app.getHttpServer())
        .delete(`/notices/${noticeId}`)
        .set(as(bursarToken))
        .expect(200);
      await request(app.getHttpServer())
        .get(`/notices/${noticeId}`)
        .set(asAdmin())
        .expect(404);
    });
  });

  // -----------------------------------------------------------------------
  // Broadcasts — targeting, RBAC scoping, delivery tracking, read receipts
  // -----------------------------------------------------------------------
  describe('Broadcasts', () => {
    it('lets the owning CLASS_TEACHER broadcast to their own arm', async () => {
      const res = await request(app.getHttpServer())
        .post('/broadcast')
        .set(as(classTeacherToken))
        .send({
          targetType: 'CLASS',
          targetId: armAId,
          channels: ['SMS', 'EMAIL'],
          message: `Own-class notice ${RUN_ID}`,
        })
        .expect(201);
      const broadcast = res.body as BroadcastResponse;
      expect(broadcast.recipientCount).toBeGreaterThanOrEqual(1);

      // Every recipient gets SMS + EMAIL + the implicit IN_APP row.
      const rows = await prisma.broadcastRecipient.findMany({
        where: { broadcastLogId: broadcast.id },
      });
      const channelsSeen = new Set(rows.map((r) => r.channel));
      expect(channelsSeen).toEqual(new Set(['SMS', 'EMAIL', 'IN_APP']));
      // Placeholder Termii/Resend keys -> every real-channel attempt fails,
      // but fails *cleanly* (a recorded FAILED status, not a thrown error
      // that would have 500'd the whole request).
      const smsRow = rows.find(
        (r) => r.channel === 'SMS' && r.recipientId === guardianAId,
      );
      expect(smsRow?.status).toBe('FAILED');
      expect(smsRow?.errorMessage).toBeTruthy();
      const inAppRow = rows.find(
        (r) => r.channel === 'IN_APP' && r.recipientId === guardianAId,
      );
      expect(inAppRow?.status).toBe('SENT');
    });

    it('rejects a CLASS_TEACHER targeting an arm in their own class they do not own', async () => {
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(as(classTeacherToken))
        .send({
          targetType: 'CLASS',
          targetId: armBId,
          channels: ['SMS'],
          message: 'Should be rejected',
        })
        .expect(403);
    });

    it('lets the assigned SUBJECT_TEACHER broadcast to either arm in their class (class-level, not arm-level, scope)', async () => {
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(as(subjectTeacherToken))
        .send({
          targetType: 'CLASS',
          targetId: armAId,
          channels: ['SMS'],
          message: 'Subject-teacher to armA',
        })
        .expect(201);
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(as(subjectTeacherToken))
        .send({
          targetType: 'CLASS',
          targetId: armBId,
          channels: ['SMS'],
          message: 'Subject-teacher to armB',
        })
        .expect(201);
    });

    it('rejects CLASS_TEACHER/SUBJECT_TEACHER targeting a class they have nothing to do with', async () => {
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(as(classTeacherToken))
        .send({
          targetType: 'CLASS',
          targetId: armCId,
          channels: ['SMS'],
          message: 'Out of scope',
        })
        .expect(403);
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(as(subjectTeacherToken))
        .send({
          targetType: 'CLASS',
          targetId: armCId,
          channels: ['SMS'],
          message: 'Out of scope',
        })
        .expect(403);
    });

    it('rejects CLASS_TEACHER/SUBJECT_TEACHER using ROLE or WHOLE_SCHOOL targeting', async () => {
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(as(classTeacherToken))
        .send({
          targetType: 'WHOLE_SCHOOL',
          channels: ['SMS'],
          message: 'Should be rejected',
        })
        .expect(403);
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(as(subjectTeacherToken))
        .send({
          targetType: 'ROLE',
          channels: ['SMS'],
          message: 'Should be rejected',
        })
        .expect(403);
    });

    it('lets an unscoped role (ADMIN) target an individual guardian directly', async () => {
      const res = await request(app.getHttpServer())
        .post('/broadcast')
        .set(asAdmin())
        .send({
          targetType: 'INDIVIDUAL',
          targetId: guardianAId,
          targetRecipientType: 'GUARDIAN',
          channels: ['EMAIL'],
          message: `Individual notice ${RUN_ID}`,
        })
        .expect(201);
      const broadcast = res.body as BroadcastResponse;
      expect(broadcast.recipientCount).toBe(1);
    });

    it('dryRun resolves and authorizes the target, returning exactly who would receive it, without sending or recording anything', async () => {
      const before = await prisma.broadcastLog.count();

      const res = await request(app.getHttpServer())
        .post('/broadcast')
        .set(as(classTeacherToken))
        .send({
          targetType: 'CLASS',
          targetId: armAId,
          channels: ['SMS'],
          message: 'Preview only',
          dryRun: true,
        })
        .expect(201);
      const preview = res.body as BroadcastDryRunResponse;

      expect(preview.id).toBeNull();
      expect(preview.recipientCount).toBeGreaterThanOrEqual(1);
      expect(
        preview.recipients.some(
          (r) => r.recipientType === 'GUARDIAN' && r.name.includes('GuardianA'),
        ),
      ).toBe(true);

      const after = await prisma.broadcastLog.count();
      expect(after).toBe(before); // nothing actually created
    });

    it('dryRun still enforces the same RBAC scoping as a real send', async () => {
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(as(classTeacherToken))
        .send({
          targetType: 'CLASS',
          targetId: armCId,
          channels: ['SMS'],
          message: 'x',
          dryRun: true,
        })
        .expect(403);
    });

    it('lets ADMIN target a Role (all BURSARs) and target "all staff" by omitting targetId', async () => {
      const roleRes = await request(app.getHttpServer())
        .post('/broadcast')
        .set(asAdmin())
        .send({
          targetType: 'ROLE',
          targetId: 'BURSAR',
          channels: [],
          message: 'To all bursars',
        })
        .expect(201);
      expect(
        (roleRes.body as BroadcastResponse).recipientCount,
      ).toBeGreaterThanOrEqual(1);

      const allStaffRes = await request(app.getHttpServer())
        .post('/broadcast')
        .set(asAdmin())
        .send({ targetType: 'ROLE', channels: [], message: 'To all staff' })
        .expect(201);
      expect(
        (allStaffRes.body as BroadcastResponse).recipientCount,
      ).toBeGreaterThanOrEqual(7);
    });

    it('rejects an unknown role value for ROLE targeting', async () => {
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(asAdmin())
        .send({
          targetType: 'ROLE',
          targetId: 'NOT_A_REAL_ROLE',
          channels: ['SMS'],
          message: 'x',
        })
        .expect(400);
    });

    it('lets ADMIN send a WHOLE_SCHOOL broadcast reaching guardians, staff, and emailed students', async () => {
      const res = await request(app.getHttpServer())
        .post('/broadcast')
        .set(asAdmin())
        .send({
          targetType: 'WHOLE_SCHOOL',
          channels: [],
          message: `Whole school ${RUN_ID}`,
        })
        .expect(201);
      // At least our 2 test guardians + 7 seeded staff.
      expect(
        (res.body as BroadcastResponse).recipientCount,
      ).toBeGreaterThanOrEqual(9);
    });

    it('rejects a broadcast with neither templateId nor message, and an unknown channel', async () => {
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(asAdmin())
        .send({ targetType: 'WHOLE_SCHOOL', channels: ['SMS'] })
        .expect(400);
      await request(app.getHttpServer())
        .post('/broadcast')
        .set(asAdmin())
        .send({
          targetType: 'WHOLE_SCHOOL',
          channels: ['WHATSAPP'],
          message: 'x',
        })
        .expect(400);
    });

    it('reports a sensible delivery-status funnel and lets the actual recipient mark it read', async () => {
      const sendRes = await request(app.getHttpServer())
        .post('/broadcast')
        .set(asAdmin())
        .send({
          targetType: 'INDIVIDUAL',
          targetId: guardianAId,
          targetRecipientType: 'GUARDIAN',
          channels: ['SMS'],
          message: 'Delivery status check',
        })
        .expect(201);
      const broadcastId = (sendRes.body as BroadcastResponse).id;

      const before = (
        await request(app.getHttpServer())
          .get(`/broadcast/${broadcastId}/delivery-status`)
          .set(asAdmin())
          .expect(200)
      ).body as DeliveryStatusResponse;
      expect(before.byChannel.IN_APP.sent).toBe(1);
      expect(before.byChannel.IN_APP.read).toBe(0);

      // Someone NOT the recipient can't mark it read.
      await request(app.getHttpServer())
        .post(`/broadcast/${broadcastId}/read`)
        .set(asAdmin())
        .expect(404);

      await request(app.getHttpServer())
        .post(`/broadcast/${broadcastId}/read`)
        .set(as(guardianAToken))
        .expect(201);

      const after = (
        await request(app.getHttpServer())
          .get(`/broadcast/${broadcastId}/delivery-status`)
          .set(asAdmin())
          .expect(200)
      ).body as DeliveryStatusResponse;
      expect(after.byChannel.IN_APP.read).toBe(1);
      expect(after.byChannel.IN_APP.sent).toBe(1); // read still counts as sent — see the funnel comment
      expect(after.byChannel.SMS.failed).toBe(1); // placeholder Termii key
    });
  });

  // -----------------------------------------------------------------------
  // Conversations — teacher<->parent two-way messaging
  // -----------------------------------------------------------------------
  describe('Conversations', () => {
    let conversationId: string;

    it('lets the owning class teacher start a thread about their own student', async () => {
      const res = await request(app.getHttpServer())
        .post('/conversations')
        .set(as(classTeacherToken))
        .send({
          guardianId: guardianAId,
          studentId: studentAId,
          message: `Checking in ${RUN_ID}`,
        })
        .expect(201);
      const conversation = res.body as ConversationResponse;
      conversationId = conversation.id;
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].senderType).toBe('STAFF');
    });

    it('rejects a class teacher starting a thread about a student outside their class', async () => {
      await request(app.getHttpServer())
        .post('/conversations')
        .set(as(classTeacherToken))
        .send({
          guardianId: guardianCId,
          studentId: studentCId,
          message: 'Out of scope',
        })
        .expect(403);
    });

    it('lets the guardian reply, and lets either participant read the thread', async () => {
      await request(app.getHttpServer())
        .post(`/conversations/${conversationId}/messages`)
        .set(as(guardianAToken))
        .send({ body: 'Thank you, will check.' })
        .expect(201);

      const thread = (
        await request(app.getHttpServer())
          .get(`/conversations/${conversationId}`)
          .set(as(guardianAToken))
          .expect(200)
      ).body as ConversationResponse;
      expect(thread.messages).toHaveLength(2);
      expect(thread.messages[1].senderType).toBe('GUARDIAN');

      const list = (
        await request(app.getHttpServer())
          .get('/conversations')
          .set(as(classTeacherToken))
          .expect(200)
      ).body as ConversationResponse[];
      expect(list.some((c) => c.id === conversationId)).toBe(true);
    });

    it("list() includes names/last-message/unread count, and viewing a thread marks the other party's messages read", async () => {
      const list = (
        await request(app.getHttpServer())
          .get('/conversations')
          .set(as(classTeacherToken))
          .expect(200)
      ).body as ConversationListItemResponse[];
      const item = list.find((c) => c.id === conversationId)!;
      expect(item.guardianName).toContain('GuardianA');
      expect(item.studentName).toContain('StudentA');
      expect(item.lastMessage?.body).toBe('Thank you, will check.');
      // The guardian's reply, not yet viewed by the class teacher.
      expect(item.unreadCount).toBe(1);

      await request(app.getHttpServer())
        .get(`/conversations/${conversationId}`)
        .set(as(classTeacherToken))
        .expect(200);

      const listAfter = (
        await request(app.getHttpServer())
          .get('/conversations')
          .set(as(classTeacherToken))
          .expect(200)
      ).body as ConversationListItemResponse[];
      expect(listAfter.find((c) => c.id === conversationId)!.unreadCount).toBe(
        0,
      );
    });

    it('ADMIN viewing for oversight does not mark messages read for the real participant', async () => {
      await request(app.getHttpServer())
        .post(`/conversations/${conversationId}/messages`)
        .set(as(guardianAToken))
        .send({ body: 'Following up.' })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/conversations/${conversationId}`)
        .set(asAdmin())
        .expect(200);

      const list = (
        await request(app.getHttpServer())
          .get('/conversations')
          .set(as(classTeacherToken))
          .expect(200)
      ).body as ConversationListItemResponse[];
      expect(list.find((c) => c.id === conversationId)!.unreadCount).toBe(1);
    });

    it('rejects a non-participant staff member from reading or replying', async () => {
      await request(app.getHttpServer())
        .get(`/conversations/${conversationId}`)
        .set(as(subjectTeacherToken))
        .expect(403);
      await request(app.getHttpServer())
        .post(`/conversations/${conversationId}/messages`)
        .set(as(subjectTeacherToken))
        .send({ body: 'Should be rejected' })
        .expect(403);
    });

    it('lets ADMIN view any conversation for oversight, without being a participant', async () => {
      await request(app.getHttpServer())
        .get(`/conversations/${conversationId}`)
        .set(asAdmin())
        .expect(200);
    });
  });

  // -----------------------------------------------------------------------
  // Student<->teacher messaging (Stage 15) — same scoping rule as the
  // staff side (ClassScopeService), evaluated from the student's end.
  // -----------------------------------------------------------------------
  describe('Student-initiated conversations', () => {
    let studentAToken: string;
    let studentCToken: string;
    let directConversationId: string;
    // A fresh classTeacher<->guardianA thread about studentA — the
    // "student is the subject, not a participant" rejection fixture
    // (self-contained; the outer Conversations block's thread id isn't in
    // scope here).
    let guardianThreadId: string;

    beforeAll(async () => {
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(PASSWORD, 10);
      const studentAEmail = `commstudenta.${RUN_ID}@students.demoschool.ng`;
      const studentCEmail = `commstudentc.${RUN_ID}@students.demoschool.ng`;
      await prisma.student.update({
        where: { id: studentAId },
        data: { email: studentAEmail, passwordHash },
      });
      await prisma.student.update({
        where: { id: studentCId },
        data: { email: studentCEmail, passwordHash },
      });
      studentAToken = await loginAndGetToken(studentAEmail);
      studentCToken = await loginAndGetToken(studentCEmail);

      guardianThreadId = (
        (
          await request(app.getHttpServer())
            .post('/conversations')
            .set(as(classTeacherToken))
            .send({
              guardianId: guardianAId,
              studentId: studentAId,
              message: 'Guardian-privacy fixture thread.',
            })
            .expect(201)
        ).body as ConversationResponse
      ).id;
    });

    it('lets a student start a thread with their own subject teacher', async () => {
      const res = await request(app.getHttpServer())
        .post('/conversations')
        .set(as(studentAToken))
        .send({
          staffId: subjectTeacherId,
          message: `Sir, a question about the homework ${RUN_ID}`,
        })
        .expect(201);
      const conversation = res.body as ConversationResponse;
      directConversationId = conversation.id;
      expect(conversation.guardianId).toBeNull();
      expect(conversation.studentId).toBe(studentAId);
      expect(conversation.messages).toHaveLength(1);
      expect(conversation.messages[0].senderType).toBe('STUDENT');
    });

    it('rejects a student messaging a teacher who does not teach them (403)', async () => {
      // studentC is enrolled in a different class — neither the subject
      // teacher nor armA's class teacher is theirs.
      await request(app.getHttpServer())
        .post('/conversations')
        .set(as(studentCToken))
        .send({ staffId: subjectTeacherId, message: 'Out of scope' })
        .expect(403);
      await request(app.getHttpServer())
        .post('/conversations')
        .set(as(studentCToken))
        .send({ staffId: classTeacherId, message: 'Out of scope' })
        .expect(403);
    });

    it('lets the teacher reply within the thread, and the student read it', async () => {
      await request(app.getHttpServer())
        .post(`/conversations/${directConversationId}/messages`)
        .set(as(subjectTeacherToken))
        .send({ body: 'Good question — see page 42.' })
        .expect(201);

      const thread = (
        await request(app.getHttpServer())
          .get(`/conversations/${directConversationId}`)
          .set(as(studentAToken))
          .expect(200)
      ).body as ConversationResponse;
      expect(thread.messages).toHaveLength(2);
      expect(thread.messages[1].senderType).toBe('STAFF');
    });

    it("keeps the direct thread out of the guardian's list, and guardian threads out of the student's", async () => {
      const guardianList = (
        await request(app.getHttpServer())
          .get('/conversations')
          .set(as(guardianAToken))
          .expect(200)
      ).body as ConversationListItemResponse[];
      expect(guardianList.some((c) => c.id === directConversationId)).toBe(
        false,
      );

      const studentList = (
        await request(app.getHttpServer())
          .get('/conversations')
          .set(as(studentAToken))
          .expect(200)
      ).body as ConversationListItemResponse[];
      expect(studentList.some((c) => c.id === directConversationId)).toBe(true);
      // Every thread a student sees is a direct one (guardianName null) —
      // the guardian's own threads about this student never leak here.
      expect(studentList.every((c) => c.guardianName === null)).toBe(true);
    });

    it('rejects a student reading or replying to a staff<->guardian thread about them', async () => {
      // The student is that thread's *subject*, not a participant.
      await request(app.getHttpServer())
        .get(`/conversations/${guardianThreadId}`)
        .set(as(studentAToken))
        .expect(403);
      await request(app.getHttpServer())
        .post(`/conversations/${guardianThreadId}/messages`)
        .set(as(studentAToken))
        .send({ body: 'Should be rejected' })
        .expect(403);
    });

    it('re-posting to the same teacher reuses the existing thread (no duplicates)', async () => {
      const res = await request(app.getHttpServer())
        .post('/conversations')
        .set(as(studentAToken))
        .send({ staffId: subjectTeacherId, message: 'One more question…' })
        .expect(201);
      expect((res.body as ConversationResponse).id).toBe(directConversationId);
    });
  });

  // -----------------------------------------------------------------------
  // Notifications — feeds the shared bell. Self-contained (own fresh
  // conversation) rather than reusing the "Conversations" block's shared
  // `conversationId`, whose read/unread state by this point depends on
  // exactly which of that block's tests already ran.
  // -----------------------------------------------------------------------
  describe('Notifications (the bell)', () => {
    let freshConversationId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/conversations')
        .set(as(classTeacherToken))
        .send({
          guardianId: guardianAId,
          studentId: studentAId,
          message: 'Bell test thread.',
        })
        .expect(201);
      freshConversationId = (res.body as ConversationResponse).id;
    });

    it("guardian's summary includes unread in-app broadcasts and the fresh unread message", async () => {
      const summary = (
        await request(app.getHttpServer())
          .get('/notifications/summary')
          .set(as(guardianAToken))
          .expect(200)
      ).body as NotificationSummaryResponse;

      expect(summary.items.some((i) => i.type === 'BROADCAST')).toBe(true);
      const messageItem = summary.items.find(
        (i) => i.type === 'MESSAGE' && i.conversationId === freshConversationId,
      );
      expect(messageItem).toBeTruthy();
      expect(messageItem!.read).toBe(false);
      expect(summary.unreadCount).toBeGreaterThanOrEqual(1);
    });

    it('mark-all-read clears the unread count for both broadcasts and messages', async () => {
      await request(app.getHttpServer())
        .post('/notifications/mark-all-read')
        .set(as(guardianAToken))
        .expect(201);

      const after = (
        await request(app.getHttpServer())
          .get('/notifications/summary')
          .set(as(guardianAToken))
          .expect(200)
      ).body as NotificationSummaryResponse;
      expect(after.unreadCount).toBe(0);
      expect(after.items.every((i) => i.read)).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Absence alert wiring — Stage 4's event, processed by Stage 7's listener
  // -----------------------------------------------------------------------
  describe('Absence alert wiring', () => {
    it('processes an absence event end-to-end: creates a SYSTEM broadcast and attempts a real SMS send', async () => {
      const before = await prisma.broadcastLog.count({
        where: { actorType: 'SYSTEM', targetId: studentAId },
      });

      // Calling the listener directly (rather than emitting and racing its
      // fire-and-forget handling) — attendance.e2e-spec.ts's own
      // "emits an absence/late event" test already proves
      // attendance.service.ts emits this event with the right payload;
      // this proves the *listener* correctly turns that payload into a
      // real send attempt, deterministically (no timing-dependent poll).
      await attendanceListener.handleAbsence(
        new AttendanceAbsenceEvent(
          studentAId,
          armAId,
          currentTermId,
          '2026-06-20',
          'ABSENT',
          classTeacherId,
        ),
      );

      const after = await prisma.broadcastLog.count({
        where: { actorType: 'SYSTEM', targetId: studentAId },
      });
      expect(after).toBe(before + 1);

      const broadcast = await prisma.broadcastLog.findFirst({
        where: { actorType: 'SYSTEM', targetId: studentAId },
        orderBy: { createdAt: 'desc' },
        include: { recipients: true },
      });
      expect(broadcast?.channels).toEqual(['SMS']);
      const smsRow = broadcast?.recipients.find(
        (r) => r.channel === 'SMS' && r.recipientId === guardianAId,
      );
      expect(smsRow).toBeTruthy();
      expect(smsRow?.status).toBe('FAILED'); // placeholder Termii key
      const inAppRow = broadcast?.recipients.find(
        (r) => r.channel === 'IN_APP' && r.recipientId === guardianAId,
      );
      expect(inAppRow?.status).toBe('SENT');
    });

    it('does nothing (and does not throw) for a student with no guardian on file', async () => {
      const lonelyStudentId = (
        (
          await request(app.getHttpServer())
            .post('/students')
            .set(asAdmin())
            .send({
              firstName: 'Lonely',
              lastName: `NoGuardian${RUN_ID}`,
              dateOfBirth: '2012-01-01',
              gender: 'MALE',
            })
            .expect(201)
        ).body as IdResponse
      ).id;
      studentIds.push(lonelyStudentId);

      await expect(
        attendanceListener.handleAbsence(
          new AttendanceAbsenceEvent(
            lonelyStudentId,
            armAId,
            currentTermId,
            '2026-06-20',
            'LATE',
            classTeacherId,
          ),
        ),
      ).resolves.toBeUndefined();

      const count = await prisma.broadcastLog.count({
        where: { actorType: 'SYSTEM', targetId: lonelyStudentId },
      });
      expect(count).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Escalating fee reminders — cron logic via the manual-trigger endpoint
  // -----------------------------------------------------------------------
  describe('Fee reminders', () => {
    let dueIn7Id: string;
    let dueIn30Id: string;
    let overdue4Id: string;

    beforeAll(async () => {
      dueIn7Id = await createInvoice(studentAId, daysFromNow(7));
      dueIn30Id = await createInvoice(studentAId, daysFromNow(30));
      overdue4Id = await createInvoice(studentAId, daysFromNow(-4));
    });

    async function createInvoice(
      forStudentId: string,
      dueDate: string,
    ): Promise<string> {
      const res = await request(app.getHttpServer())
        .post(`/invoices/${forStudentId}`)
        .set(as(bursarToken))
        .send({
          termId: currentTermId,
          description: `Fee reminder test ${RUN_ID}`,
          dueDate,
          items: [{ name: 'Test fee', amount: 10000 }],
        })
        .expect(201);
      return (res.body as IdResponse).id;
    }

    function daysFromNow(days: number): string {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString();
    }

    it('rejects non-ADMIN/BURSAR roles from triggering a run', async () => {
      await request(app.getHttpServer())
        .post('/fee-reminders/run')
        .set(as(classTeacherToken))
        .expect(403);
    });

    it('dry-run reports what would fire without writing FeeReminderLog rows or sending anything', async () => {
      const res = await request(app.getHttpServer())
        .post('/fee-reminders/run')
        .set(as(bursarToken))
        .send({ dryRun: true })
        .expect(201);
      const result = res.body as FeeReminderRunResponse;

      const dueIn7Details = result.details.filter(
        (d) => d.invoiceId === dueIn7Id,
      );
      expect(dueIn7Details.map((d) => d.threshold)).toEqual(['T_MINUS_7']);
      const overdue4Details = result.details.filter(
        (d) => d.invoiceId === overdue4Id,
      );
      expect(new Set(overdue4Details.map((d) => d.threshold))).toEqual(
        new Set(['T_MINUS_7', 'T_MINUS_3', 'DUE_DATE', 'T_PLUS_3']),
      );
      expect(result.details.some((d) => d.invoiceId === dueIn30Id)).toBe(false);

      const logCount = await prisma.feeReminderLog.count({
        where: { invoiceId: { in: [dueIn7Id, overdue4Id] } },
      });
      expect(logCount).toBe(0);
    });

    it('a real run fires every newly-crossed threshold exactly once, catching up an overdue invoice on all 4 at once', async () => {
      const res = await request(app.getHttpServer())
        .post('/fee-reminders/run')
        .set(asAdmin())
        .send({})
        .expect(201);
      const result = res.body as FeeReminderRunResponse;
      expect(
        result.details.filter((d) => d.invoiceId === dueIn7Id),
      ).toHaveLength(1);
      expect(
        result.details.filter((d) => d.invoiceId === overdue4Id),
      ).toHaveLength(4);

      const dueIn7Logs = await prisma.feeReminderLog.findMany({
        where: { invoiceId: dueIn7Id },
      });
      expect(dueIn7Logs.map((l) => l.threshold)).toEqual(['T_MINUS_7']);
      const overdue4Logs = await prisma.feeReminderLog.findMany({
        where: { invoiceId: overdue4Id },
      });
      expect(overdue4Logs).toHaveLength(4);

      // Each fired threshold is its own SYSTEM broadcast, targeted at the
      // student, fanned out to the guardian on file.
      const broadcasts = await prisma.broadcastLog.findMany({
        where: {
          actorType: 'SYSTEM',
          targetId: studentAId,
          targetRecipientType: 'STUDENT',
        },
        include: { recipients: true },
      });
      expect(broadcasts.length).toBeGreaterThanOrEqual(5); // 1 (T-7) + 4 (overdue4's catch-up)
      const t7Broadcast = broadcasts.find((b) =>
        b.recipients.some(
          (r) => r.recipientId === guardianAId && r.channel === 'SMS',
        ),
      );
      expect(t7Broadcast).toBeTruthy();
    });

    it('re-running immediately fires nothing new (idempotent)', async () => {
      const res = await request(app.getHttpServer())
        .post('/fee-reminders/run')
        .set(asAdmin())
        .send({})
        .expect(201);
      const result = res.body as FeeReminderRunResponse;
      expect(
        result.details.filter((d) => d.invoiceId === dueIn7Id),
      ).toHaveLength(0);
      expect(
        result.details.filter((d) => d.invoiceId === overdue4Id),
      ).toHaveLength(0);

      const totalLogs = await prisma.feeReminderLog.count({
        where: { invoiceId: { in: [dueIn7Id, overdue4Id] } },
      });
      expect(totalLogs).toBe(5);
    });
  });
});
