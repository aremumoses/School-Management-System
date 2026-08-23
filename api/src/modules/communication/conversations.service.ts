import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Conversation, Message, UserType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import type { RequestUser } from '../../common/types/auth.types';
import { ClassScopeService } from './class-scope.service';
import {
  CreateConversationDto,
  CreateMessageDto,
} from './dto/conversation.dto';

export interface ConversationListItem {
  id: string;
  staffName: string;
  /** null for a direct staff<->student thread (Stage 15) */
  guardianName: string | null;
  studentName: string;
  lastMessage: { body: string; senderType: UserType; createdAt: Date } | null;
  unreadCount: number;
  updatedAt: Date;
}

export interface ConversationDetail {
  id: string;
  staffId: string;
  guardianId: string | null;
  studentId: string;
  staffName: string;
  guardianName: string | null;
  studentName: string;
  createdAt: Date;
  updatedAt: Date;
  messages: Message[];
}

const PARTICIPANT_INCLUDE = {
  staff: { select: { firstName: true, lastName: true } },
  guardian: { select: { firstName: true, lastName: true } },
  student: { select: { firstName: true, lastName: true } },
} as const;

/** STAFF stays STAFF; GUARDIAN and STUDENT map to themselves. */
function participantType(user: RequestUser): UserType {
  return user.userType === 'GUARDIAN' || user.userType === 'STUDENT'
    ? user.userType
    : 'STAFF';
}

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly classScope: ClassScopeService,
  ) {}

  /**
   * Every thread the current user (staff, guardian, or student) is a
   * participant in, with the other party's name, a last-message preview,
   * and an unread count — a bare list of Conversation rows (id/staffId/
   * guardianId/studentId) has nothing a conversation-list UI could
   * actually render.
   *
   * A STUDENT sees only their direct guardianId-NULL threads — a
   * guardian's threads about the same student are the guardian's, not the
   * student's, and never appear here.
   */
  async list(user: RequestUser): Promise<ConversationListItem[]> {
    const myType = participantType(user);
    const where =
      myType === 'GUARDIAN'
        ? { guardianId: user.id }
        : myType === 'STUDENT'
          ? { studentId: user.id, guardianId: null }
          : { staffId: user.id };

    const conversations = await this.prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        ...PARTICIPANT_INCLUDE,
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (conversations.length === 0) return [];

    // "Unread" = a message someone other than me sent that no one has
    // viewed yet — sender-type-based (not senderId) so a staff member's
    // count covers both guardian and student threads in one query.
    const unreadGroups = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        conversationId: { in: conversations.map((c) => c.id) },
        senderType: { not: myType },
        readAt: null,
      },
      _count: { _all: true },
    });
    const unreadByConversation = new Map(
      unreadGroups.map((g) => [g.conversationId, g._count._all]),
    );

    return conversations.map((c) => ({
      id: c.id,
      staffName: `${c.staff.firstName} ${c.staff.lastName}`,
      guardianName: c.guardian
        ? `${c.guardian.firstName} ${c.guardian.lastName}`
        : null,
      studentName: `${c.student.firstName} ${c.student.lastName}`,
      lastMessage: c.messages[0]
        ? {
            body: c.messages[0].body,
            senderType: c.messages[0].senderType,
            createdAt: c.messages[0].createdAt,
          }
        : null,
      unreadCount: unreadByConversation.get(c.id) ?? 0,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Viewing a thread you're a real participant in marks the other party's
   * unread messages as read (docs prompt's notification-bell "clears on
   * opening" expectation extends naturally to a thread itself) — but NOT
   * when an ADMIN/VICE_PRINCIPAL is viewing for oversight only, since that
   * would falsely mark messages "read" before the actual recipient ever
   * saw them.
   */
  async getOrThrow(id: string, user: RequestUser): Promise<ConversationDetail> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id },
      include: PARTICIPANT_INCLUDE,
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    if (this.isParticipant(conversation, user)) {
      const myType = participantType(user);
      await this.prisma.message.updateMany({
        where: {
          conversationId: id,
          senderType: { not: myType },
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    } else if (
      !user.roles.includes('ADMIN') &&
      !user.roles.includes('VICE_PRINCIPAL')
    ) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      id: conversation.id,
      staffId: conversation.staffId,
      guardianId: conversation.guardianId,
      studentId: conversation.studentId,
      staffName: `${conversation.staff.firstName} ${conversation.staff.lastName}`,
      guardianName: conversation.guardian
        ? `${conversation.guardian.firstName} ${conversation.guardian.lastName}`
        : null,
      studentName: `${conversation.student.firstName} ${conversation.student.lastName}`,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages,
    };
  }

  /**
   * Two entry points share this method (branching on the caller's type):
   *
   * STAFF — the original Stage 7 flow (docs §6, staff-initiated): starts a
   * thread with a guardian about one of their wards.
   * CLASS_TEACHER/SUBJECT_TEACHER are scoped to their own class, same rule
   * as broadcast targeting; other staff roles are unscoped.
   *
   * STUDENT — Stage 15: starts a direct thread with one of their OWN
   * subject/class teachers. The scoping check is the same
   * ClassScopeService.assertOwnClassScope used for the staff side, just
   * evaluated from the other end: "would this teacher be in-scope for this
   * student's arms" — with no unscoped-role bypass, because the rule is
   * "your own teacher", not "any staff member" (docs/06 Messages line).
   */
  async create(
    dto: CreateConversationDto,
    user: RequestUser,
  ): Promise<ConversationDetail> {
    if (user.userType === 'STUDENT') {
      return this.createAsStudent(dto, user);
    }
    return this.createAsStaff(dto, user);
  }

  private async createAsStaff(
    dto: CreateConversationDto,
    user: RequestUser,
  ): Promise<ConversationDetail> {
    if (!dto.guardianId || !dto.studentId) {
      throw new BadRequestException(
        'guardianId and studentId are required to start a conversation with a guardian',
      );
    }
    const link = await this.prisma.studentGuardian.findUnique({
      where: {
        studentId_guardianId: {
          studentId: dto.studentId,
          guardianId: dto.guardianId,
        },
      },
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
    });
    if (!link) {
      throw new NotFoundException(
        'This guardian is not linked to this student',
      );
    }

    if (!this.classScope.isUnscoped(user)) {
      await this.classScope.assertOwnClassScope(
        link.student.enrollments.map((e) => e.arm),
        user,
      );
    }

    let conversation: Conversation;
    try {
      conversation = await this.prisma.conversation.upsert({
        where: {
          staffId_guardianId_studentId: {
            staffId: user.id,
            guardianId: dto.guardianId,
            studentId: dto.studentId,
          },
        },
        update: {},
        create: {
          staffId: user.id,
          guardianId: dto.guardianId,
          studentId: dto.studentId,
        },
      });
    } catch (error) {
      return translatePrismaError(error, 'Could not start this conversation');
    }

    await this.appendMessage(conversation.id, 'STAFF', user.id, dto.message);
    return this.getOrThrow(conversation.id, user);
  }

  /**
   * The teachers a STUDENT may start a thread with — their arms' class
   * teachers plus everyone with a current-term TeacherAssignment on their
   * class. Feeds the /student/messages "new conversation" picker; the same
   * facts assertOwnClassScope checks at create time, read in list form.
   */
  async listMyTeachers(
    user: RequestUser,
  ): Promise<{ staffId: string; name: string; label: string }[]> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId: user.id, status: 'ACTIVE' },
      include: {
        arm: {
          include: {
            classTeacher: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    const classIds = [...new Set(enrollments.map((e) => e.classId))];

    const byStaff = new Map<
      string,
      { staffId: string; name: string; labels: string[] }
    >();
    for (const enrollment of enrollments) {
      const { classTeacherId, classTeacher } = enrollment.arm;
      if (classTeacherId && classTeacher) {
        byStaff.set(classTeacherId, {
          staffId: classTeacherId,
          name: `${classTeacher.firstName} ${classTeacher.lastName}`,
          labels: ['Class Teacher'],
        });
      }
    }

    const currentTerm = await this.prisma.term.findFirst({
      where: { isCurrent: true },
    });
    if (currentTerm && classIds.length > 0) {
      const assignments = await this.prisma.teacherAssignment.findMany({
        where: {
          termId: currentTerm.id,
          classSubject: { classId: { in: classIds } },
        },
        include: {
          staff: {
            select: { firstName: true, lastName: true, isActive: true },
          },
          classSubject: { include: { subject: { select: { name: true } } } },
        },
      });
      for (const assignment of assignments) {
        if (!assignment.staff.isActive) continue;
        const existing = byStaff.get(assignment.staffId);
        const subjectName = assignment.classSubject.subject.name;
        if (existing) {
          if (!existing.labels.includes(subjectName)) {
            existing.labels.push(subjectName);
          }
        } else {
          byStaff.set(assignment.staffId, {
            staffId: assignment.staffId,
            name: `${assignment.staff.firstName} ${assignment.staff.lastName}`,
            labels: [subjectName],
          });
        }
      }
    }

    return [...byStaff.values()]
      .map(({ staffId, name, labels }) => ({
        staffId,
        name,
        label: labels.join(', '),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private async createAsStudent(
    dto: CreateConversationDto,
    user: RequestUser,
  ): Promise<ConversationDetail> {
    if (!dto.staffId) {
      throw new BadRequestException(
        'staffId is required to start a conversation with a teacher',
      );
    }

    const [enrollments, targetStaff] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { studentId: user.id, status: 'ACTIVE' },
        include: { arm: true },
      }),
      this.prisma.staff.findUnique({
        where: { id: dto.staffId },
        include: { roles: true },
      }),
    ]);
    if (!targetStaff || !targetStaff.isActive) {
      throw new NotFoundException('Teacher not found');
    }

    // Same own-class-scope check the staff side uses, evaluated for the
    // target teacher against this student's arms. Deliberately no
    // isUnscoped() bypass — an ADMIN/HOD who doesn't actually teach this
    // student is out of bounds for student-initiated messaging.
    const teacherAsUser: RequestUser = {
      id: targetStaff.id,
      userType: 'STAFF',
      roles: targetStaff.roles.map((r) => r.role),
    };
    try {
      await this.classScope.assertOwnClassScope(
        enrollments.map((e) => e.arm),
        teacherAsUser,
      );
    } catch {
      throw new ForbiddenException(
        'You can only message your own subject or class teachers',
      );
    }

    // Find-or-create (no Prisma upsert here — the composite unique can't
    // address rows where guardianId IS NULL; a partial unique index in the
    // Stage 15 migration backstops the rare race).
    let conversation = await this.prisma.conversation.findFirst({
      where: { staffId: dto.staffId, studentId: user.id, guardianId: null },
    });
    if (!conversation) {
      try {
        conversation = await this.prisma.conversation.create({
          data: { staffId: dto.staffId, studentId: user.id },
        });
      } catch (error) {
        return translatePrismaError(error, 'Could not start this conversation');
      }
    }

    await this.appendMessage(conversation.id, 'STUDENT', user.id, dto.message);
    return this.getOrThrow(conversation.id, user);
  }

  async addMessage(
    conversationId: string,
    dto: CreateMessageDto,
    user: RequestUser,
  ): Promise<Message> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (!this.isParticipant(conversation, user)) {
      throw new ForbiddenException(
        'You are not a participant in this conversation',
      );
    }

    return this.appendMessage(
      conversationId,
      participantType(user),
      user.id,
      dto.body,
    );
  }

  /**
   * Stage 28 — an inbound WhatsApp reply, routed by the sender's phone
   * number (docs §6: "so a teacher doesn't need to separately monitor
   * WhatsApp"). A guardian's phone isn't unique to one conversation the way
   * a normal reply is scoped to a thread — a raw WhatsApp text carries no
   * thread-context back through the BSP webhook in the general case — so
   * this picks their most-recently-active conversation as the pragmatic
   * best guess. Returns null (logged, not thrown) for the same
   * "webhook must never 500 on a shape it can't resolve" reasoning as every
   * other best-effort notification path in this file.
   */
  async appendInboundWhatsAppMessage(
    phone: string,
    body: string,
  ): Promise<Message | null> {
    const guardian = await this.findGuardianByPhone(phone);
    if (!guardian) {
      this.logger.warn(
        `Inbound WhatsApp message from unrecognized phone ${phone} — no matching guardian, dropped.`,
      );
      return null;
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { guardianId: guardian.id },
      orderBy: { updatedAt: 'desc' },
    });
    if (!conversation) {
      this.logger.warn(
        `Inbound WhatsApp message from ${guardian.firstName} ${guardian.lastName} (${phone}) — no existing conversation thread to route it into, dropped.`,
      );
      return null;
    }

    return this.appendMessage(conversation.id, 'GUARDIAN', guardian.id, body);
  }

  /** Same phone normalization as SmsService/WhatsAppProviderService — stored numbers are "+234…"/"0…"/"234…", inbound webhook numbers arrive in international-without-plus form. */
  private async findGuardianByPhone(rawPhone: string) {
    const digitsOnly = rawPhone.replace(/[^\d]/g, '');
    const local = digitsOnly.startsWith('234')
      ? `0${digitsOnly.slice(3)}`
      : digitsOnly;
    const international = digitsOnly.startsWith('0')
      ? `234${digitsOnly.slice(1)}`
      : digitsOnly;

    return this.prisma.guardian.findFirst({
      where: {
        OR: [
          { phone: rawPhone },
          { phone: digitsOnly },
          { phone: local },
          { phone: `+${international}` },
          { phone: international },
        ],
      },
    });
  }

  private async appendMessage(
    conversationId: string,
    senderType: UserType,
    senderId: string,
    body: string,
  ): Promise<Message> {
    const message = await this.prisma.message.create({
      data: { conversationId, senderType, senderId, body },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
    return message;
  }

  /**
   * A STUDENT is a participant only in their direct (guardianId-NULL)
   * threads — being the *subject* of a staff<->guardian thread does not
   * make them a participant in it.
   */
  private isParticipant(
    conversation: {
      staffId: string;
      guardianId: string | null;
      studentId: string;
    },
    user: RequestUser,
  ): boolean {
    return (
      (user.userType === 'STAFF' && conversation.staffId === user.id) ||
      (user.userType === 'GUARDIAN' && conversation.guardianId === user.id) ||
      (user.userType === 'STUDENT' &&
        conversation.studentId === user.id &&
        conversation.guardianId === null)
    );
  }
}
