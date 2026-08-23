import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentService } from '../assessment/assessment.service';
import { GradingService } from '../../common/grading/grading.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RequestUser } from '../../common/types/auth.types';
import { ScoresService } from '../scores/scores.service';

const PRIVILEGED_ROLES = ['ADMIN', 'VICE_PRINCIPAL', 'EXAM_OFFICER', 'HOD'];

export interface TranscriptSubjectEntry {
  subjectName: string;
  total: number;
  grade: string;
  remark: string;
}

export interface TranscriptTermEntry {
  termId: string;
  armId: string;
  sessionName: string;
  termName: string;
  className: string;
  armName: string;
  enrollmentStatus: string;
  overallAverage: number | null;
  overallPosition: number | null;
  classSize: number | null;
  reportCardUrl: string | null;
  subjects: TranscriptSubjectEntry[];
}

export interface TranscriptResponse {
  student: { firstName: string; lastName: string; admissionNumber: string };
  terms: TranscriptTermEntry[];
}

/**
 * Aggregates a student's results across every session they've ever been
 * enrolled in (docs §9) — used for transfers, scholarships, post-graduation
 * reference. Low-traffic by nature, so the per-term queries below favor
 * clarity over batching.
 */
@Injectable()
export class TranscriptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentService: AssessmentService,
    private readonly scoresService: ScoresService,
    private readonly gradingService: GradingService,
  ) {}

  async getTranscript(
    studentId: string,
    user: RequestUser,
  ): Promise<TranscriptResponse> {
    await this.assertAccess(studentId, user);

    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      include: { class: true, arm: true, term: { include: { session: true } } },
      orderBy: { term: { startDate: 'asc' } },
    });

    const results = await this.prisma.studentTermResult.findMany({
      where: { studentId },
    });
    const resultByTerm = new Map(results.map((r) => [r.termId, r]));
    const scale = await this.gradingService.loadScale();

    const terms: TranscriptTermEntry[] = [];
    for (const enrollment of enrollments) {
      const result = resultByTerm.get(enrollment.termId);

      const classSubjects = await this.prisma.classSubject.findMany({
        where: { classId: enrollment.classId },
        include: { subject: true },
      });
      const scores = await this.prisma.score.findMany({
        where: {
          studentId,
          termId: enrollment.termId,
          classSubjectId: { in: classSubjects.map((c) => c.id) },
        },
      });
      const scoresByClassSubject = new Map<string, typeof scores>();
      for (const score of scores) {
        const list = scoresByClassSubject.get(score.classSubjectId) ?? [];
        list.push(score);
        scoresByClassSubject.set(score.classSubjectId, list);
      }

      const subjects: TranscriptSubjectEntry[] = [];
      for (const cs of classSubjects) {
        const subjectScores = scoresByClassSubject.get(cs.id) ?? [];
        if (subjectScores.length === 0) continue;
        const components = await this.assessmentService.getEffectiveComponents(
          enrollment.termId,
          cs.subjectId,
        );
        const total = this.scoresService.computeSubjectPercentage(
          subjectScores,
          components,
        );
        const { grade, remark } = this.gradingService.gradeFromScale(
          total,
          scale,
        );
        subjects.push({ subjectName: cs.subject.name, total, grade, remark });
      }

      terms.push({
        termId: enrollment.termId,
        armId: enrollment.armId,
        sessionName: enrollment.term.session.name,
        termName: enrollment.term.name,
        className: enrollment.class.name,
        armName: enrollment.arm.name,
        enrollmentStatus: enrollment.status,
        overallAverage: result?.overallAverage ?? null,
        overallPosition: result?.overallPosition ?? null,
        classSize: result?.classSize ?? null,
        reportCardUrl: result?.reportCardUrl ?? null,
        subjects,
      });
    }

    return {
      student: {
        firstName: student.firstName,
        lastName: student.lastName,
        admissionNumber: student.admissionNumber,
      },
      terms,
    };
  }

  private async assertAccess(
    studentId: string,
    user: RequestUser,
  ): Promise<void> {
    if (user.roles.includes('STUDENT')) {
      if (user.id !== studentId) {
        throw new ForbiddenException('You can only view your own transcript');
      }
      return;
    }
    if (user.roles.includes('PARENT')) {
      const link = await this.prisma.studentGuardian.findFirst({
        where: { studentId, guardianId: user.id },
      });
      if (!link) {
        throw new ForbiddenException(
          "You can only view your own ward's transcript",
        );
      }
      return;
    }
    if (!user.roles.some((role) => PRIVILEGED_ROLES.includes(role))) {
      throw new ForbiddenException('You do not have access to this transcript');
    }
  }
}
