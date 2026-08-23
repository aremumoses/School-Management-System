import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AssessmentComponent,
  Score,
  ScoreSubmission,
} from '@prisma/client';
import { AssessmentService } from '../assessment/assessment.service';
import { AuditLogService } from '../../common/audit-log/audit-log.service';
import { GradingService } from '../../common/grading/grading.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { QueryScoresDto } from './dto/query-scores.dto';
import { SubmitScoresDto } from './dto/submit-scores.dto';
import { UnlockScoresDto } from './dto/unlock-scores.dto';

export interface StudentScoreRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  photoUrl: string | null;
  scores: {
    assessmentComponentId: string;
    name: string;
    maxScore: number;
    score: number | null;
  }[];
  total: number;
  grade: string;
  remark: string;
}

export interface ScoreGridComponent {
  id: string;
  name: string;
  maxScore: number;
  weight: number;
}

export interface ScoreGridResponse {
  // Lets the frontend render a read-only "Submitted — awaiting collation"
  // state instead of an editable grid, without a failed submit attempt
  // being the only way to discover the lock.
  locked: boolean;
  submittedAt: string | null;
  unlockReason: string | null;
  components: ScoreGridComponent[];
  rows: StudentScoreRow[];
}

@Injectable()
export class ScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentService: AssessmentService,
    private readonly gradingService: GradingService,
    private readonly auditLog: AuditLogService,
  ) {}

  /**
   * A subject's percentage total (0-100) from a set of raw component
   * scores — each component's raw mark is scaled by maxScore then weighted,
   * so a CA1 marked out of 20 but worth 10% of the subject contributes
   * (score/20)*10, not the raw 0-20 value. Shared with ResultsService for
   * broadsheet/report-card computation, so the same number always shows up
   * everywhere it's referenced.
   */
  computeSubjectPercentage(
    scores: Pick<Score, 'assessmentComponentId' | 'score'>[],
    components: Pick<AssessmentComponent, 'id' | 'maxScore' | 'weight'>[],
  ): number {
    const componentById = new Map(components.map((c) => [c.id, c]));
    let total = 0;
    for (const entry of scores) {
      const component = componentById.get(entry.assessmentComponentId);
      if (!component || component.maxScore === 0) continue;
      total += (entry.score / component.maxScore) * component.weight;
    }
    return total;
  }

  async submit(
    dto: SubmitScoresDto,
    user: RequestUser,
  ): Promise<ScoreSubmission> {
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: dto.classSubjectId },
    });
    if (!classSubject) {
      throw new NotFoundException('Class/subject mapping not found');
    }
    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
    });
    if (!term) throw new NotFoundException('Term not found');

    const assignment = await this.prisma.teacherAssignment.findUnique({
      where: {
        staffId_classSubjectId_termId: {
          staffId: user.id,
          classSubjectId: dto.classSubjectId,
          termId: dto.termId,
        },
      },
    });
    if (!assignment) {
      throw new ForbiddenException(
        'You are not assigned to teach this class/subject this term',
      );
    }
    if (
      assignment.scoreEntryDeadline &&
      new Date() > assignment.scoreEntryDeadline
    ) {
      throw new ForbiddenException(
        'The score-entry deadline for this class/subject has passed — ask an Exam Officer or Admin to extend it',
      );
    }

    const existingSubmission = await this.prisma.scoreSubmission.findUnique({
      where: {
        classSubjectId_termId: {
          classSubjectId: dto.classSubjectId,
          termId: dto.termId,
        },
      },
    });
    if (existingSubmission?.locked) {
      throw new ForbiddenException(
        'Scores for this class/subject/term are already submitted and locked — ask an Exam Officer or Admin to unlock first',
      );
    }

    const components = await this.assessmentService.assertReadyForSubmission(
      dto.termId,
      classSubject.subjectId,
    );
    const componentById = new Map(components.map((c) => [c.id, c]));

    const studentIds = [...new Set(dto.entries.map((e) => e.studentId))];
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId: { in: studentIds },
        termId: dto.termId,
        classId: classSubject.classId,
        status: 'ACTIVE',
      },
    });
    const enrolledStudentIds = new Set(enrollments.map((e) => e.studentId));

    for (const entry of dto.entries) {
      if (!enrolledStudentIds.has(entry.studentId)) {
        throw new BadRequestException(
          `Student ${entry.studentId} is not actively enrolled in this class this term`,
        );
      }
      const component = componentById.get(entry.assessmentComponentId);
      if (!component) {
        throw new BadRequestException(
          `Assessment component ${entry.assessmentComponentId} does not apply to this subject/term`,
        );
      }
      if (entry.score > component.maxScore) {
        throw new BadRequestException(
          `Score ${entry.score} for student ${entry.studentId} exceeds ${component.name}'s max of ${component.maxScore}`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const entry of dto.entries) {
        await tx.score.upsert({
          where: {
            studentId_classSubjectId_termId_assessmentComponentId: {
              studentId: entry.studentId,
              classSubjectId: dto.classSubjectId,
              termId: dto.termId,
              assessmentComponentId: entry.assessmentComponentId,
            },
          },
          update: { score: entry.score, enteredByStaffId: user.id },
          create: {
            studentId: entry.studentId,
            classSubjectId: dto.classSubjectId,
            termId: dto.termId,
            assessmentComponentId: entry.assessmentComponentId,
            score: entry.score,
            enteredByStaffId: user.id,
          },
        });
      }

      await tx.scoreSubmission.upsert({
        where: {
          classSubjectId_termId: {
            classSubjectId: dto.classSubjectId,
            termId: dto.termId,
          },
        },
        update: {
          locked: true,
          submittedByStaffId: user.id,
          submittedAt: new Date(),
          unlockedAt: null,
          unlockedByStaffId: null,
          unlockReason: null,
        },
        create: {
          classSubjectId: dto.classSubjectId,
          termId: dto.termId,
          submittedByStaffId: user.id,
        },
      });
    });

    const result = await this.prisma.scoreSubmission.findUniqueOrThrow({
      where: {
        classSubjectId_termId: {
          classSubjectId: dto.classSubjectId,
          termId: dto.termId,
        },
      },
    });

    // docs/18-technical-architecture.md §8 lists "score changes" explicitly
    // among the actions requiring an audit trail — this is the entry point
    // for every score a student ever receives, locked or not.
    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'SCORE_SUBMIT',
      entityType: 'ScoreSubmission',
      entityId: result.id,
      afterJson: { entryCount: dto.entries.length },
    });

    return result;
  }

  async unlock(
    dto: UnlockScoresDto,
    user: RequestUser,
  ): Promise<ScoreSubmission> {
    const submission = await this.prisma.scoreSubmission.findUnique({
      where: {
        classSubjectId_termId: {
          classSubjectId: dto.classSubjectId,
          termId: dto.termId,
        },
      },
    });
    if (!submission) {
      throw new NotFoundException(
        'No score submission exists yet for this class/subject/term',
      );
    }
    if (!submission.locked) {
      throw new BadRequestException('This submission is already unlocked');
    }

    const updated = await this.prisma.scoreSubmission.update({
      where: { id: submission.id },
      data: {
        locked: false,
        unlockedAt: new Date(),
        unlockedByStaffId: user.id,
        unlockReason: dto.reason,
      },
    });

    await this.auditLog.write({
      actorId: user.id,
      actorType: 'STAFF',
      actorRole: user.roles.join(','),
      action: 'SCORE_UNLOCK',
      entityType: 'ScoreSubmission',
      entityId: submission.id,
      beforeJson: { locked: true },
      afterJson: { locked: false, reason: dto.reason },
    });

    return updated;
  }

  async getScores(
    query: QueryScoresDto,
    user: RequestUser,
  ): Promise<ScoreGridResponse> {
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: query.classSubjectId },
    });
    if (!classSubject) {
      throw new NotFoundException('Class/subject mapping not found');
    }

    // CLASS_TEACHER is included here (not just SUBJECT_TEACHER-via-assignment
    // below) to match the controller's @Roles list and the broadsheet's same
    // bypass — docs §5/§10's "consolidated view of all subject scores for
    // their class" means a Class Teacher legitimately needs to read a
    // subject's grid even when they don't personally teach it.
    const isPrivileged = user.roles.some((role) =>
      [
        'ADMIN',
        'EXAM_OFFICER',
        'VICE_PRINCIPAL',
        'HOD',
        'CLASS_TEACHER',
      ].includes(role),
    );
    if (!isPrivileged) {
      const assignment = await this.prisma.teacherAssignment.findUnique({
        where: {
          staffId_classSubjectId_termId: {
            staffId: user.id,
            classSubjectId: query.classSubjectId,
            termId: query.termId,
          },
        },
      });
      if (!assignment) {
        throw new ForbiddenException(
          'You are not assigned to teach this class/subject this term',
        );
      }
    }

    const components = await this.assessmentService.getEffectiveComponents(
      query.termId,
      classSubject.subjectId,
    );
    const scale = await this.gradingService.loadScale();

    const [enrollments, scores, submission] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          classId: classSubject.classId,
          termId: query.termId,
          status: 'ACTIVE',
        },
        include: { student: true },
        orderBy: [
          { student: { lastName: 'asc' } },
          { student: { firstName: 'asc' } },
        ],
      }),
      this.prisma.score.findMany({
        where: { classSubjectId: query.classSubjectId, termId: query.termId },
      }),
      this.prisma.scoreSubmission.findUnique({
        where: {
          classSubjectId_termId: {
            classSubjectId: query.classSubjectId,
            termId: query.termId,
          },
        },
      }),
    ]);

    const scoresByStudent = new Map<string, Score[]>();
    for (const score of scores) {
      const existing = scoresByStudent.get(score.studentId) ?? [];
      existing.push(score);
      scoresByStudent.set(score.studentId, existing);
    }

    const rows = enrollments.map((enrollment) => {
      const studentScores = scoresByStudent.get(enrollment.studentId) ?? [];
      const scoreByComponent = new Map(
        studentScores.map((s) => [s.assessmentComponentId, s.score]),
      );
      const total = this.computeSubjectPercentage(studentScores, components);
      const { grade, remark } = this.gradingService.gradeFromScale(
        total,
        scale,
      );

      return {
        studentId: enrollment.studentId,
        firstName: enrollment.student.firstName,
        lastName: enrollment.student.lastName,
        admissionNumber: enrollment.student.admissionNumber,
        photoUrl: enrollment.student.photoUrl,
        scores: components.map((component) => ({
          assessmentComponentId: component.id,
          name: component.name,
          maxScore: component.maxScore,
          score: scoreByComponent.get(component.id) ?? null,
        })),
        total,
        grade,
        remark,
      };
    });

    return {
      locked: submission?.locked ?? false,
      submittedAt: submission?.submittedAt.toISOString() ?? null,
      unlockReason: submission?.unlockReason ?? null,
      components: components.map((c) => ({
        id: c.id,
        name: c.name,
        maxScore: c.maxScore,
        weight: c.weight,
      })),
      rows,
    };
  }
}
