import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import type {
  Arm,
  Attendance,
  AttendanceStatus,
  ClassSubject,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { AtRiskSettingsService } from '../at-risk/at-risk-settings.service';
import { AttendanceSummaryQueryDto } from './dto/attendance-summary-query.dto';
import { ChronicAbsenteeismQueryDto } from './dto/chronic-absenteeism-query.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { QueryAttendanceDto } from './dto/query-attendance.dto';
import { QueryClassAttendanceDto } from './dto/query-class-attendance.dto';
import {
  AttendanceAbsenceEvent,
  ATTENDANCE_ABSENCE_EVENT,
} from './events/attendance-absence.event';

const ABSENCE_TRIGGERING_STATUSES: ReadonlySet<AttendanceStatus> = new Set([
  'ABSENT',
  'LATE',
]);

export interface AttendanceSummary {
  studentId: string;
  termId: string;
  total: number;
  PRESENT: number;
  ABSENT: number;
  LATE: number;
  EXCUSED: number;
  ON_LEAVE: number;
  percentage: number;
}

export interface ChronicAbsenteeismEntry {
  studentId: string;
  student:
    | {
        id: string;
        firstName: string;
        lastName: string;
        admissionNumber: string;
      }
    | undefined;
  totalDays: number;
  absentDays: number;
  absenceRate: number;
}

@Injectable()
export class AttendanceService {
  // Roles with school-wide, unscoped READ access to attendance — matches
  // docs/03-roles-and-permissions.md §2's "Attendance" row (Admin: F,
  // VP/HOD/Exam Officer: V). Hostel Warden/Transport Officer's "E
  // (boarders/transport)" cells are a separate P2 attendance flow (roll-call,
  // pickup) not covered by this module — see docs/02-feature-list.md §13/§14.
  private readonly UNSCOPED_VIEW_ROLES: RequestUser['roles'] = [
    'ADMIN',
    'VICE_PRINCIPAL',
    'HOD',
    'EXAM_OFFICER',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly atRiskSettings: AtRiskSettingsService,
  ) {}

  // ---------------------------------------------------------------------
  // Marking
  // ---------------------------------------------------------------------

  async markAttendance(
    dto: MarkAttendanceDto,
    user: RequestUser,
  ): Promise<{ marked: number }> {
    const arm = await this.prisma.arm.findUnique({ where: { id: dto.armId } });
    if (!arm) {
      throw new BadRequestException('armId does not refer to an existing arm');
    }

    let classSubject: ClassSubject | null = null;
    if (dto.classSubjectId) {
      classSubject = await this.prisma.classSubject.findUnique({
        where: { id: dto.classSubjectId },
      });
      if (!classSubject) {
        throw new BadRequestException(
          'classSubjectId does not refer to an existing class-subject mapping',
        );
      }
      if (classSubject.classId !== arm.classId) {
        throw new BadRequestException(
          'classSubjectId does not belong to the class for the given armId',
        );
      }
    }

    const date = new Date(dto.date);
    const term = await this.prisma.term.findFirst({
      where: { startDate: { lte: date }, endDate: { gte: date } },
    });
    if (!term) {
      throw new BadRequestException(
        'date does not fall within any configured term',
      );
    }

    await this.assertCanMark(arm, classSubject, term.id, user);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { armId: arm.id, termId: term.id, status: 'ACTIVE' },
      select: { studentId: true },
    });
    const enrolledStudentIds = new Set(enrollments.map((e) => e.studentId));

    // Omitted/empty entries = "mark the whole class present" — the
    // realistic first pass of a teacher's routine. A follow-up call with
    // just the exceptions (e.g. two ABSENT students) then overrides only
    // those rows via the same upsert path, leaving everyone else's PRESENT
    // record from the first call untouched.
    const entries =
      dto.entries && dto.entries.length > 0
        ? dto.entries
        : [...enrolledStudentIds].map((studentId) => ({
            studentId,
            status: 'PRESENT' as const,
          }));

    const unknownStudentIds = entries
      .map((e) => e.studentId)
      .filter((id) => !enrolledStudentIds.has(id));
    if (unknownStudentIds.length > 0) {
      throw new BadRequestException(
        `These students are not actively enrolled in this class for this term: ${unknownStudentIds.join(', ')}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        const existing = await tx.attendance.findFirst({
          where: {
            studentId: entry.studentId,
            date,
            classSubjectId: dto.classSubjectId ?? null,
          },
        });
        if (existing) {
          await tx.attendance.update({
            where: { id: existing.id },
            data: { status: entry.status, markedByStaffId: user.id },
          });
          continue;
        }
        try {
          await tx.attendance.create({
            data: {
              studentId: entry.studentId,
              armId: arm.id,
              termId: term.id,
              classSubjectId: dto.classSubjectId,
              date,
              status: entry.status,
              markedByStaffId: user.id,
            },
          });
        } catch (error) {
          // A concurrent request for the exact same student+date+context
          // (e.g. a double-submit) can lose this race after the findFirst
          // above but before this create resolves — closed at the DB level
          // by the unique constraint/partial index (see schema.prisma's
          // Attendance comment). Recover by updating the row the other
          // request just won, rather than surfacing a raw 500 for what is,
          // from the caller's point of view, a perfectly normal mark.
          const isConcurrentDuplicate =
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002';
          if (!isConcurrentDuplicate) {
            throw error;
          }
          const winner = await tx.attendance.findFirst({
            where: {
              studentId: entry.studentId,
              date,
              classSubjectId: dto.classSubjectId ?? null,
            },
          });
          if (!winner) {
            throw error;
          }
          await tx.attendance.update({
            where: { id: winner.id },
            data: { status: entry.status, markedByStaffId: user.id },
          });
        }
      }
    });

    for (const entry of entries) {
      if (ABSENCE_TRIGGERING_STATUSES.has(entry.status)) {
        this.eventEmitter.emit(
          ATTENDANCE_ABSENCE_EVENT,
          new AttendanceAbsenceEvent(
            entry.studentId,
            arm.id,
            term.id,
            dto.date,
            entry.status as 'ABSENT' | 'LATE',
            user.id,
          ),
        );
      }
    }

    return { marked: entries.length };
  }

  /**
   * `classSubject` present -> per-period mark, requires SUBJECT_TEACHER +
   * a current TeacherAssignment for that exact class+subject+term.
   * `classSubject` absent -> whole-day mark, requires CLASS_TEACHER +
   * being that arm's classTeacherId. ADMIN bypasses both (full access
   * per the permission matrix).
   */
  private async assertCanMark(
    arm: Arm,
    classSubject: ClassSubject | null,
    termId: string,
    user: RequestUser,
  ): Promise<void> {
    if (user.roles.includes('ADMIN')) {
      return;
    }

    if (classSubject) {
      if (!user.roles.includes('SUBJECT_TEACHER')) {
        throw new ForbiddenException(
          'Only a Subject Teacher can mark per-period attendance',
        );
      }
      const assignment = await this.prisma.teacherAssignment.findUnique({
        where: {
          staffId_classSubjectId_termId: {
            staffId: user.id,
            classSubjectId: classSubject.id,
            termId,
          },
        },
      });
      if (!assignment) {
        throw new ForbiddenException(
          'You are not assigned to teach this class/subject this term',
        );
      }
      return;
    }

    if (!user.roles.includes('CLASS_TEACHER')) {
      throw new ForbiddenException(
        'Only a Class Teacher can mark whole-day attendance',
      );
    }
    if (arm.classTeacherId !== user.id) {
      throw new ForbiddenException(
        'You are not the Class Teacher for this arm',
      );
    }
  }

  // ---------------------------------------------------------------------
  // Reading
  // ---------------------------------------------------------------------

  async getStudentAttendance(
    query: QueryAttendanceDto,
    user: RequestUser,
  ): Promise<Attendance[]> {
    await this.assertStudentAttendanceScope(query.studentId, user);

    const where: Prisma.AttendanceWhereInput = {
      studentId: query.studentId,
      // The canonical "was this student in school that day" view — see
      // schema.prisma's Attendance comment for why classSubjectId
      // discriminates whole-day vs per-period rows.
      classSubjectId: null,
    };
    if (query.from || query.to) {
      where.date = {
        ...(query.from && { gte: new Date(query.from) }),
        ...(query.to && { lte: new Date(query.to) }),
      };
    }

    return this.prisma.attendance.findMany({
      where,
      include: { arm: { include: { class: true } } },
      orderBy: { date: 'desc' },
    });
  }

  async getClassAttendance(
    armId: string,
    query: QueryClassAttendanceDto,
    user: RequestUser,
  ): Promise<Attendance[]> {
    const arm = await this.prisma.arm.findUnique({ where: { id: armId } });
    if (!arm) {
      throw new NotFoundException('Arm not found');
    }

    if (query.classSubjectId) {
      const classSubject = await this.prisma.classSubject.findUnique({
        where: { id: query.classSubjectId },
      });
      if (!classSubject || classSubject.classId !== arm.classId) {
        throw new BadRequestException(
          'classSubjectId does not belong to the class for the given armId',
        );
      }
    }

    const date = new Date(query.date);
    await this.assertCanViewClassAttendance(
      arm,
      query.classSubjectId,
      date,
      user,
    );

    return this.prisma.attendance.findMany({
      where: {
        armId,
        date,
        classSubjectId: query.classSubjectId ?? null,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      orderBy: [
        { student: { firstName: 'asc' } },
        { student: { lastName: 'asc' } },
      ],
    });
  }

  async getAttendanceSummary(
    query: AttendanceSummaryQueryDto,
    user: RequestUser,
  ): Promise<AttendanceSummary> {
    await this.assertStudentAttendanceScope(
      query.studentId,
      user,
      query.termId,
    );

    const records = await this.prisma.attendance.findMany({
      where: {
        studentId: query.studentId,
        termId: query.termId,
        classSubjectId: null,
      },
      select: { status: true },
    });

    const counts: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
      ON_LEAVE: 0,
    };
    for (const record of records) {
      counts[record.status] += 1;
    }

    const total = records.length;
    // Counts LATE as having attended (you showed up, just tardy) — must
    // match web/app/admin/attendance/page.tsx's school-wide "today's rate"
    // definition, or a parent/student and the Admin dashboard would show
    // two different "attendance rate" numbers for the same student.
    const percentage =
      total > 0
        ? Math.round(((counts.PRESENT + counts.LATE) / total) * 1000) / 10
        : 0;

    return {
      studentId: query.studentId,
      termId: query.termId,
      total,
      ...counts,
      percentage,
    };
  }

  async getChronicAbsenteeism(
    query: ChronicAbsenteeismQueryDto,
  ): Promise<ChronicAbsenteeismEntry[]> {
    // Stage 29 — the default (no explicit `threshold` query param) now
    // comes from the shared AtRiskThresholdConfig instead of a number
    // hardcoded here, so this and the gradebook's at-risk flag and the
    // new AtRiskFlag scheduled job all read from one configurable place.
    // An explicit query param still overrides it for ad hoc exploration
    // (e.g. the Admin dashboard's ThresholdControl dropdown).
    let threshold = query.threshold;
    if (threshold === undefined) {
      const config = await this.atRiskSettings.loadConfig();
      threshold = Math.round((100 - config.attendanceRateFloor) * 10) / 10;
    }

    const records = await this.prisma.attendance.findMany({
      where: { termId: query.termId, classSubjectId: null },
      select: { studentId: true, status: true },
    });

    const byStudent = new Map<string, { total: number; absent: number }>();
    for (const record of records) {
      const entry = byStudent.get(record.studentId) ?? { total: 0, absent: 0 };
      entry.total += 1;
      if (record.status === 'ABSENT') {
        entry.absent += 1;
      }
      byStudent.set(record.studentId, entry);
    }

    const flagged = [...byStudent.entries()]
      .map(([studentId, { total, absent }]) => ({
        studentId,
        totalDays: total,
        absentDays: absent,
        absenceRate: total > 0 ? Math.round((absent / total) * 1000) / 10 : 0,
      }))
      .filter((entry) => entry.absenceRate > threshold);

    if (flagged.length === 0) {
      return [];
    }

    // isActive: true — a withdrawn/deactivated student's historical
    // absence rate isn't an actionable "at risk" signal for the admin
    // dashboard this feeds (docs/02-feature-list.md §6's "chronic
    // absenteeism flags"); excluding them keeps the list focused on
    // currently-enrolled students someone could actually follow up with.
    const students = await this.prisma.student.findMany({
      where: { id: { in: flagged.map((f) => f.studentId) }, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        admissionNumber: true,
      },
    });
    const studentsById = new Map(students.map((s) => [s.id, s]));

    return flagged
      .map((entry) => ({
        ...entry,
        student: studentsById.get(entry.studentId),
      }))
      .filter((entry) => entry.student !== undefined)
      .sort((a, b) => b.absenceRate - a.absenceRate);
  }

  /**
   * 404s (not 403) when the student exists but is outside the caller's
   * scope — same reasoning as students.service.ts's assertStudentInScope:
   * don't confirm the id exists to an unauthorized viewer. Every branch
   * here uses hand-written object literals with distinct field names
   * (never spreading a dynamic scope object over a literal key), so there's
   * no risk of the key-collision bug that shipped in Stage 3.
   *
   * `termId`, when given (getAttendanceSummary passes its own query.termId),
   * checks the SUBJECT_TEACHER's assignment for *that* term rather than
   * whichever term happens to be current right now — otherwise a teacher
   * who taught a class last term but isn't assigned to it this term would
   * be wrongly denied their own past summary. Falls back to the current
   * term when omitted (getStudentAttendanceHistory has no single term to
   * check against, since `from`/`to` can span several).
   */
  private async assertStudentAttendanceScope(
    studentId: string,
    user: RequestUser,
    termId?: string,
  ): Promise<void> {
    if (user.roles.some((role) => this.UNSCOPED_VIEW_ROLES.includes(role))) {
      return;
    }

    if (user.roles.includes('STUDENT')) {
      if (user.id === studentId) {
        return;
      }
      throw new NotFoundException('Student not found');
    }

    if (user.roles.includes('PARENT')) {
      const link = await this.prisma.studentGuardian.findFirst({
        where: { guardianId: user.id, studentId },
      });
      if (link) {
        return;
      }
      throw new NotFoundException('Student not found');
    }

    if (user.roles.includes('CLASS_TEACHER')) {
      const arms = await this.prisma.arm.findMany({
        where: { classTeacherId: user.id },
        select: { id: true },
      });
      if (arms.length > 0) {
        const enrolled = await this.prisma.enrollment.findFirst({
          where: {
            studentId,
            armId: { in: arms.map((a) => a.id) },
            status: 'ACTIVE',
          },
        });
        if (enrolled) {
          return;
        }
      }
    }

    if (user.roles.includes('SUBJECT_TEACHER')) {
      const resolvedTermId =
        termId ??
        (await this.prisma.term.findFirst({ where: { isCurrent: true } }))?.id;
      if (resolvedTermId) {
        const assignments = await this.prisma.teacherAssignment.findMany({
          where: { staffId: user.id, termId: resolvedTermId },
          select: { classSubject: { select: { classId: true } } },
        });
        const classIds = [
          ...new Set(assignments.map((a) => a.classSubject.classId)),
        ];
        if (classIds.length > 0) {
          const enrolled = await this.prisma.enrollment.findFirst({
            where: { studentId, classId: { in: classIds }, status: 'ACTIVE' },
          });
          if (enrolled) {
            return;
          }
        }
      }
    }

    throw new NotFoundException('Student not found');
  }

  /**
   * `date` resolves which term's assignment to check against (same basis
   * markAttendance authorizes marking on) rather than "current term" — a
   * Subject Teacher's right to view a specific day must depend on whether
   * they were assigned to that class+subject during the term that day
   * actually falls in, not whether they happen to hold an assignment
   * today. Using "current term" here would wrongly deny a teacher their
   * own past-term classes once reassigned, and wrongly grant access to an
   * unrelated date in a term they never taught.
   */
  private async assertCanViewClassAttendance(
    arm: Arm,
    classSubjectId: string | undefined,
    date: Date,
    user: RequestUser,
  ): Promise<void> {
    if (user.roles.some((role) => this.UNSCOPED_VIEW_ROLES.includes(role))) {
      return;
    }

    if (
      user.roles.includes('CLASS_TEACHER') &&
      arm.classTeacherId === user.id
    ) {
      return;
    }

    if (user.roles.includes('SUBJECT_TEACHER')) {
      const term = await this.prisma.term.findFirst({
        where: { startDate: { lte: date }, endDate: { gte: date } },
      });
      if (term) {
        const assignment = await this.prisma.teacherAssignment.findFirst({
          where: {
            staffId: user.id,
            termId: term.id,
            classSubject: {
              classId: arm.classId,
              ...(classSubjectId ? { id: classSubjectId } : {}),
            },
          },
        });
        if (assignment) {
          return;
        }
      }
    }

    throw new ForbiddenException(
      "You do not have access to this class's attendance",
    );
  }

  async exportAttendance(opts: {
    classId?: string;
    from?: Date;
    to?: Date;
  }): Promise<
    {
      date: Date;
      admissionNumber: string;
      firstName: string;
      lastName: string;
      className: string;
      armName: string;
      status: string;
    }[]
  > {
    const records = await this.prisma.attendance.findMany({
      where: {
        classSubjectId: null,
        ...(opts.classId ? { arm: { classId: opts.classId } } : {}),
        ...(opts.from || opts.to
          ? {
              date: {
                ...(opts.from ? { gte: opts.from } : {}),
                ...(opts.to ? { lte: opts.to } : {}),
              },
            }
          : {}),
      },
      include: {
        student: {
          select: { firstName: true, lastName: true, admissionNumber: true },
        },
        arm: { select: { name: true, class: { select: { name: true } } } },
      },
      orderBy: { date: 'asc' },
      take: 10_000,
    });

    return records.map((r) => ({
      date: r.date,
      admissionNumber: r.student.admissionNumber,
      firstName: r.student.firstName,
      lastName: r.student.lastName,
      className: r.arm.class.name,
      armName: r.arm.name,
      status: r.status,
    }));
  }
}
