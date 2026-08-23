import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AtRiskReason } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { BroadcastsService } from '../communication/broadcasts.service';
import { ClassScopeService } from '../communication/class-scope.service';
import { AtRiskSettingsService } from './at-risk-settings.service';

export interface AtRiskRunResult {
  checked: number;
  newlyFlagged: number;
  resolved: number;
}

export interface AtRiskStudentRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  reason: AtRiskReason;
  attendanceRate: number | null;
  caAverage: number | null;
  flaggedAt: Date;
}

/**
 * Mid-term early-warning flagging (docs/19-unique-differentiators.md §5).
 * Runs daily; on each run, re-evaluates every actively-enrolled student in
 * the current term against the school's configured floors and either
 * creates a new AtRiskFlag (transition into flagged), quietly updates an
 * existing open one (still flagged — reason/snapshot may change, but no
 * re-notify), or resolves one (transition out) — see AtRiskFlag's schema
 * comment for why "open flag" is queried as resolvedAt IS NULL rather
 * than a unique constraint on (studentId, termId).
 */
@Injectable()
export class AtRiskFlaggingService {
  private readonly logger = new Logger(AtRiskFlaggingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AtRiskSettingsService,
    private readonly broadcasts: BroadcastsService,
    private readonly classScope: ClassScopeService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runDaily(): Promise<void> {
    const result = await this.run();
    this.logger.log(
      `Daily at-risk run: checked ${result.checked} student(s), newly flagged ${result.newlyFlagged}, resolved ${result.resolved}.`,
    );
  }

  async run(): Promise<AtRiskRunResult> {
    const config = await this.settings.loadConfig();
    const currentTerm = await this.prisma.term.findFirst({
      where: { isCurrent: true },
    });
    if (!currentTerm) return { checked: 0, newlyFlagged: 0, resolved: 0 };

    const enrollments = await this.prisma.enrollment.findMany({
      where: { termId: currentTerm.id, status: 'ACTIVE' },
      select: { studentId: true },
    });
    const studentIds = enrollments.map((e) => e.studentId);
    if (studentIds.length === 0) {
      return { checked: 0, newlyFlagged: 0, resolved: 0 };
    }

    const [attendanceByStudent, caByStudent, openFlags] = await Promise.all([
      this.computeAttendanceRates(studentIds, currentTerm.id),
      this.computeCaAverages(studentIds, currentTerm.id),
      this.prisma.atRiskFlag.findMany({
        where: { studentId: { in: studentIds }, resolvedAt: null },
      }),
    ]);
    const openByStudent = new Map(openFlags.map((f) => [f.studentId, f]));

    let newlyFlagged = 0;
    let resolved = 0;
    for (const studentId of studentIds) {
      const attendanceRate = attendanceByStudent.get(studentId) ?? null;
      const caAverage = caByStudent.get(studentId) ?? null;
      const attendanceAtRisk =
        attendanceRate !== null && attendanceRate < config.attendanceRateFloor;
      const caAtRisk = caAverage !== null && caAverage < config.caAverageFloor;
      const isAtRisk = attendanceAtRisk || caAtRisk;
      const reason: AtRiskReason =
        attendanceAtRisk && caAtRisk
          ? AtRiskReason.BOTH
          : attendanceAtRisk
            ? AtRiskReason.ATTENDANCE
            : AtRiskReason.CA;

      const existing = openByStudent.get(studentId);
      if (isAtRisk) {
        if (existing) {
          if (
            existing.reason !== reason ||
            existing.attendanceRate !== attendanceRate ||
            existing.caAverage !== caAverage
          ) {
            await this.prisma.atRiskFlag.update({
              where: { id: existing.id },
              data: { reason, attendanceRate, caAverage },
            });
          }
        } else {
          await this.prisma.atRiskFlag.create({
            data: {
              studentId,
              termId: currentTerm.id,
              reason,
              attendanceRate,
              caAverage,
            },
          });
          await this.broadcasts.sendAtRiskFlagAlert({
            studentId,
            transition: 'FLAGGED',
            reason,
            notifyGuardian: config.notifyGuardianOnFlag,
          });
          newlyFlagged += 1;
        }
      } else if (existing) {
        await this.prisma.atRiskFlag.update({
          where: { id: existing.id },
          data: { resolvedAt: new Date() },
        });
        await this.broadcasts.sendAtRiskFlagAlert({
          studentId,
          transition: 'RESOLVED',
          reason: existing.reason,
          notifyGuardian: config.notifyGuardianOnFlag,
        });
        resolved += 1;
      }
    }

    return { checked: studentIds.length, newlyFlagged, resolved };
  }

  /** (PRESENT+LATE)/total — must match attendance.service.ts's getAttendanceSummary formula, or this job and the Admin/Parent dashboards would disagree on what "attendance rate" means for the same student. */
  private async computeAttendanceRates(
    studentIds: string[],
    termId: string,
  ): Promise<Map<string, number>> {
    const records = await this.prisma.attendance.findMany({
      where: { studentId: { in: studentIds }, termId, classSubjectId: null },
      select: { studentId: true, status: true },
    });

    const byStudent = new Map<string, { total: number; attended: number }>();
    for (const record of records) {
      const entry = byStudent.get(record.studentId) ?? {
        total: 0,
        attended: 0,
      };
      entry.total += 1;
      if (record.status === 'PRESENT' || record.status === 'LATE') {
        entry.attended += 1;
      }
      byStudent.set(record.studentId, entry);
    }

    const rates = new Map<string, number>();
    for (const [studentId, { total, attended }] of byStudent) {
      if (total > 0) {
        rates.set(studentId, Math.round((attended / total) * 1000) / 10);
      }
    }
    return rates;
  }

  /**
   * Weighted percentage per subject (assessmentComponent.weight is "out
   * of 100 points"), averaged across every subject scored this term —
   * same formula as ussd.service.ts's latestResultText, computed directly
   * from raw Score records (not the published StudentTermResult table)
   * since this must work mid-term, before anything is published.
   */
  private async computeCaAverages(
    studentIds: string[],
    termId: string,
  ): Promise<Map<string, number>> {
    const scores = await this.prisma.score.findMany({
      where: { studentId: { in: studentIds }, termId },
      select: {
        studentId: true,
        classSubjectId: true,
        score: true,
        assessmentComponent: { select: { maxScore: true, weight: true } },
      },
    });

    const byStudent = new Map<string, Map<string, number>>();
    for (const s of scores) {
      const contribution =
        (s.score / s.assessmentComponent.maxScore) *
        s.assessmentComponent.weight;
      const bySubject = byStudent.get(s.studentId) ?? new Map<string, number>();
      bySubject.set(
        s.classSubjectId,
        (bySubject.get(s.classSubjectId) ?? 0) + contribution,
      );
      byStudent.set(s.studentId, bySubject);
    }

    const averages = new Map<string, number>();
    for (const [studentId, bySubject] of byStudent) {
      const values = [...bySubject.values()];
      if (values.length > 0) {
        const average = values.reduce((sum, v) => sum + v, 0) / values.length;
        averages.set(studentId, Math.round(average * 10) / 10);
      }
    }
    return averages;
  }

  /**
   * `armId` (the query calls it `classId` per the backend prompt's own
   * wording — West African schools colloquially call a specific arm/
   * section "the class", and Arm is the model that actually carries
   * classTeacherId, which is what a CLASS_TEACHER's scope check needs).
   * ADMIN/VICE_PRINCIPAL are unscoped and may omit it for the school-wide
   * list; a CLASS_TEACHER must pass their own arm's id.
   */
  async getAtRiskStudents(
    armId: string | undefined,
    user: RequestUser,
  ): Promise<AtRiskStudentRow[]> {
    const unscoped = this.classScope.isUnscoped(user);
    if (armId) {
      const arm = await this.prisma.arm.findUnique({ where: { id: armId } });
      if (!arm) throw new NotFoundException('Class not found');
      if (!unscoped) {
        await this.classScope.assertOwnClassScope(
          [{ classId: arm.classId, classTeacherId: arm.classTeacherId }],
          user,
        );
      }
    } else if (!unscoped) {
      throw new ForbiddenException(
        'classId is required — you can only view your own class',
      );
    }

    const flags = await this.prisma.atRiskFlag.findMany({
      where: {
        resolvedAt: null,
        ...(armId
          ? {
              student: {
                enrollments: { some: { armId, status: 'ACTIVE' } },
              },
            }
          : {}),
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
      orderBy: { flaggedAt: 'desc' },
    });

    return flags.map((f) => ({
      studentId: f.studentId,
      firstName: f.student.firstName,
      lastName: f.student.lastName,
      admissionNumber: f.student.admissionNumber,
      reason: f.reason,
      attendanceRate: f.attendanceRate,
      caAverage: f.caAverage,
      flaggedAt: f.flaggedAt,
    }));
  }
}
