import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  BroadcastLog,
  DeliveryStatus,
  NotificationChannel,
  RecipientType,
  Role,
  UserType,
} from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { ClassScopeService, type CandidateArm } from './class-scope.service';
import { CreateBroadcastDto } from './dto/broadcast.dto';
import { EmailService } from './providers/email.service';
import { PushProviderService } from './providers/push.service';
import { SmsService } from './providers/sms.service';
import { WhatsAppProviderService } from './providers/whatsapp.service';
import { renderTemplate } from './templates/render-template';
import {
  SYSTEM_TEMPLATE_KEYS,
  type SystemTemplateKey,
} from './templates/default-templates';

interface ResolvedRecipient {
  recipientType: RecipientType;
  recipientId: string;
  name: string;
  phone: string | null;
  email: string | null;
  context: Record<string, string>;
}

export interface DeliveryStatusChannelCounts {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface DeliveryStatusResult {
  broadcastId: string;
  recipientCount: number;
  byChannel: Record<string, DeliveryStatusChannelCounts>;
}

// `id` is null for a dryRun preview — nothing was actually created. The
// frontend's confirmation step (docs prompt: "a confirmation step showing
// exactly who will receive it before it goes out") needs real names, not
// just a count, which is why this returns the full resolved list rather
// than the bare BroadcastLog row `send()` used to return directly.
export interface BroadcastSendResult {
  id: string | null;
  recipientCount: number;
  channels: NotificationChannel[];
  recipients: { recipientType: RecipientType; name: string }[];
}

@Injectable()
export class BroadcastsService {
  private readonly logger = new Logger(BroadcastsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppProviderService,
    private readonly pushService: PushProviderService,
    private readonly classScope: ClassScopeService,
  ) {}

  list(): Promise<BroadcastLog[]> {
    return this.prisma.broadcastLog.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrThrow(id: string): Promise<BroadcastLog> {
    const broadcast = await this.prisma.broadcastLog.findUnique({
      where: { id },
    });
    if (!broadcast) throw new NotFoundException('Broadcast not found');
    return broadcast;
  }

  /**
   * POST /broadcast — the only human-initiated entry point into fanOut().
   * `dto.dryRun` resolves+authorizes the target and returns exactly who
   * would receive it (for the frontend's send-confirmation step) without
   * creating a BroadcastLog or sending anything — same shape as
   * `generateInvoices`'s dryRun in fees, for the same reason.
   */
  async send(
    dto: CreateBroadcastDto,
    user: RequestUser,
  ): Promise<BroadcastSendResult> {
    const recipients = await this.resolveAndAuthorizeTarget(dto, user);

    if (dto.dryRun) {
      return {
        id: null,
        recipientCount: recipients.length,
        channels: dto.channels,
        recipients: recipients.map((r) => ({
          recipientType: r.recipientType,
          name: r.name,
        })),
      };
    }

    const { message, templateId } = await this.resolveMessageBody(dto);

    const broadcastLog = await this.prisma.broadcastLog.create({
      data: {
        actorId: user.id,
        actorType: 'STAFF',
        actorRole: user.roles.join(','),
        targetType: dto.targetType,
        targetId: dto.targetId,
        targetRecipientType: dto.targetRecipientType,
        channels: dto.channels,
        templateId,
        message,
        recipientCount: recipients.length,
      },
    });

    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels: dto.channels,
      bodyTemplate: message,
      emailSubject: 'Notice from your school',
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'BROADCAST_SENT',
      entityType: 'BroadcastLog',
      entityId: broadcastLog.id,
      afterJson: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        channels: dto.channels,
        recipientCount: recipients.length,
      },
    });

