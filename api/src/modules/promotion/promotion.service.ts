import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Enrollment, EnrollmentStatus } from '@prisma/client';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { StudentsService } from '../students/students.service';
import { GeneratePromotionSuggestionsDto } from './dto/generate-promotion-suggestions.dto';
import { PromoteStudentDto } from './dto/promote-student.dto';

const DEFAULT_THRESHOLD = 40;

export interface PromotionSuggestion {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  currentEnrollmentId: string;
  currentClassId: string;
  currentClassName: string;
  currentArmId: string;
  overallAverage: number | null;
  suggestedOutcome: 'PROMOTED' | 'REPEATED' | 'GRADUATED' | null;
  reason: string;
}

@Injectable()
export class PromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentsService: StudentsService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * Suggestion only (docs §8) — never persisted, never applied. Based on
   * the session's final term's published overallAverage against a
   * configurable threshold. The doc also mentions "no more than N failed
   * core subjects" as an additional criterion, but there's no "core
   * subject" concept in the schema yet (ClassSubject doesn't distinguish
   * core/elective) — adding one isn't this stage's job, so the average
   * threshold is the sole criterion for now.
   */
  async suggestPromotions(
    sessionId: string,
    dto: GeneratePromotionSuggestionsDto,
  ): Promise<PromotionSuggestion[]> {
    const session = await this.prisma.academicSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Academic session not found');

    const threshold = dto.threshold ?? DEFAULT_THRESHOLD;
    const terms = await this.prisma.term.findMany({
      where: { sessionId },
      orderBy: { startDate: 'asc' },
    });
    const lastTerm = terms[terms.length - 1];
    if (!lastTerm) {
      throw new BadRequestException('This session has no terms yet');
    }

    const enrollments = await this.prisma.enrollment.findMany({
      where: { termId: lastTerm.id, status: 'ACTIVE' },
      include: { student: true, class: true },
    });
    if (enrollments.length === 0) return [];

    const maxLevel = await this.prisma.class.aggregate({
      _max: { level: true },
    });
    const terminalLevel = maxLevel._max.level ?? null;

    const results = await this.prisma.studentTermResult.findMany({
      where: {
        termId: lastTerm.id,
        studentId: { in: enrollments.map((e) => e.studentId) },
      },
    });
    const resultByStudent = new Map(results.map((r) => [r.studentId, r]));

    return enrollments.map((enrollment) => {
      const result = resultByStudent.get(enrollment.studentId);
      const base = {
        studentId: enrollment.studentId,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        admissionNumber: enrollment.student.admissionNumber,
        currentEnrollmentId: enrollment.id,
        currentClassId: enrollment.classId,
        currentClassName: enrollment.class.name,
        currentArmId: enrollment.armId,
      };

      if (!result || result.overallAverage === null) {
        return {
          ...base,
          overallAverage: null,
          suggestedOutcome: null,
          reason: 'No published result yet for this term',
        };
      }

      const passed = result.overallAverage >= threshold;
      const isTerminalClass =
        terminalLevel !== null && enrollment.class.level === terminalLevel;
      const suggestedOutcome: PromotionSuggestion['suggestedOutcome'] = passed
        ? isTerminalClass
          ? 'GRADUATED'
          : 'PROMOTED'
        : 'REPEATED';

      return {
        ...base,
        overallAverage: result.overallAverage,
        suggestedOutcome,
        reason: passed
          ? `Average ${result.overallAverage.toFixed(1)}% meets the ${threshold}% threshold`
          : `Average ${result.overallAverage.toFixed(1)}% is below the ${threshold}% threshold`,
      };
    });
  }

  /**
   * The explicit, human-confirmed action (docs §8 — "Admin reviews and
   * confirms before it's final, never fully automatic"). Composes Stage
   * 3's existing enrollment methods rather than reimplementing their
   * invariants (e.g. "at most one ACTIVE enrollment per student").
   */
  async promote(
    studentId: string,
    dto: PromoteStudentDto,
    user: RequestUser,
  ): Promise<Enrollment> {
    const currentEnrollment = await this.prisma.enrollment.findUnique({
      where: { id: dto.currentEnrollmentId },
    });
    if (!currentEnrollment || currentEnrollment.studentId !== studentId) {
      throw new NotFoundException('Enrollment not found for this student');
    }

    const createsNewEnrollment: EnrollmentStatus[] = ['PROMOTED', 'REPEATED'];
    if (createsNewEnrollment.includes(dto.outcome)) {
      if (!dto.nextClassId || !dto.nextArmId || !dto.nextTermId) {
        throw new BadRequestException(
          'nextClassId, nextArmId and nextTermId are required when the outcome is PROMOTED or REPEATED',
        );
      }
    }

    await this.studentsService.updateEnrollmentStatus(
      studentId,
      currentEnrollment.id,
      {
        status: dto.outcome,
      },
    );

    let result: Enrollment;
    if (createsNewEnrollment.includes(dto.outcome)) {
      try {
        result = await this.studentsService.createEnrollment(studentId, {
          classId: dto.nextClassId!,
          armId: dto.nextArmId!,
          termId: dto.nextTermId!,
          status: 'ACTIVE',
        });
      } catch (error) {
        // Without this, a failure here (bad target class/arm/term, a
        // student.service-level conflict, etc.) would leave the student
        // with their old enrollment already closed out and no new one —
        // promoted into thin air, with no active enrollment at all.
        await this.studentsService.updateEnrollmentStatus(
          studentId,
          currentEnrollment.id,
          { status: 'ACTIVE' },
        );
        throw error;
      }
    } else {
      result = await this.prisma.enrollment.findUniqueOrThrow({
        where: { id: currentEnrollment.id },
      });
    }

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'STUDENT_PROMOTED',
      entityType: 'Student',
      entityId: studentId,
      beforeJson: {
        enrollmentId: currentEnrollment.id,
        status: currentEnrollment.status,
      },
      afterJson: { outcome: dto.outcome, newEnrollmentId: result.id },
    });

    return result;
  }
}
