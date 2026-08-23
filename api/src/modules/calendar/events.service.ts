import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Event, EventRsvp, UserType } from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import type { RequestUser } from '../../common/types/auth.types';
import {
  CreateEventDto,
  QueryCalendarDto,
  QueryEventsDto,
  RsvpDto,
  UpdateEventDto,
} from './dto/event.dto';

export interface EventWithTally extends Event {
  rsvpTally: { yes: number; no: number; maybe: number };
  myResponse: EventRsvp['response'] | null;
}

export interface CalendarEntry {
  type: 'EVENT' | 'TERM';
  id: string;
  title: string;
  startDate: Date;
  endDate: Date | null;
  category: string | null;
  rsvpEnabled: boolean;
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async create(dto: CreateEventDto, user: RequestUser): Promise<Event> {
    this.assertValidDateRange(
      new Date(dto.startDate),
      dto.endDate ? new Date(dto.endDate) : null,
    );

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        category: dto.category,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        rsvpEnabled: dto.rsvpEnabled ?? false,
        createdByStaffId: user.id,
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'EVENT_CREATED',
      entityType: 'Event',
      entityId: event.id,
      afterJson: {
        title: event.title,
        category: event.category,
        startDate: event.startDate,
      },
    });

    return event;
  }

  async update(
    id: string,
    dto: UpdateEventDto,
    user: RequestUser,
  ): Promise<Event> {
    const existing = await this.getRawOrThrow(id);
    this.assertValidDateRange(
      dto.startDate ? new Date(dto.startDate) : existing.startDate,
      dto.endDate ? new Date(dto.endDate) : existing.endDate,
    );

    let updated: Event;
    try {
      updated = await this.prisma.event.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          category: dto.category,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          rsvpEnabled: dto.rsvpEnabled,
        },
      });
    } catch (error) {
      return translatePrismaError(error, 'Event not found');
    }

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'EVENT_UPDATED',
      entityType: 'Event',
      entityId: id,
      beforeJson: { title: existing.title, startDate: existing.startDate },
      afterJson: { title: updated.title, startDate: updated.startDate },
    });

    return updated;
  }

  async remove(id: string, user: RequestUser): Promise<void> {
    const existing = await this.getRawOrThrow(id);
    await this.prisma.event.delete({ where: { id } });
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'EVENT_DELETED',
      entityType: 'Event',
      entityId: id,
      beforeJson: { title: existing.title },
    });
  }

  list(query: QueryEventsDto): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: query.category ? { category: query.category } : undefined,
      orderBy: { startDate: 'asc' },
    });
  }

  async getOrThrow(id: string, user: RequestUser): Promise<EventWithTally> {
    const event = await this.getRawOrThrow(id);
    return this.withTally(event, user);
  }

  /** docs prompt §2 — "for the organizer to see responses": full respondent list, not just the tally. */
  async getRsvps(
    id: string,
    user: RequestUser,
  ): Promise<(EventRsvp & { name: string })[]> {
    const event = await this.getRawOrThrow(id);
    if (event.createdByStaffId !== user.id && !this.isUnscoped(user)) {
      throw new ForbiddenException(
        'Only the organizer can view individual responses.',
      );
    }

    const rsvps = await this.prisma.eventRsvp.findMany({
      where: { eventId: id },
      orderBy: { createdAt: 'asc' },
    });

    const staffIds = rsvps
      .filter((r) => r.responderType === 'STAFF')
      .map((r) => r.responderId);
    const guardianIds = rsvps
      .filter((r) => r.responderType === 'GUARDIAN')
      .map((r) => r.responderId);
    // `{in: []}` matches nothing and is safe to query unconditionally —
    // no need to special-case the empty-array branch with a Promise.resolve.
    const [staff, guardians] = await Promise.all([
      this.prisma.staff.findMany({ where: { id: { in: staffIds } } }),
      this.prisma.guardian.findMany({ where: { id: { in: guardianIds } } }),
    ]);
    const nameById = new Map<string, string>();
    staff.forEach((s) => nameById.set(s.id, `${s.firstName} ${s.lastName}`));
    guardians.forEach((g) =>
      nameById.set(g.id, `${g.firstName} ${g.lastName}`),
    );

    return rsvps.map((r) => ({
      ...r,
      name: nameById.get(r.responderId) ?? 'Unknown',
    }));
  }

  /** docs prompt §2 — "guardians/staff to respond" — STUDENT deliberately excluded, enforced via @Roles() at the controller. */
  async rsvp(id: string, dto: RsvpDto, user: RequestUser): Promise<EventRsvp> {
    const event = await this.getRawOrThrow(id);
    if (!event.rsvpEnabled) {
      throw new ForbiddenException('RSVP is not enabled for this event.');
    }

    const responderType: UserType =
      user.userType === 'GUARDIAN' ? 'GUARDIAN' : 'STAFF';

    const rsvp = await this.prisma.eventRsvp.upsert({
      where: {
        eventId_responderType_responderId: {
          eventId: id,
          responderType,
          responderId: user.id,
        },
      },
      update: { response: dto.response },
      create: {
        eventId: id,
        responderType,
        responderId: user.id,
        response: dto.response,
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: responderType === 'GUARDIAN' ? 'GUARDIAN' : 'STAFF',
      actorRole: user.roles.join(','),
      action: 'EVENT_RSVP',
      entityType: 'Event',
      entityId: id,
      afterJson: { response: dto.response },
    });

    return rsvp;
  }

  /**
   * docs prompt §2 — a unified view combining ad-hoc Events with the
   * structural Term boundaries (start/end of term) already tracked
   * elsewhere, so the frontend doesn't need to separately fetch and merge
   * two endpoints for one calendar.
   */
  async getCalendar(query: QueryCalendarDto): Promise<CalendarEntry[]> {
    const from = new Date(query.from);
    const to = new Date(query.to);

    const [events, terms] = await Promise.all([
      this.prisma.event.findMany({
        where: {
          startDate: { lte: to },
          OR: [
            { endDate: { gte: from } },
            { endDate: null, startDate: { gte: from } },
          ],
        },
      }),
      this.prisma.term.findMany({
        where: { startDate: { lte: to }, endDate: { gte: from } },
        include: { session: true },
      }),
    ]);

    const entries: CalendarEntry[] = [
      ...events.map((e) => ({
        type: 'EVENT' as const,
        id: e.id,
        title: e.title,
        startDate: e.startDate,
        endDate: e.endDate,
        category: e.category,
        rsvpEnabled: e.rsvpEnabled,
      })),
      ...terms.map((t) => ({
        type: 'TERM' as const,
        id: t.id,
        title: `${t.name} Term (${t.session.name})`,
        startDate: t.startDate,
        endDate: t.endDate,
        category: null,
        rsvpEnabled: false,
      })),
    ];

    return entries.sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime(),
    );
  }

  // -------------------------------------------------------------------

  private async withTally(
    event: Event,
    user: RequestUser,
  ): Promise<EventWithTally> {
    const rsvps = await this.prisma.eventRsvp.findMany({
      where: { eventId: event.id },
    });
    const tally = { yes: 0, no: 0, maybe: 0 };
    for (const r of rsvps) {
      if (r.response === 'YES') tally.yes += 1;
      else if (r.response === 'NO') tally.no += 1;
      else tally.maybe += 1;
    }

    const responderType: UserType =
      user.userType === 'GUARDIAN' ? 'GUARDIAN' : 'STAFF';
    const mine = rsvps.find(
      (r) => r.responderType === responderType && r.responderId === user.id,
    );

    return { ...event, rsvpTally: tally, myResponse: mine?.response ?? null };
  }

  private async getRawOrThrow(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  /** Neither DTO validates this at the field level (it's a cross-field rule) — reject a nonsensical range before it corrupts the calendar's day-bucketing. */
  private assertValidDateRange(startDate: Date, endDate?: Date | null): void {
    if (endDate && endDate < startDate) {
      throw new BadRequestException('endDate cannot be before startDate.');
    }
  }

  private isUnscoped(user: RequestUser): boolean {
    return (
      user.roles.includes('ADMIN') || user.roles.includes('VICE_PRINCIPAL')
    );
  }
}