    return {
      id: broadcastLog.id,
      recipientCount: recipients.length,
      channels: dto.channels,
      recipients: recipients.map((r) => ({
        recipientType: r.recipientType,
        name: r.name,
      })),
    };
  }

  async getDeliveryStatus(id: string): Promise<DeliveryStatusResult> {
    const broadcast = await this.getOrThrow(id);
    const groups = await this.prisma.broadcastRecipient.groupBy({
      by: ['channel', 'status'],
      where: { broadcastLogId: id },
      _count: { _all: true },
    });

    const byChannel: Record<string, DeliveryStatusChannelCounts> = {};
    for (const group of groups) {
      byChannel[group.channel] ??= {
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      };
      const bucket = byChannel[group.channel];
      const count = group._count._all;
      if (group.status === DeliveryStatus.FAILED) {
        bucket.failed += count;
        continue;
      }
      if (group.status === DeliveryStatus.PENDING) continue;
      // SENT/DELIVERED/READ are a funnel — each later stage implies the
      // earlier ones happened too, so a "read" recipient still counts
      // toward "sent" and "delivered" (docs §7: "delivered to 240 of 250").
      bucket.sent += count;
      if (
        group.status === DeliveryStatus.DELIVERED ||
        group.status === DeliveryStatus.READ
      ) {
        bucket.delivered += count;
      }
      if (group.status === DeliveryStatus.READ) bucket.read += count;
    }

    return {
      broadcastId: id,
      recipientCount: broadcast.recipientCount,
      byChannel,
    };
  }

  /** Lets the actual recipient mark their own in-app copy as read. */
  async markRead(broadcastLogId: string, user: RequestUser): Promise<void> {
    const recipientType: RecipientType =
      user.userType === 'STAFF'
        ? RecipientType.STAFF
        : user.userType === 'GUARDIAN'
          ? RecipientType.GUARDIAN
          : RecipientType.STUDENT;

    const row = await this.prisma.broadcastRecipient.findFirst({
      where: {
        broadcastLogId,
        recipientType,
        recipientId: user.id,
        channel: NotificationChannel.IN_APP,
      },
    });
    if (!row) throw new NotFoundException('This broadcast was not sent to you');
    if (row.status !== DeliveryStatus.READ) {
      await this.prisma.broadcastRecipient.update({
        where: { id: row.id },
        data: { status: DeliveryStatus.READ, readAt: new Date() },
      });
    }
  }

  // -------------------------------------------------------------------
  // Targeting + RBAC scoping
  // -------------------------------------------------------------------

  private async resolveAndAuthorizeTarget(
    dto: CreateBroadcastDto,
    user: RequestUser,
  ): Promise<ResolvedRecipient[]> {
    const unscoped = this.classScope.isUnscoped(user);

    if (dto.targetType === 'CLASS') {
      const arm = await this.prisma.arm.findUnique({
        where: { id: dto.targetId },
      });
      if (!arm) throw new NotFoundException('Class/arm not found');
      if (!unscoped) await this.classScope.assertOwnClassScope([arm], user);
      return this.resolveClassRecipients(arm.id);
    }

    if (dto.targetType === 'ROLE') {
      if (!unscoped) {
        throw new ForbiddenException(
          'You can only broadcast to your own class.',
        );
      }
      if (dto.targetId && !Object.values(Role).includes(dto.targetId as Role)) {
        throw new BadRequestException(`Unknown role: ${dto.targetId}`);
      }
      return this.resolveRoleRecipients(dto.targetId as Role | undefined);
    }

    if (dto.targetType === 'INDIVIDUAL') {
      const { recipient, arms } = await this.resolveIndividualTarget(
        dto.targetRecipientType!,
        dto.targetId!,
      );
      if (!unscoped) await this.classScope.assertOwnClassScope(arms, user);
      return [recipient];
    }

    // WHOLE_SCHOOL
    if (!unscoped) {
      throw new ForbiddenException('You can only broadcast to your own class.');
    }
    return this.resolveWholeSchoolRecipients();
  }

  private async resolveIndividualTarget(
    targetRecipientType: RecipientType,
    targetId: string,
  ): Promise<{ recipient: ResolvedRecipient; arms: CandidateArm[] }> {
    if (targetRecipientType === RecipientType.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { id: targetId },
        include: {
          enrollments: { where: { status: 'ACTIVE' }, include: { arm: true } },
        },
      });
      if (!student) throw new NotFoundException('Student not found');
      const studentName = `${student.firstName} ${student.lastName}`;
      return {
        recipient: {
          recipientType: RecipientType.STUDENT,
          recipientId: student.id,
          name: studentName,
          phone: null,
          email: student.email,
          context: { student_name: studentName },
        },
        arms: student.enrollments.map((e) => e.arm),
      };
    }

    if (targetRecipientType === RecipientType.GUARDIAN) {
      const guardian = await this.prisma.guardian.findUnique({
        where: { id: targetId },
        include: {
          students: {
            include: {
              student: {
                include: {
                  enrollments: {
                    where: { status: 'ACTIVE' },
                    include: { arm: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!guardian) throw new NotFoundException('Guardian not found');
      return {
        recipient: {
          recipientType: RecipientType.GUARDIAN,
          recipientId: guardian.id,
          name: `${guardian.firstName} ${guardian.lastName}`,
          phone: guardian.phone,
          email: guardian.email,
          context: {},
        },
        arms: guardian.students.flatMap((sg) =>
          sg.student.enrollments.map((e) => e.arm),
        ),
      };
    }

    // STAFF — never in scope for CLASS_TEACHER/SUBJECT_TEACHER (empty
    // `arms` makes assertOwnClassScope reject it for them automatically).
    const staff = await this.prisma.staff.findUnique({
      where: { id: targetId },
    });
    if (!staff) throw new NotFoundException('Staff member not found');
    return {
      recipient: {
        recipientType: RecipientType.STAFF,
        recipientId: staff.id,
        name: `${staff.firstName} ${staff.lastName}`,
        phone: staff.phone,
        email: staff.email,
        context: {},
      },
      arms: [],
    };
  }

  /**
   * Guardians of every actively-enrolled student in the arm. Doesn't also
   * target the students themselves (most don't have a phone on file at
   * all — see Student model — and "not every parent has a smartphone, so
   * never assume in-app alone is enough" cuts the other way too: a
   * class-wide notice's primary audience is the parent). Dedupes by
   * guardian — a guardian with two children in the same arm gets the
   * notice once, not twice.
   */
  private async resolveClassRecipients(
    armId: string,
  ): Promise<ResolvedRecipient[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { armId, status: 'ACTIVE' },
      include: {
        student: { include: { guardians: { include: { guardian: true } } } },
      },
    });

    const byGuardianId = new Map<string, ResolvedRecipient>();
    for (const enrollment of enrollments) {
      for (const link of enrollment.student.guardians) {
        byGuardianId.set(link.guardian.id, {
          recipientType: RecipientType.GUARDIAN,
          recipientId: link.guardian.id,
          name: `${link.guardian.firstName} ${link.guardian.lastName}`,
          phone: link.guardian.phone,
          email: link.guardian.email,
          context: {},
        });
      }
    }
    return [...byGuardianId.values()];
  }

  private async resolveRoleRecipients(
    role?: Role,
  ): Promise<ResolvedRecipient[]> {
    const staff = await this.prisma.staff.findMany({
      where: { isActive: true, ...(role ? { roles: { some: { role } } } : {}) },
    });
    return staff.map((s) => ({
      recipientType: RecipientType.STAFF,
      recipientId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      phone: s.phone,
      email: s.email,
      context: {},
    }));
  }

  /**
   * Every guardian, every staff member, and every student who has a
   * portal account (email on file) — a true "reach literally everyone"
   * blast, matching docs §2's "Emergency/closure notice -> all channels
   * at once" framing.
   */
  private async resolveWholeSchoolRecipients(): Promise<ResolvedRecipient[]> {
    const [guardians, staff, students] = await Promise.all([
      this.prisma.guardian.findMany({ where: { isActive: true } }),
      this.prisma.staff.findMany({ where: { isActive: true } }),
      this.prisma.student.findMany({
        where: { isActive: true, email: { not: null } },
      }),
    ]);

    return [
      ...guardians.map((g) => ({
        recipientType: RecipientType.GUARDIAN,
        recipientId: g.id,
        name: `${g.firstName} ${g.lastName}`,
        phone: g.phone,
        email: g.email,
        context: {},
      })),
      ...staff.map((s) => ({
        recipientType: RecipientType.STAFF,
        recipientId: s.id,
        name: `${s.firstName} ${s.lastName}`,
        phone: s.phone,
        email: s.email,
        context: {},
      })),
      ...students.map((s) => ({
        recipientType: RecipientType.STUDENT,
        recipientId: s.id,
        name: `${s.firstName} ${s.lastName}`,
        phone: null,
        email: s.email,
        context: {},
      })),
    ];
  }

  private async resolveMessageBody(
    dto: CreateBroadcastDto,
  ): Promise<{ message: string; templateId: string | null }> {
    if (dto.templateId) {
      const template = await this.prisma.messageTemplate.findUnique({
        where: { id: dto.templateId },
      });
      if (!template) throw new NotFoundException('Message template not found');
      return { message: template.body, templateId: template.id };
    }
    return { message: dto.message!, templateId: null };
  }

  // -------------------------------------------------------------------
  // Channel fan-out — shared by send() above and the SYSTEM-triggered
  // absence alert / fee-reminder cron, so all three get identical
  // per-recipient delivery tracking.
  // -------------------------------------------------------------------

  async fanOut(params: {
    broadcastLogId: string;
    recipients: ResolvedRecipient[];
    channels: NotificationChannel[];
    bodyTemplate: string;
    emailSubject: string;
  }): Promise<void> {
    const allChannels = [
      ...new Set([...params.channels, NotificationChannel.IN_APP]),
    ];

    for (const recipient of params.recipients) {
      const renderedBody = renderTemplate(
        params.bodyTemplate,
        recipient.context,
      );
      for (const channel of allChannels) {
        const row = await this.prisma.broadcastRecipient.create({
          data: {
            broadcastLogId: params.broadcastLogId,
            recipientType: recipient.recipientType,
            recipientId: recipient.recipientId,
            channel,
            status: DeliveryStatus.PENDING,
          },
        });
        await this.dispatchOne(
          row.id,
          channel,
          recipient,
          renderedBody,
          params.emailSubject,
        );
      }
    }
  }

  /**
   * Stage 21 — a rendered, IN_APP notice to a specific set of staff
   * members (Class Teacher on an early pickup, Admins on an unrecognized
   * pickup escalation). Small generic helper: the gate is time-critical
   * but internal, so IN_APP is the right channel.
   */
  async sendStaffNotice(event: {
    staffIds: string[];
    templateKey:
      | 'EARLY_PICKUP'
      | 'UNRECOGNIZED_PICKUP_PERSON'
      | 'LATE_ARRIVAL'
      | 'INVIGILATION_DUTY'
      | 'LEAVE_DECIDED'
      | 'AT_RISK_FLAGGED'
      | 'AT_RISK_RESOLVED';
    context: Record<string, string>;
    emailSubject: string;
    targetId: string;
  }): Promise<void> {
    if (event.staffIds.length === 0) return;
    const template = await this.prisma.messageTemplate.findUnique({
      where: { key: SYSTEM_TEMPLATE_KEYS[event.templateKey] },
    });
    if (!template) {
      this.logger.error(
        `Missing ${event.templateKey} system template — seeding may not have run yet.`,
      );
      return;
    }

    const staff = await this.prisma.staff.findMany({
      where: { id: { in: event.staffIds }, isActive: true },
    });
    if (staff.length === 0) return;

    const recipients: ResolvedRecipient[] = staff.map((s) => ({
      recipientType: RecipientType.STAFF,
      recipientId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      phone: s.phone,
      email: s.email,
      context: event.context,
    }));

    const renderedMessage = renderTemplate(template.body, event.context);
    const channels = [NotificationChannel.IN_APP];
    const broadcastLog = await this.createSystemBroadcastLog({
      targetRecipientType: RecipientType.STAFF,
      targetId: event.targetId,
      channels,
      templateId: template.id,
      message: renderedMessage,
      recipientCount: recipients.length,
    });

    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels,
      bodyTemplate: template.body,
      emailSubject: event.emailSubject,
    });
  }

  /**
   * Stage 29 — a new AtRiskFlag transition (into-flagged, or resolved)
   * notifies the student's Class Teacher and every Admin via
   * sendStaffNotice (IN_APP — internal follow-up, not urgent enough for a
   * real channel). Guardian notification is a *separate*, school-toggled
   * send (docs §5 calls it explicitly "optional") — SMS, since a parent
   * won't be checking an in-app dashboard for this.
   */
  async sendAtRiskFlagAlert(event: {
    studentId: string;
    transition: 'FLAGGED' | 'RESOLVED';
    reason: 'ATTENDANCE' | 'CA' | 'BOTH';
    notifyGuardian: boolean;
  }): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: event.studentId },
      include: {
        enrollments: { where: { status: 'ACTIVE' }, include: { arm: true } },
      },
    });
    if (!student) {
      this.logger.warn(
        `At-risk alert for unknown student ${event.studentId} — skipping.`,
      );
      return;
    }

    const templateKey =
      event.transition === 'FLAGGED' ? 'AT_RISK_FLAGGED' : 'AT_RISK_RESOLVED';
    const reasonLabel =
      event.reason === 'BOTH'
        ? 'attendance and CA scores'
        : event.reason === 'ATTENDANCE'
          ? 'attendance'
          : 'CA scores';
    const context = {
      student_name: `${student.firstName} ${student.lastName}`,
      reason: reasonLabel,
    };
    const emailSubject = `At-risk ${event.transition === 'FLAGGED' ? 'flag' : 'resolution'} — ${context.student_name}`;

    const staffIds = new Set<string>();
    const classTeacherId = student.enrollments[0]?.arm.classTeacherId;
    if (classTeacherId) staffIds.add(classTeacherId);
    const admins = await this.prisma.staff.findMany({
      where: { isActive: true, roles: { some: { role: 'ADMIN' } } },
      select: { id: true },
    });
    for (const admin of admins) staffIds.add(admin.id);

    await this.sendStaffNotice({
      staffIds: [...staffIds],
      templateKey,
      context,
      emailSubject,
      targetId: student.id,
    });

    if (!event.notifyGuardian) return;

    const template = await this.prisma.messageTemplate.findUnique({
      where: { key: SYSTEM_TEMPLATE_KEYS[templateKey] },
    });
    if (!template) return; // sendStaffNotice already logged the missing-template case above

    const guardianLinks = await this.prisma.studentGuardian.findMany({
      where: { studentId: student.id },
      include: { guardian: true },
    });
    if (guardianLinks.length === 0) return;

    const recipients: ResolvedRecipient[] = guardianLinks.map((link) => ({
      recipientType: RecipientType.GUARDIAN,
      recipientId: link.guardian.id,
      name: `${link.guardian.firstName} ${link.guardian.lastName}`,
      phone: link.guardian.phone,
      email: link.guardian.email,
      context,
    }));
    const channels = [NotificationChannel.SMS];
    const broadcastLog = await this.createSystemBroadcastLog({
      targetRecipientType: RecipientType.STUDENT,
      targetId: student.id,
      channels,
      templateId: template.id,
      message: template.body,
      recipientCount: recipients.length,
    });
    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels,
      bodyTemplate: template.body,
      emailSubject,
    });
  }

  /**
   * Stage 18 — assignment posted / due-soon notices to every actively
   * enrolled student in the assignment's class plus their guardians
   * (docs/05 §6 "auto-notify students/parents"). IN_APP only: homework
   * notices are routine, not worth SMS credits the way an absence or fee
   * deadline is.
   */
  async sendAssignmentNotice(event: {
    assignmentId: string;
    kind: 'POSTED' | 'DUE_SOON';
  }): Promise<void> {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: event.assignmentId },
      include: {
        classSubject: { include: { subject: true, class: true } },
      },
    });
    if (!assignment) {
      this.logger.warn(
        `Assignment notice for unknown assignment ${event.assignmentId} — skipping.`,
      );
      return;
    }

    const templateKey =
      event.kind === 'POSTED'
        ? SYSTEM_TEMPLATE_KEYS.ASSIGNMENT_POSTED
        : SYSTEM_TEMPLATE_KEYS.ASSIGNMENT_DUE_SOON;
    const template = await this.prisma.messageTemplate.findUnique({
      where: { key: templateKey },
    });
    if (!template) {
      this.logger.error(
        `Missing ${templateKey} system template — seeding may not have run yet.`,
      );
      return;
    }

    const currentTerm = await this.prisma.term.findFirst({
      where: { isCurrent: true },
    });
    if (!currentTerm) return;

    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classId: assignment.classSubject.classId,
        termId: currentTerm.id,
        status: 'ACTIVE',
      },
      include: {
        student: {
          include: { guardians: { include: { guardian: true } } },
        },
      },
    });
    if (enrollments.length === 0) return;

    const context = {
      subject_name: assignment.classSubject.subject.name,
      class_name: assignment.classSubject.class.name,
      title: assignment.title,
      due_date: assignment.dueDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    };

    const recipients: ResolvedRecipient[] = [];
    const seenGuardians = new Set<string>();
    for (const enrollment of enrollments) {
      const student = enrollment.student;
      recipients.push({
        recipientType: RecipientType.STUDENT,
        recipientId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        phone: null,
        email: student.email,
        context,
      });
      for (const link of student.guardians) {
        // Guardians with several children in the class get one notice.
        if (seenGuardians.has(link.guardian.id)) continue;
        seenGuardians.add(link.guardian.id);
        recipients.push({
          recipientType: RecipientType.GUARDIAN,
          recipientId: link.guardian.id,
          name: `${link.guardian.firstName} ${link.guardian.lastName}`,
          phone: link.guardian.phone,
          email: link.guardian.email,
          context,
        });
      }
    }

    // Context is identical for every recipient here, so store the RENDERED
    // text on the log — the notification bell previews broadcastLog.message
    // verbatim, and raw {{placeholders}} would leak into the UI.
    const renderedMessage = renderTemplate(template.body, context);
    const channels = [NotificationChannel.IN_APP];
    const broadcastLog = await this.createSystemBroadcastLog({
      targetRecipientType: RecipientType.STUDENT,
      targetId: assignment.classSubject.classId,
      channels,
      templateId: template.id,
      message: renderedMessage,
      recipientCount: recipients.length,
    });

    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels,
      bodyTemplate: template.body,
      emailSubject: `${context.subject_name} assignment — ${context.title}`,
    });
  }

  /**
   * Stage 4's absence event listener delegates here — docs §2 "Attendance
   * alert (absence/lateness) -> Push + SMS (immediate, time-sensitive)".
   * No push send (no PWA subscription flow — see dispatchOne's PUSH
   * branch), so SMS is the one real channel; IN_APP is added automatically
   * by fanOut regardless.
   */
  async sendAbsenceAlert(event: {
    studentId: string;
    status: 'ABSENT' | 'LATE';
    date: string;
  }): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: event.studentId },
    });
    if (!student) {
      this.logger.warn(
        `Absence alert for unknown student ${event.studentId} — skipping.`,
      );
      return;
    }

    const guardianLinks = await this.prisma.studentGuardian.findMany({
      where: { studentId: event.studentId },
      include: { guardian: true },
    });
    if (guardianLinks.length === 0) {
      this.logger.warn(
        `${student.firstName} ${student.lastName} has no guardian on file — skipping absence alert.`,
      );
      return;
    }

    const template = await this.prisma.messageTemplate.findUnique({
      where: { key: SYSTEM_TEMPLATE_KEYS.ABSENCE_ALERT },
    });
    if (!template) {
      this.logger.error(
        'Missing ABSENCE_ALERT system template — cannot send absence alert.',
      );
      return;
    }

    const context = {
      student_name: `${student.firstName} ${student.lastName}`,
      status: event.status === 'ABSENT' ? 'absent' : 'late',
      date: event.date,
    };
    const recipients: ResolvedRecipient[] = guardianLinks.map((link) => ({
      recipientType: RecipientType.GUARDIAN,
      recipientId: link.guardian.id,
      name: `${link.guardian.firstName} ${link.guardian.lastName}`,
      phone: link.guardian.phone,
      email: link.guardian.email,
      context,
    }));
    // docs §2: "Attendance alert (absence/lateness) → Push + SMS
    // (immediate, time-sensitive)" — Stage 28 wires PUSH in for real
    // (previously a no-op stub, see PushProviderService).
    const channels = [NotificationChannel.SMS, NotificationChannel.PUSH];

    const broadcastLog = await this.createSystemBroadcastLog({
      targetRecipientType: RecipientType.STUDENT,
      targetId: student.id,
      channels,
      templateId: template.id,
      message: template.body,
      recipientCount: recipients.length,
    });

    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels,
      bodyTemplate: template.body,
      emailSubject: `Attendance alert — ${context.student_name}`,
    });
  }

  /**
   * Stage 24 — a library notice straight to the borrower (student or
   * staff), not routed through a guardian the way sendAbsenceAlert is:
   * "your reservation is ready" / "this book is overdue" is the
   * borrower's own errand to run, not something a parent needs paged
   * for. IN_APP only — routine, same reasoning as sendAssignmentNotice.
   */
  async sendLibraryNotice(event: {
    borrowerType: 'STUDENT' | 'STAFF';
    borrowerId: string;
    templateKey: 'RESERVATION_AVAILABLE' | 'LIBRARY_OVERDUE';
    context: Record<string, string>;
    emailSubject: string;
  }): Promise<void> {
    let recipient: ResolvedRecipient;
    if (event.borrowerType === 'STUDENT') {
      const student = await this.prisma.student.findUnique({
        where: { id: event.borrowerId },
      });
      if (!student) {
        this.logger.warn(
          `Library notice for unknown student ${event.borrowerId} — skipping.`,
        );
        return;
      }
      recipient = {
        recipientType: RecipientType.STUDENT,
        recipientId: student.id,
        name: `${student.firstName} ${student.lastName}`,
        phone: null,
        email: student.email,
        context: event.context,
      };
    } else {
      const staff = await this.prisma.staff.findUnique({
        where: { id: event.borrowerId },
      });
      if (!staff) {
        this.logger.warn(
          `Library notice for unknown staff ${event.borrowerId} — skipping.`,
        );
        return;
      }
      recipient = {
        recipientType: RecipientType.STAFF,
        recipientId: staff.id,
        name: `${staff.firstName} ${staff.lastName}`,
        phone: staff.phone,
        email: staff.email,
        context: event.context,
      };
    }

    const template = await this.prisma.messageTemplate.findUnique({
      where: { key: SYSTEM_TEMPLATE_KEYS[event.templateKey] },
    });
    if (!template) {
      this.logger.error(
        `Missing ${event.templateKey} system template — seeding may not have run yet.`,
      );
      return;
    }

    const channels = [NotificationChannel.IN_APP];
    const broadcastLog = await this.createSystemBroadcastLog({
      targetRecipientType: recipient.recipientType,
      targetId: event.borrowerId,
      channels,
      templateId: template.id,
      message: renderTemplate(template.body, event.context),
      recipientCount: 1,
    });

    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients: [recipient],
      channels,
      bodyTemplate: template.body,
      emailSubject: event.emailSubject,
    });
  }

  /**
   * Stage 25 — a generic "notify every active staff member holding one of
   * these roles" fan-out, IN_APP only. Generalizes the inline
   * `staffRole.findMany({ where: { role: { in: [...] } } })` query that
   * previously only lived in notifyAdminNewApplication/front-desk's
   * escalation, since Stage 25 needs the same shape twice more (unapproved
   * roll-call absence -> Admin, vehicle service due -> Transport Officer).
   */
  private async notifyStaffRoles(params: {
    roles: Role[];
    templateKey: SystemTemplateKey;
    context: Record<string, string>;
    emailSubject: string;
    targetId: string;
  }): Promise<void> {
    const staffRoles = await this.prisma.staffRole.findMany({
      where: { role: { in: params.roles } },
      select: { staffId: true },
    });
    if (staffRoles.length === 0) return;

    const staffIds = [...new Set(staffRoles.map((s) => s.staffId))];
    const staff = await this.prisma.staff.findMany({
      where: { id: { in: staffIds }, isActive: true },
    });
    if (staff.length === 0) return;

    const template = await this.prisma.messageTemplate.findUnique({
      where: { key: params.templateKey },
    });
    if (!template) {
      this.logger.error(
        `Missing ${params.templateKey} system template — seeding may not have run yet.`,
      );
      return;
    }

    const recipients: ResolvedRecipient[] = staff.map((s) => ({
      recipientType: RecipientType.STAFF,
      recipientId: s.id,
      name: `${s.firstName} ${s.lastName}`,
      phone: s.phone,
      email: s.email,
      context: params.context,
    }));
    const channels = [NotificationChannel.IN_APP];
    const broadcastLog = await this.createSystemBroadcastLog({
      targetRecipientType: RecipientType.STAFF,
      targetId: params.targetId,
      channels,
      templateId: template.id,
      message: renderTemplate(template.body, params.context),
      recipientCount: recipients.length,
    });

    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels,
      bodyTemplate: template.body,
      emailSubject: params.emailSubject,
    });
  }

  /**
   * Roll-call marked an ABSENT boarder with no APPROVED LeaveOutingRequest
   * covering that date — docs/16-module-communication.md §2's
   * disciplinary-notice-equivalent urgency, so both halves fire: the
   * guardian (SMS, sendAbsenceAlert's exact shape) AND Admin/VP (IN_APP,
   * via notifyStaffRoles) — no single existing method covered both
   * audiences, so this composes the two established patterns.
   */
  async sendUnapprovedAbsenceAlert(event: {
    studentId: string;
    hostelName: string;
    session: string;
    date: string;
  }): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: event.studentId },
    });
    if (!student) {
      this.logger.warn(
        `Unapproved-absence alert for unknown student ${event.studentId} — skipping.`,
      );
      return;
    }
    const context = {
      student_name: `${student.firstName} ${student.lastName}`,
      hostel_name: event.hostelName,
      session: event.session,
      date: event.date,
    };

    const guardianLinks = await this.prisma.studentGuardian.findMany({
      where: { studentId: event.studentId },
      include: { guardian: true },
    });
    if (guardianLinks.length > 0) {
      const template = await this.prisma.messageTemplate.findUnique({
        where: { key: SYSTEM_TEMPLATE_KEYS.UNAPPROVED_ABSENCE },
      });
      if (!template) {
        this.logger.error(
          'Missing UNAPPROVED_ABSENCE system template — cannot send guardian alert.',
        );
      } else {
        const recipients: ResolvedRecipient[] = guardianLinks.map((link) => ({
          recipientType: RecipientType.GUARDIAN,
          recipientId: link.guardian.id,
          name: `${link.guardian.firstName} ${link.guardian.lastName}`,
          phone: link.guardian.phone,
          email: link.guardian.email,
          context,
        }));
        const channels = [NotificationChannel.SMS, NotificationChannel.EMAIL];
        const broadcastLog = await this.createSystemBroadcastLog({
          targetRecipientType: RecipientType.STUDENT,
          targetId: student.id,
          channels,
          templateId: template.id,
          message: renderTemplate(template.body, context),
          recipientCount: recipients.length,
        });
        await this.fanOut({
          broadcastLogId: broadcastLog.id,
          recipients,
          channels,
          bodyTemplate: template.body,
          emailSubject: `Unapproved absence — ${context.student_name}`,
        });
      }
    }

    await this.notifyStaffRoles({
      roles: ['ADMIN', 'VICE_PRINCIPAL'],
      templateKey: SYSTEM_TEMPLATE_KEYS.UNAPPROVED_ABSENCE,
      context,
      emailSubject: `Unapproved absence — ${context.student_name}`,
      targetId: student.id,
    });
  }

  /** A student didn't board their assigned bus's pickup run — parent alert, same shape as sendAbsenceAlert. */
  async sendTransportNoShowAlert(event: {
    studentId: string;
    routeName: string;
    date: string;
  }): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: event.studentId },
    });
    if (!student) {
      this.logger.warn(
        `Transport no-show alert for unknown student ${event.studentId} — skipping.`,
      );
      return;
    }
    const guardianLinks = await this.prisma.studentGuardian.findMany({
      where: { studentId: event.studentId },
      include: { guardian: true },
    });
    if (guardianLinks.length === 0) {
      this.logger.warn(
        `${student.firstName} ${student.lastName} has no guardian on file — skipping transport no-show alert.`,
      );
      return;
    }
    const template = await this.prisma.messageTemplate.findUnique({
      where: { key: SYSTEM_TEMPLATE_KEYS.TRANSPORT_NO_SHOW },
    });
    if (!template) {
      this.logger.error(
        'Missing TRANSPORT_NO_SHOW system template — cannot send no-show alert.',
      );
      return;
    }
    const context = {
      student_name: `${student.firstName} ${student.lastName}`,
      route_name: event.routeName,
      date: event.date,
    };
    const recipients: ResolvedRecipient[] = guardianLinks.map((link) => ({
      recipientType: RecipientType.GUARDIAN,
      recipientId: link.guardian.id,
      name: `${link.guardian.firstName} ${link.guardian.lastName}`,
      phone: link.guardian.phone,
      email: link.guardian.email,
      context,
    }));
    const channels = [NotificationChannel.SMS];
    const broadcastLog = await this.createSystemBroadcastLog({
      targetRecipientType: RecipientType.STUDENT,
      targetId: student.id,
      channels,
      templateId: template.id,
      message: renderTemplate(template.body, context),
      recipientCount: recipients.length,
    });
    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels,
      bodyTemplate: template.body,
      emailSubject: `Missed bus pickup — ${context.student_name}`,
    });
  }

  /** Vehicle service due soon/overdue — Transport Officer + Admin, IN_APP. */
  async sendVehicleMaintenanceAlert(event: {
    busIdentifier: string;
    nextServiceDueDate: string;
    thresholdLabel: string;
    maintenanceRecordId: string;
  }): Promise<void> {
    await this.notifyStaffRoles({
      roles: ['ADMIN', 'TRANSPORT_OFFICER'],
      templateKey: SYSTEM_TEMPLATE_KEYS.VEHICLE_MAINTENANCE_DUE,
      context: {
        bus_identifier: event.busIdentifier,
        due_date: event.nextServiceDueDate,
        threshold_label: event.thresholdLabel,
      },
      emailSubject: `Vehicle service due — ${event.busIdentifier}`,
      targetId: event.maintenanceRecordId,
    });
  }

  /**
   * Stage 9's DisciplineModule calls this once a DisciplinaryAction is
   * finalized (WARNING immediately, SUSPENSION/EXPULSION only once an
   * ADMIN approves it — see IncidentsService) — docs prompt §1 "trigger a
   * notification... via Stage 7's CommunicationModule (reuse it, don't
   * rebuild messaging here)". SMS + EMAIL (not just SMS like the absence
   * alert) since a finalized disciplinary action — especially a
   * suspension/expulsion — warrants reaching a guardian on more than one
   * channel.
   */
  async sendDisciplineAlert(event: {
    studentId: string;
    actionType: 'WARNING' | 'SUSPENSION' | 'EXPULSION';
  }): Promise<void> {
    const student = await this.prisma.student.findUnique({
      where: { id: event.studentId },
    });
    if (!student) {
      this.logger.warn(
        `Discipline alert for unknown student ${event.studentId} — skipping.`,
      );
      return;
    }

    const guardianLinks = await this.prisma.studentGuardian.findMany({
      where: { studentId: event.studentId },
      include: { guardian: true },
    });
    if (guardianLinks.length === 0) {
      this.logger.warn(
        `${student.firstName} ${student.lastName} has no guardian on file — skipping discipline alert.`,
      );
      return;
    }

    const template = await this.prisma.messageTemplate.findUnique({
      where: { key: SYSTEM_TEMPLATE_KEYS.DISCIPLINE_ALERT },
    });
    if (!template) {
      this.logger.error(
        'Missing DISCIPLINE_ALERT system template — cannot send discipline alert.',
      );
      return;
    }

    const context = {
      student_name: `${student.firstName} ${student.lastName}`,
      action_type:
        event.actionType.charAt(0) + event.actionType.slice(1).toLowerCase(),
    };
    const recipients: ResolvedRecipient[] = guardianLinks.map((link) => ({
      recipientType: RecipientType.GUARDIAN,
      recipientId: link.guardian.id,
      name: `${link.guardian.firstName} ${link.guardian.lastName}`,
      phone: link.guardian.phone,
      email: link.guardian.email,
      context,
    }));
    const channels = [NotificationChannel.SMS, NotificationChannel.EMAIL];

    const broadcastLog = await this.createSystemBroadcastLog({
      targetRecipientType: RecipientType.STUDENT,
      targetId: student.id,
      channels,
      templateId: template.id,
      message: template.body,
      recipientCount: recipients.length,
    });

    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels,
      bodyTemplate: template.body,
      emailSubject: `Disciplinary notice — ${context.student_name}`,
    });
  }

  /** Creates the BroadcastLog row itself — exposed for SYSTEM triggers. */
  createSystemBroadcastLog(params: {
    targetRecipientType: RecipientType;
    targetId: string;
    channels: NotificationChannel[];
    templateId: string;
    message: string;
    recipientCount: number;
  }): Promise<BroadcastLog> {
    return this.prisma.broadcastLog.create({
      data: {
        actorId: null,
        actorType: 'SYSTEM',
        targetType: 'INDIVIDUAL',
        targetId: params.targetId,
        targetRecipientType: params.targetRecipientType,
        channels: params.channels,
        templateId: params.templateId,
        message: params.message,
        recipientCount: params.recipientCount,
      },
    });
  }

  private async dispatchOne(
    rowId: string,
    channel: NotificationChannel,
    recipient: ResolvedRecipient,
    renderedBody: string,
    emailSubject: string,
  ): Promise<void> {
    if (channel === NotificationChannel.IN_APP) {
      await this.prisma.broadcastRecipient.update({
        where: { id: rowId },
        data: { status: DeliveryStatus.SENT, sentAt: new Date() },
      });
      return;
    }

    if (channel === NotificationChannel.PUSH) {
      await this.dispatchPush(rowId, recipient, renderedBody, emailSubject);
      return;
    }

    if (channel === NotificationChannel.WHATSAPP) {
      if (!recipient.phone) {
        await this.prisma.broadcastRecipient.update({
          where: { id: rowId },
          data: {
            status: DeliveryStatus.FAILED,
            errorMessage: 'No phone number on file',
          },
        });
        return;
      }
      const result = await this.whatsAppService.send(
        recipient.phone,
        renderedBody,
      );
      await this.prisma.broadcastRecipient.update({
        where: { id: rowId },
        data: result.success
          ? { status: DeliveryStatus.SENT, sentAt: new Date() }
          : { status: DeliveryStatus.FAILED, errorMessage: result.error },
      });
      return;
    }

    if (channel === NotificationChannel.SMS) {
      if (!recipient.phone) {
        await this.prisma.broadcastRecipient.update({
          where: { id: rowId },
          data: {
            status: DeliveryStatus.FAILED,
            errorMessage: 'No phone number on file',
          },
        });
        return;
      }
      const result = await this.smsService.send(recipient.phone, renderedBody);
      await this.prisma.broadcastRecipient.update({
        where: { id: rowId },
        data: result.success
          ? { status: DeliveryStatus.SENT, sentAt: new Date() }
          : { status: DeliveryStatus.FAILED, errorMessage: result.error },
      });
      return;
    }

    // EMAIL
    if (!recipient.email) {
      await this.prisma.broadcastRecipient.update({
        where: { id: rowId },
        data: {
          status: DeliveryStatus.FAILED,
          errorMessage: 'No email address on file',
        },
      });
      return;
    }
    const result = await this.emailService.send(
      recipient.email,
      emailSubject,
      `<p>${escapeHtml(renderedBody)}</p>`,
    );
    await this.prisma.broadcastRecipient.update({
      where: { id: rowId },
      data: result.success
        ? { status: DeliveryStatus.SENT, sentAt: new Date() }
        : { status: DeliveryStatus.FAILED, errorMessage: result.error },
    });
  }

  /**
   * A recipient may have zero, one, or several PushSubscription rows (one
   * per installed browser/device) — sent to all of them, SENT if at least
   * one succeeds. A subscription the push service reports as gone
   * (unsubscribed/expired) is deleted here rather than retried forever.
   */
  private async dispatchPush(
    rowId: string,
    recipient: ResolvedRecipient,
    renderedBody: string,
    title: string,
  ): Promise<void> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: {
        userId: recipient.recipientId,
        userType: recipientTypeToUserType(recipient.recipientType),
      },
    });

    if (subscriptions.length === 0) {
      await this.prisma.broadcastRecipient.update({
        where: { id: rowId },
        data: {
          status: DeliveryStatus.FAILED,
          errorMessage:
            'No push subscription on file (PWA not installed/permission not granted)',
        },
      });
      return;
    }

    let anySucceeded = false;
    let lastError: string | undefined;
    for (const sub of subscriptions) {
      const result = await this.pushService.send(
        sub.subscription as unknown as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        },
        { title, body: renderedBody },
      );
      if (result.success) {
        anySucceeded = true;
      } else {
        lastError = result.error;
        if (result.gone) {
          await this.prisma.pushSubscription
            .delete({ where: { id: sub.id } })
            .catch(() => undefined);
        }
      }
    }

    await this.prisma.broadcastRecipient.update({
      where: { id: rowId },
      data: anySucceeded
        ? { status: DeliveryStatus.SENT, sentAt: new Date() }
        : {
            status: DeliveryStatus.FAILED,
            errorMessage: lastError ?? 'Push send failed',
          },
    });
  }

  // -----------------------------------------------------------------------
  // Stage 12 — Admissions notifications
  // -----------------------------------------------------------------------

  /** Best-effort in-app notification to all ADMIN/VP staff that a new application has been submitted. */
  async notifyAdminNewApplication(event: {
    applicantName: string;
    intendedClassLevel: string;
  }): Promise<void> {
    const admins = await this.prisma.staffRole.findMany({
      where: { role: { in: ['ADMIN', 'VICE_PRINCIPAL'] } },
      select: { staffId: true },
    });
    if (admins.length === 0) return;

    const message = `New admission application from ${event.applicantName} for ${event.intendedClassLevel}.`;
    const broadcastLog = await this.createSystemBroadcastLog({
      targetRecipientType: RecipientType.STAFF,
      targetId: 'WHOLE_SCHOOL',
      channels: [NotificationChannel.IN_APP],
      templateId: 'SYSTEM',
      message,
      recipientCount: admins.length,
    });

    const recipients: ResolvedRecipient[] = admins.map((a) => ({
      recipientType: RecipientType.STAFF,
      recipientId: a.staffId,
      name: 'Admin',
      phone: null,
      email: null,
      context: { message },
    }));

    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels: [NotificationChannel.IN_APP],
      bodyTemplate: message,
      emailSubject: 'New admission application',
    });
  }

  /** Sends the guardian their ward's portal login credentials after a successful convert. */
  async sendAdmissionWelcome(event: {
    guardianEmail: string;
    guardianPhone?: string;
    guardianName: string;
    studentName: string;
    admissionNumber: string;
    temporaryPassword: string;
  }): Promise<void> {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { key: SYSTEM_TEMPLATE_KEYS.ADMISSION_WELCOME },
    });
    if (!template) {
      this.logger.error(
        'Missing ADMISSION_WELCOME system template — seeding may not have run yet.',
      );
      return;
    }

    const context = {
      guardian_name: event.guardianName,
      student_name: event.studentName,
      admission_number: event.admissionNumber,
      temporary_password: event.temporaryPassword,
    };

    const recipients: ResolvedRecipient[] = [
      {
        recipientType: RecipientType.GUARDIAN,
        recipientId: event.guardianEmail,
        name: event.guardianName,
        phone: event.guardianPhone ?? null,
        email: event.guardianEmail,
        context,
      },
    ];

    const channels = [NotificationChannel.SMS, NotificationChannel.EMAIL];
    const broadcastLog = await this.createSystemBroadcastLog({
      targetRecipientType: RecipientType.GUARDIAN,
      targetId: event.guardianEmail,
      channels,
      templateId: template.id,
      message: template.body,
      recipientCount: 1,
    });

    await this.fanOut({
      broadcastLogId: broadcastLog.id,
      recipients,
      channels,
      bodyTemplate: template.body,
      emailSubject: `Admission confirmation — ${event.studentName}`,
    });
  }

  /** Stage 26 — a staff member submitted a leave request; HR/Admin need to see it in their approval queue. */
  async sendLeaveRequestPendingAlert(event: {
    staffName: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    targetId: string;
  }): Promise<void> {
    await this.notifyStaffRoles({
      roles: ['HR_OFFICER', 'ADMIN'],
      templateKey: SYSTEM_TEMPLATE_KEYS.LEAVE_REQUEST_PENDING,
      context: {
        staff_name: event.staffName,
        leave_type: event.leaveType,
        from_date: event.fromDate,
        to_date: event.toDate,
      },
      emailSubject: `Leave request pending — ${event.staffName}`,
      targetId: event.targetId,
    });
  }

  /** Stage 26 — tells the requesting staff member their leave request was approved/rejected. */
  async sendLeaveDecidedNotice(event: {
    staffId: string;
    leaveType: string;
    fromDate: string;
    toDate: string;
    decision: 'APPROVED' | 'REJECTED';
    decisionNotes?: string;
    targetId: string;
  }): Promise<void> {
    await this.sendStaffNotice({
      staffIds: [event.staffId],
      templateKey: 'LEAVE_DECIDED',
      context: {
        leave_type: event.leaveType,
        from_date: event.fromDate,
        to_date: event.toDate,
        decision: event.decision.toLowerCase(),
        decision_notes: event.decisionNotes
          ? ` Note: ${event.decisionNotes}`
          : '',
      },
      emailSubject: `Your leave request has been ${event.decision.toLowerCase()}`,
      targetId: event.targetId,
    });
  }

  /** Stage 26 — a payroll run has been computed and is waiting for HR/Admin review before approval. */
  async sendPayrollReviewReadyAlert(event: {
    month: string;
    year: number;
    staffCount: number;
    targetId: string;
  }): Promise<void> {
    await this.notifyStaffRoles({
      roles: ['HR_OFFICER', 'ADMIN'],
      templateKey: SYSTEM_TEMPLATE_KEYS.PAYROLL_REVIEW_READY,
      context: {
        month: event.month,
        year: String(event.year),
        staff_count: String(event.staffCount),
      },
      emailSubject: `Payroll run ready for review — ${event.month} ${event.year}`,
      targetId: event.targetId,
    });
  }

  /** Stage 26 — a staff document (typically a fixed-term contract) is nearing its expiry date. */
  async sendStaffDocumentExpiringAlert(event: {
    staffName: string;
    documentType: string;
    expiryDate: string;
    thresholdLabel: string;
    targetId: string;
  }): Promise<void> {
    await this.notifyStaffRoles({
      roles: ['HR_OFFICER', 'ADMIN'],
      templateKey: SYSTEM_TEMPLATE_KEYS.STAFF_DOCUMENT_EXPIRING,
      context: {
        staff_name: event.staffName,
        document_type: event.documentType,
        expiry_date: event.expiryDate,
        threshold_label: event.thresholdLabel,
      },
      emailSubject: `Staff document nearing expiry — ${event.staffName}`,
      targetId: event.targetId,
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** RecipientType (GUARDIAN/STUDENT/STAFF) and UserType (STAFF/GUARDIAN/STUDENT/SYSTEM) share three matching names — PushSubscription is keyed by the latter since it's also used by non-broadcast contexts (e.g. a guardian subscribing directly). */
function recipientTypeToUserType(type: RecipientType): UserType {
  return type;
}
