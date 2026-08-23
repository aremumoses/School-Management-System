import { Injectable } from '@nestjs/common';
import {
  DeliveryStatus,
  NotificationChannel,
  RecipientType,
  UserType,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import {
  NotificationItem,
  NotificationSummary,
} from './dto/notification-summary.dto';

const ITEMS_PER_SOURCE = 20;
const ITEMS_RETURNED = 20;

/**
 * Feeds the shared notification bell (frontend prompt §1: "listing recent
 * notices and messages... unread items visually distinct"). Deliberately
 * NOT the Notice board (§2) — a Notice has no per-user read state at all
 * (see its schema comment), so "notices" here means broadcasts delivered
 * to you via the always-included IN_APP channel, which DO have real
 * sent/read tracking — that's the only data this app can honestly show as
 * "unread" in a bell. The Notice board itself is a separate, persistent,
 * unread-agnostic browsable feed with its own nav entry.
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: RequestUser): Promise<NotificationSummary> {
    const recipientType = this.recipientTypeFor(user);

    const broadcastRows = await this.prisma.broadcastRecipient.findMany({
      where: {
        recipientType,
        recipientId: user.id,
        channel: NotificationChannel.IN_APP,
      },
      include: { broadcastLog: true },
      orderBy: { createdAt: 'desc' },
      take: ITEMS_PER_SOURCE,
    });

    const messageItems = await this.recentMessages(user);

    const items: NotificationItem[] = [
      ...broadcastRows.map((r) => ({
        type: 'BROADCAST' as const,
        id: r.broadcastLogId,
        title: 'School notice',
        preview: r.broadcastLog.message,
        createdAt: r.createdAt,
        read: r.status === DeliveryStatus.READ,
      })),
      ...messageItems,
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, ITEMS_RETURNED);

    return { unreadCount: items.filter((i) => !i.read).length, items };
  }

  /** Called when the bell dropdown opens — docs prompt: "clears on opening". */
  async markAllRead(user: RequestUser): Promise<void> {
    const recipientType = this.recipientTypeFor(user);
    await this.prisma.broadcastRecipient.updateMany({
      where: {
        recipientType,
        recipientId: user.id,
        channel: NotificationChannel.IN_APP,
        status: { not: DeliveryStatus.READ },
      },
      data: { status: DeliveryStatus.READ, readAt: new Date() },
    });

    if (
      user.userType === 'STAFF' ||
      user.userType === 'GUARDIAN' ||
      user.userType === 'STUDENT'
    ) {
      const myType: UserType = user.userType;
      const where = this.conversationWhereFor(user);
      await this.prisma.message.updateMany({
        where: {
          conversation: where,
          senderType: { not: myType },
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    }
  }

  /** The threads this user participates in — a STUDENT only their direct (guardianId-NULL) ones, see ConversationsService. */
  private conversationWhereFor(user: RequestUser) {
    return user.userType === 'GUARDIAN'
      ? { guardianId: user.id }
      : user.userType === 'STUDENT'
        ? { studentId: user.id, guardianId: null }
        : { staffId: user.id };
  }

  private async recentMessages(user: RequestUser): Promise<NotificationItem[]> {
    if (
      user.userType !== 'STAFF' &&
      user.userType !== 'GUARDIAN' &&
      user.userType !== 'STUDENT'
    ) {
      return [];
    }

    const myType: UserType = user.userType;
    const where = this.conversationWhereFor(user);

    const messages = await this.prisma.message.findMany({
      where: { conversation: where, senderType: { not: myType } },
      include: {
        conversation: {
          include: {
            staff: { select: { firstName: true, lastName: true } },
            guardian: { select: { firstName: true, lastName: true } },
            student: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: ITEMS_PER_SOURCE,
    });

    return messages.map((m) => ({
      type: 'MESSAGE' as const,
      id: m.id,
      conversationId: m.conversationId,
      // The other party's name: staff for guardian/student viewers; for a
      // staff viewer, the guardian on a guardian thread, else the student
      // on a direct (Stage 15) thread.
      title:
        myType === 'GUARDIAN' || myType === 'STUDENT'
          ? `${m.conversation.staff.firstName} ${m.conversation.staff.lastName}`
          : m.conversation.guardian
            ? `${m.conversation.guardian.firstName} ${m.conversation.guardian.lastName}`
            : `${m.conversation.student.firstName} ${m.conversation.student.lastName}`,
      preview: m.body,
      createdAt: m.createdAt,
      read: m.readAt !== null,
    }));
  }

  private recipientTypeFor(user: RequestUser): RecipientType {
    if (user.userType === 'STAFF') return RecipientType.STAFF;
    if (user.userType === 'GUARDIAN') return RecipientType.GUARDIAN;
    return RecipientType.STUDENT;
  }
}
