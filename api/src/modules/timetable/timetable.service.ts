import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Period } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import type { RequestUser } from '../../common/types/auth.types';
import { LeaveService, type ActiveLeaveInfo } from '../hr/leave.service';
import {
  CreatePeriodDto,
  CreateTimetableEntryDto,
  UpdatePeriodDto,
  UpdateTimetableEntryDto,
} from './dto/timetable.dto';

const DAY_NAMES = [
  '', // dayOfWeek is 1-based
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export interface TimetableEntryDto {
  id: string;
  armId: string;
  armLabel: string;
  classSubjectId: string;
  subjectName: string;
  teacherId: string | null;
  teacherName: string | null;
  periodId: string;
  dayOfWeek: number;
  termId: string;
  room: string | null;
}

export interface TimetableGridDto {
  termId: string;
  periods: Period[];
  entries: TimetableEntryDto[];
  // Only populated by getStaffGrid — Stage 26's "flag the covered period on
  // the teacher's TimetableEntry view" (docs/12 §3 sample workflow) so
  // Admin can see "this teacher is out, arrange cover." A read-side join,
  // not a write to the timetable itself.
  activeLeave?: ActiveLeaveInfo | null;
}

/** What create/update pass to the shared conflict checker — one shape, both paths. */
interface SlotCandidate {
  armId: string;
  classSubjectId: string;
  periodId: string;
  dayOfWeek: number;
  termId: string;
  room?: string | null;
  /** Set on update so an entry doesn't conflict with itself. */
  excludeEntryId?: string;
}

const ENTRY_INCLUDE = {
  arm: { include: { class: true } },
  classSubject: {
    include: {
      subject: true,
      teacherAssignments: {
        include: {
          staff: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class TimetableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaveService: LeaveService,
  ) {}

  // -------------------------------------------------------------------
  // Periods (school-wide slot config)
  // -------------------------------------------------------------------

  listPeriods(): Promise<Period[]> {
    return this.prisma.period.findMany({
      orderBy: [{ sortOrder: 'asc' }, { startTime: 'asc' }],
    });
  }

  async createPeriod(dto: CreatePeriodDto): Promise<Period> {
    try {
      return await this.prisma.period.create({
        data: {
          name: dto.name,
          startTime: dto.startTime,
          endTime: dto.endTime,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A period with this name already exists',
      );
    }
  }

  async updatePeriod(id: string, dto: UpdatePeriodDto): Promise<Period> {
    await this.getPeriodOrThrow(id);
    try {
      return await this.prisma.period.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.startTime !== undefined && { startTime: dto.startTime }),
          ...(dto.endTime !== undefined && { endTime: dto.endTime }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'A period with this name already exists',
      );
    }
  }

  async deletePeriod(id: string): Promise<void> {
    await this.getPeriodOrThrow(id);
    try {
      await this.prisma.period.delete({ where: { id } });
    } catch (error) {
      translatePrismaError(
        error,
        'This period is still used by timetable entries — remove those first',
      );
    }
  }

  private async getPeriodOrThrow(id: string): Promise<Period> {
    const period = await this.prisma.period.findUnique({ where: { id } });
    if (!period) throw new NotFoundException('Period not found');
    return period;
  }

  // -------------------------------------------------------------------
  // Entries
  // -------------------------------------------------------------------

  async createEntry(dto: CreateTimetableEntryDto): Promise<TimetableEntryDto> {
    await this.assertEntryValid(dto);
    await this.assertNoConflicts(dto);

    const entry = await this.prisma.timetableEntry.create({
      data: {
        armId: dto.armId,
        classSubjectId: dto.classSubjectId,
        periodId: dto.periodId,
        dayOfWeek: dto.dayOfWeek,
        termId: dto.termId,
        room: dto.room?.trim() || null,
      },
      include: ENTRY_INCLUDE,
    });
    return this.toEntryDto(entry, dto.termId);
  }

  async updateEntry(
    id: string,
    dto: UpdateTimetableEntryDto,
  ): Promise<TimetableEntryDto> {
    const existing = await this.prisma.timetableEntry.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Timetable entry not found');

    // A conflict introduced via update is just as real as one introduced
    // via create — merge the patch onto the existing row and re-check the
    // full slot through the same shared validator.
    const candidate: SlotCandidate = {
      armId: dto.armId ?? existing.armId,
      classSubjectId: dto.classSubjectId ?? existing.classSubjectId,
      periodId: dto.periodId ?? existing.periodId,
      dayOfWeek: dto.dayOfWeek ?? existing.dayOfWeek,
      termId: dto.termId ?? existing.termId,
      room: dto.room !== undefined ? dto.room : existing.room,
      excludeEntryId: id,
    };
    await this.assertEntryValid(candidate);
    await this.assertNoConflicts(candidate);

    const entry = await this.prisma.timetableEntry.update({
      where: { id },
      data: {
        armId: candidate.armId,
        classSubjectId: candidate.classSubjectId,
        periodId: candidate.periodId,
        dayOfWeek: candidate.dayOfWeek,
        termId: candidate.termId,
        room:
          typeof candidate.room === 'string'
            ? candidate.room.trim() || null
            : null,
      },
      include: ENTRY_INCLUDE,
    });
    return this.toEntryDto(entry, candidate.termId);
  }

  async deleteEntry(id: string): Promise<void> {
    const existing = await this.prisma.timetableEntry.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Timetable entry not found');
    await this.prisma.timetableEntry.delete({ where: { id } });
  }

  // -------------------------------------------------------------------
  // Grids
  // -------------------------------------------------------------------

  async getArmGrid(
    armId: string,
    termId: string | undefined,
    user: RequestUser,
  ): Promise<TimetableGridDto> {
    const arm = await this.prisma.arm.findUnique({ where: { id: armId } });
    if (!arm) throw new NotFoundException('Arm not found');
    const resolvedTermId = await this.resolveTermId(termId);

    // Students/parents may only view their own (ward's) arm; staff any.
    if (user.userType === 'STUDENT') {
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId: user.id, armId, status: 'ACTIVE' },
      });
      if (!enrollment) {
        throw new ForbiddenException('You can only view your own timetable');
      }
    } else if (user.userType === 'GUARDIAN') {
      const wardEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          armId,
          status: 'ACTIVE',
          student: { guardians: { some: { guardianId: user.id } } },
        },
      });
      if (!wardEnrollment) {
        throw new ForbiddenException(
          "You can only view your own ward's timetable",
        );
      }
    }

    const [periods, entries] = await Promise.all([
      this.listPeriods(),
      this.prisma.timetableEntry.findMany({
        where: { armId, termId: resolvedTermId },
        include: ENTRY_INCLUDE,
      }),
    ]);

    return {
      termId: resolvedTermId,
      periods,
      entries: entries.map((e) => this.toEntryDto(e, resolvedTermId)),
    };
  }

  /** The student's own grid, resolved from their current ACTIVE enrollment — no armId needed. */
  async getMyGrid(
    termId: string | undefined,
    user: RequestUser,
  ): Promise<TimetableGridDto & { armLabel: string | null }> {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: user.id, status: 'ACTIVE' },
      include: { arm: { include: { class: true } } },
    });
    if (!enrollment) {
      const resolvedTermId = await this.resolveTermId(termId);
      return {
        termId: resolvedTermId,
        periods: await this.listPeriods(),
        entries: [],
        armLabel: null,
      };
    }
    const grid = await this.getArmGrid(enrollment.armId, termId, user);
    return {
      ...grid,
      armLabel: `${enrollment.arm.class.name} ${enrollment.arm.name}`,
    };
  }

  /** Every arm the teacher is scheduled in, merged into one week view. */
  async getStaffGrid(
    staffId: string,
    termId: string | undefined,
  ): Promise<TimetableGridDto> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
    });
    if (!staff) throw new NotFoundException('Staff member not found');
    const resolvedTermId = await this.resolveTermId(termId);

    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { staffId, termId: resolvedTermId },
      select: { classSubjectId: true },
    });
    const classSubjectIds = assignments.map((a) => a.classSubjectId);

    const [periods, entries, activeLeave] = await Promise.all([
      this.listPeriods(),
      classSubjectIds.length === 0
        ? Promise.resolve([])
        : this.prisma.timetableEntry.findMany({
            where: {
              termId: resolvedTermId,
              classSubjectId: { in: classSubjectIds },
            },
            include: ENTRY_INCLUDE,
          }),
      this.leaveService.getCurrentApprovedLeave(staffId),
    ]);

    return {
      termId: resolvedTermId,
      periods,
      entries: entries.map((e) => this.toEntryDto(e, resolvedTermId)),
      activeLeave,
    };
  }

  // -------------------------------------------------------------------
  // Shared validation
  // -------------------------------------------------------------------

  /** Referential sanity: the slot's pieces exist and fit together. */
  private async assertEntryValid(candidate: SlotCandidate): Promise<void> {
    const [arm, classSubject, period, term] = await Promise.all([
      this.prisma.arm.findUnique({
        where: { id: candidate.armId },
        include: { class: true },
      }),
      this.prisma.classSubject.findUnique({
        where: { id: candidate.classSubjectId },
        include: { subject: true },
      }),
      this.prisma.period.findUnique({ where: { id: candidate.periodId } }),
      this.prisma.term.findUnique({ where: { id: candidate.termId } }),
    ]);
    if (!arm) throw new NotFoundException('Arm not found');
    if (!classSubject) throw new NotFoundException('ClassSubject not found');
    if (!period) throw new NotFoundException('Period not found');
    if (!term) throw new NotFoundException('Term not found');

    if (classSubject.classId !== arm.classId) {
      throw new BadRequestException(
        `${classSubject.subject.name} is not on ${arm.class.name}'s curriculum — map it to the class first`,
      );
    }
  }

  /**
   * The core Stage 16 requirement — one shared checker for create AND
   * update. Rejects with a message naming exactly what's double-booked:
   * the arm's existing entry, the teacher's other class, or the room.
   */
  private async assertNoConflicts(candidate: SlotCandidate): Promise<void> {
    const dayName =
      DAY_NAMES[candidate.dayOfWeek] ?? `day ${candidate.dayOfWeek}`;

    // Everything already scheduled at this term+day+period, one query —
    // arm, teacher, and room clashes are all subsets of this slot.
    const slotEntries = await this.prisma.timetableEntry.findMany({
      where: {
        termId: candidate.termId,
        dayOfWeek: candidate.dayOfWeek,
        periodId: candidate.periodId,
        ...(candidate.excludeEntryId
          ? { id: { not: candidate.excludeEntryId } }
          : {}),
      },
      include: ENTRY_INCLUDE,
    });
    if (slotEntries.length === 0) return;

    const period = await this.prisma.period.findUnique({
      where: { id: candidate.periodId },
    });
    const slotLabel = `${dayName} ${period?.name ?? ''}`.trim();

    // 1. Arm clash — the class already has something then.
    const armClash = slotEntries.find((e) => e.armId === candidate.armId);
    if (armClash) {
      throw new BadRequestException(
        `${armClash.arm.class.name} ${armClash.arm.name} already has ${armClash.classSubject.subject.name} on ${slotLabel}`,
      );
    }

    // 2. Teacher clash — resolved via TeacherAssignment for this term.
    const myTeacher = await this.prisma.teacherAssignment.findFirst({
      where: {
        classSubjectId: candidate.classSubjectId,
        termId: candidate.termId,
      },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (myTeacher) {
      const slotClassSubjectIds = [
        ...new Set(slotEntries.map((e) => e.classSubjectId)),
      ];
      const clashingAssignment = await this.prisma.teacherAssignment.findFirst({
        where: {
          staffId: myTeacher.staffId,
          termId: candidate.termId,
          classSubjectId: { in: slotClassSubjectIds },
        },
      });
      if (clashingAssignment) {
        const teacherClash = slotEntries.find(
          (e) => e.classSubjectId === clashingAssignment.classSubjectId,
        )!;
        throw new BadRequestException(
          `${myTeacher.staff.firstName} ${myTeacher.staff.lastName} is already teaching ${teacherClash.classSubject.subject.name} to ${teacherClash.arm.class.name} ${teacherClash.arm.name} on ${slotLabel}`,
        );
      }
    }

    // 3. Room clash — verbatim string comparison, case-insensitive.
    const room = candidate.room?.trim();
    if (room) {
      const roomClash = slotEntries.find(
        (e) => e.room && e.room.toLowerCase() === room.toLowerCase(),
      );
      if (roomClash) {
        throw new BadRequestException(
          `${roomClash.room} is already booked by ${roomClash.arm.class.name} ${roomClash.arm.name} (${roomClash.classSubject.subject.name}) on ${slotLabel}`,
        );
      }
    }
  }

  // -------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------

  private async resolveTermId(termId: string | undefined): Promise<string> {
    if (termId) return termId;
    const current = await this.prisma.term.findFirst({
      where: { isCurrent: true },
    });
    if (!current) {
      throw new BadRequestException(
        'No current term is set — pass termId explicitly',
      );
    }
    return current.id;
  }

  private toEntryDto(
    entry: {
      id: string;
      armId: string;
      classSubjectId: string;
      periodId: string;
      dayOfWeek: number;
      termId: string;
      room: string | null;
      arm: { name: string; class: { name: string } };
      classSubject: {
        subject: { name: string };
        teacherAssignments: {
          termId: string;
          staff: { id: string; firstName: string; lastName: string };
        }[];
      };
    },
    termId: string,
  ): TimetableEntryDto {
    // The include pulls every term's assignments — pick this term's.
    const assignment = entry.classSubject.teacherAssignments.find(
      (a) => a.termId === termId,
    );
    return {
      id: entry.id,
      armId: entry.armId,
      armLabel: `${entry.arm.class.name} ${entry.arm.name}`,
      classSubjectId: entry.classSubjectId,
      subjectName: entry.classSubject.subject.name,
      teacherId: assignment?.staff.id ?? null,
      teacherName: assignment
        ? `${assignment.staff.firstName} ${assignment.staff.lastName}`
        : null,
      periodId: entry.periodId,
      dayOfWeek: entry.dayOfWeek,
      termId: entry.termId,
      room: entry.room,
    };
  }
}
