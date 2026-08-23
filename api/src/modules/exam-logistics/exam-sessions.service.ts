import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ExamHall, ExamSession } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import {
  AllocateSeatsDto,
  CreateExamHallDto,
  CreateExamSessionDto,
  ManualSeatAllocationDto,
  UpdateExamHallDto,
  UpdateExamSessionDto,
} from './dto/exam-logistics.dto';

const DAY_NAMES = [
  '', // ISO weekday is 1-based
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function isoWeekday(date: Date): number {
  const jsDay = date.getUTCDay(); // 0 = Sunday
  return jsDay === 0 ? 7 : jsDay;
}

interface SessionCandidate {
  subjectId: string;
  armId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  termId: string;
  excludeSessionId?: string;
}

const SESSION_INCLUDE = {
  subject: true,
  arm: { include: { class: true } },
  _count: { select: { invigilationDuties: true, seatAllocations: true } },
} as const;

export interface ExamSessionDto {
  id: string;
  subjectId: string;
  subjectName: string;
  armId: string;
  armLabel: string;
  date: Date;
  startTime: string;
  durationMinutes: number;
  termId: string;
  invigilatorCount: number;
  seatAllocationCount: number;
}

@Injectable()
export class ExamSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------
  // Sessions
  // -------------------------------------------------------------------

  async create(dto: CreateExamSessionDto): Promise<ExamSessionDto> {
    await this.assertValid(dto);
    await this.assertNoConflicts(dto);

    const session = await this.prisma.examSession.create({
      data: {
        subjectId: dto.subjectId,
        armId: dto.armId,
        date: new Date(dto.date),
        startTime: dto.startTime,
        durationMinutes: dto.durationMinutes,
        termId: dto.termId,
      },
      include: SESSION_INCLUDE,
    });
    return this.toDto(session);
  }

  async update(id: string, dto: UpdateExamSessionDto): Promise<ExamSessionDto> {
    const existing = await this.getRawOrThrow(id);
    const candidate: SessionCandidate = {
      subjectId: dto.subjectId ?? existing.subjectId,
      armId: dto.armId ?? existing.armId,
      date: dto.date ?? existing.date.toISOString().slice(0, 10),
      startTime: dto.startTime ?? existing.startTime,
      durationMinutes: dto.durationMinutes ?? existing.durationMinutes,
      termId: dto.termId ?? existing.termId,
      excludeSessionId: id,
    };
    await this.assertValid(candidate);
    await this.assertNoConflicts(candidate);

    const session = await this.prisma.examSession.update({
      where: { id },
      data: {
        subjectId: candidate.subjectId,
        armId: candidate.armId,
        date: new Date(candidate.date),
        startTime: candidate.startTime,
        durationMinutes: candidate.durationMinutes,
        termId: candidate.termId,
      },
      include: SESSION_INCLUDE,
    });
    return this.toDto(session);
  }

  async delete(id: string): Promise<void> {
    await this.getRawOrThrow(id);
    await this.prisma.examSession.delete({ where: { id } });
  }

  async list(termId?: string, armId?: string): Promise<ExamSessionDto[]> {
    const sessions = await this.prisma.examSession.findMany({
      where: {
        ...(termId && { termId }),
        ...(armId && { armId }),
      },
      include: SESSION_INCLUDE,
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    return sessions.map((s) => this.toDto(s));
  }

  async getOne(id: string): Promise<ExamSessionDto> {
    const session = await this.getRawOrThrow(id);
    return this.toDto(session);
  }

  private async getRawOrThrow(id: string): Promise<
    ExamSession & {
      subject: { name: string };
      arm: { name: string; class: { name: string } };
    }
  > {
    const session = await this.prisma.examSession.findUnique({
      where: { id },
      include: SESSION_INCLUDE,
    });
    if (!session) throw new NotFoundException('Exam session not found');
    return session;
  }

  private toDto(session: {
    id: string;
    subjectId: string;
    subject: { name: string };
    armId: string;
    arm: { name: string; class: { name: string } };
    date: Date;
    startTime: string;
    durationMinutes: number;
    termId: string;
    _count?: { invigilationDuties: number; seatAllocations: number };
  }): ExamSessionDto {
    return {
      id: session.id,
      subjectId: session.subjectId,
      subjectName: session.subject.name,
      armId: session.armId,
      armLabel: `${session.arm.class.name} ${session.arm.name}`,
      date: session.date,
      startTime: session.startTime,
      durationMinutes: session.durationMinutes,
      termId: session.termId,
      invigilatorCount: session._count?.invigilationDuties ?? 0,
      seatAllocationCount: session._count?.seatAllocations ?? 0,
    };
  }

  // -------------------------------------------------------------------
  // Validation — mirrors Stage 16 TimetableService's assertEntryValid /
  // assertNoConflicts shape: referential sanity first, then a shared
  // conflict checker used by both create and update.
  // -------------------------------------------------------------------

  private async assertValid(candidate: SessionCandidate): Promise<void> {
    const [subject, arm, term] = await Promise.all([
      this.prisma.subject.findUnique({ where: { id: candidate.subjectId } }),
      this.prisma.arm.findUnique({
        where: { id: candidate.armId },
        include: { class: true },
      }),
      this.prisma.term.findUnique({ where: { id: candidate.termId } }),
    ]);
    if (!subject) throw new NotFoundException('Subject not found');
    if (!arm) throw new NotFoundException('Arm not found');
    if (!term) throw new NotFoundException('Term not found');

    const mapped = await this.prisma.classSubject.findFirst({
      where: { classId: arm.classId, subjectId: candidate.subjectId },
    });
    if (!mapped) {
      throw new BadRequestException(
        `${subject.name} is not on ${arm.class.name}'s curriculum — map it to the class first`,
      );
    }
  }

  /**
   * Rejects if the candidate slot clashes with the arm's regular weekly
   * timetable (Stage 16's TimetableEntry) or with another ExamSession for
   * the same arm — same "one query, then compare" shape as Stage 16's
   * assertNoConflicts, just keyed by date+time-range instead of a fixed
   * period.
   */
  private async assertNoConflicts(candidate: SessionCandidate): Promise<void> {
    const date = new Date(candidate.date);
    const dayOfWeek = isoWeekday(date);
    const start = toMinutes(candidate.startTime);
    const end = start + candidate.durationMinutes;

    // 1. Clash against the arm's regular class timetable that day.
    const dayEntries = await this.prisma.timetableEntry.findMany({
      where: {
        armId: candidate.armId,
        termId: candidate.termId,
        dayOfWeek,
      },
      include: { classSubject: { include: { subject: true } }, period: true },
    });
    for (const entry of dayEntries) {
      const periodStart = toMinutes(entry.period.startTime);
      const periodEnd = toMinutes(entry.period.endTime);
      if (start < periodEnd && periodStart < end) {
        throw new BadRequestException(
          `This clashes with the regular timetable — ${entry.classSubject.subject.name} is already scheduled on ${DAY_NAMES[dayOfWeek]} ${entry.period.name} (${entry.period.startTime}–${entry.period.endTime})`,
        );
      }
    }

    // 2. Clash against other exam sessions already booked for this arm on this date.
    const sameDaySessions = await this.prisma.examSession.findMany({
      where: {
        armId: candidate.armId,
        date,
        ...(candidate.excludeSessionId
          ? { id: { not: candidate.excludeSessionId } }
          : {}),
      },
      include: { subject: true },
    });
    for (const other of sameDaySessions) {
      const otherStart = toMinutes(other.startTime);
      const otherEnd = otherStart + other.durationMinutes;
      if (start < otherEnd && otherStart < end) {
        throw new BadRequestException(
          `This clashes with the ${other.subject.name} exam already scheduled for this arm on the same day (${other.startTime}, ${other.durationMinutes} min)`,
        );
      }
    }
  }

  // -------------------------------------------------------------------
  // Halls
  // -------------------------------------------------------------------

  listHalls(): Promise<ExamHall[]> {
    return this.prisma.examHall.findMany({ orderBy: { name: 'asc' } });
  }

  async createHall(dto: CreateExamHallDto): Promise<ExamHall> {
    try {
      return await this.prisma.examHall.create({ data: dto });
    } catch (error) {
      return translatePrismaError(
        error,
        'A hall with this name already exists',
      );
    }
  }

  async updateHall(id: string, dto: UpdateExamHallDto): Promise<ExamHall> {
    await this.getHallOrThrow(id);
    try {
      return await this.prisma.examHall.update({ where: { id }, data: dto });
    } catch (error) {
      return translatePrismaError(
        error,
        'A hall with this name already exists',
      );
    }
  }

  async deleteHall(id: string): Promise<void> {
    await this.getHallOrThrow(id);
    try {
      await this.prisma.examHall.delete({ where: { id } });
    } catch (error) {
      translatePrismaError(
        error,
        'This hall still has seat allocations — remove those first',
      );
    }
  }

  private async getHallOrThrow(id: string): Promise<ExamHall> {
    const hall = await this.prisma.examHall.findUnique({ where: { id } });
    if (!hall) throw new NotFoundException('Exam hall not found');
    return hall;
  }

  // -------------------------------------------------------------------
  // Seat allocation
  // -------------------------------------------------------------------

  async getSeatAllocations(examSessionId: string) {
    await this.getRawOrThrow(examSessionId);
    return this.prisma.examSeatAllocation.findMany({
      where: { examSessionId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
        hall: true,
      },
      orderBy: [{ hall: { name: 'asc' } }, { seatNumber: 'asc' }],
    });
  }

  /** Sequential fill across the given halls, in order, by capacity. Re-running replaces the previous allocation. */
  async autoAllocate(examSessionId: string, dto: AllocateSeatsDto) {
    const session = await this.getRawOrThrow(examSessionId);
    const halls = await this.prisma.examHall.findMany({
      where: { id: { in: dto.hallIds } },
    });
    if (halls.length !== dto.hallIds.length) {
      throw new NotFoundException('One or more halls were not found');
    }
    const orderedHalls = dto.hallIds.map(
      (id) => halls.find((h) => h.id === id)!,
    );

    const students = await this.prisma.enrollment.findMany({
      where: { armId: session.armId, termId: session.termId, status: 'ACTIVE' },
      select: { studentId: true },
      orderBy: { studentId: 'asc' },
    });
    const totalCapacity = orderedHalls.reduce((sum, h) => sum + h.capacity, 0);
    if (students.length > totalCapacity) {
      throw new BadRequestException(
        `${students.length} candidates need seating but the selected halls only hold ${totalCapacity} — add another hall`,
      );
    }

    const allocations: {
      studentId: string;
      hallId: string;
      seatNumber: number;
    }[] = [];
    let cursor = 0;
    for (const hall of orderedHalls) {
      for (
        let seat = 1;
        seat <= hall.capacity && cursor < students.length;
        seat++
      ) {
        allocations.push({
          studentId: students[cursor].studentId,
          hallId: hall.id,
          seatNumber: seat,
        });
        cursor++;
      }
    }

    await this.prisma.$transaction([
      this.prisma.examSeatAllocation.deleteMany({ where: { examSessionId } }),
      this.prisma.examSeatAllocation.createMany({
        data: allocations.map((a) => ({ examSessionId, ...a })),
      }),
    ]);

    return this.getSeatAllocations(examSessionId);
  }

  /** Manual override for the inevitable edge case — one student at a time. */
  async manualAllocate(examSessionId: string, dto: ManualSeatAllocationDto) {
    await this.getRawOrThrow(examSessionId);
    const hall = await this.prisma.examHall.findUnique({
      where: { id: dto.hallId },
    });
    if (!hall) throw new NotFoundException('Exam hall not found');
    if (dto.seatNumber > hall.capacity) {
      throw new BadRequestException(
        `${hall.name} only has ${hall.capacity} seats`,
      );
    }
    const seatTaken = await this.prisma.examSeatAllocation.findFirst({
      where: {
        examSessionId,
        hallId: dto.hallId,
        seatNumber: dto.seatNumber,
        studentId: { not: dto.studentId },
      },
    });
    if (seatTaken) {
      throw new BadRequestException(
        `Seat ${dto.seatNumber} in ${hall.name} is already taken`,
      );
    }

    await this.prisma.examSeatAllocation.upsert({
      where: {
        examSessionId_studentId: { examSessionId, studentId: dto.studentId },
      },
      update: { hallId: dto.hallId, seatNumber: dto.seatNumber },
      create: {
        examSessionId,
        studentId: dto.studentId,
        hallId: dto.hallId,
        seatNumber: dto.seatNumber,
      },
    });

    return this.getSeatAllocations(examSessionId);
  }
}
