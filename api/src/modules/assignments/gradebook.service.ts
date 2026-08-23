import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AtRiskSettingsService } from '../at-risk/at-risk-settings.service';
import type { RequestUser } from '../../common/types/auth.types';

export interface GradebookStudentRow {
  studentId: string;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  /** Normalized percentage per term, null where the student has no scores that term */
  perTerm: { termId: string; termName: string; average: number | null }[];
  overallAverage: number | null;
  atRisk: boolean;
}

export interface GradebookResponse {
  classSubjectId: string;
  subjectName: string;
  className: string;
  sessionId: string;
  threshold: number;
  terms: { termId: string; termName: string }[];
  students: GradebookStudentRow[];
  classAverage: number | null;
  highest: number | null;
  lowest: number | null;
  /** score-range → count of students (by overall average) */
  distribution: { range: string; count: number }[];
}

const DISTRIBUTION_BUCKETS = [
  { range: '0–39', min: 0, max: 39.99 },
  { range: '40–49', min: 40, max: 49.99 },
  { range: '50–59', min: 50, max: 59.99 },
  { range: '60–69', min: 60, max: 69.99 },
  { range: '70–100', min: 70, max: 100 },
];

/**
 * docs/05 §5 — read-only aggregation over existing Score records, no new
 * model. The at-risk threshold is a query param with a default — Stage 29
 * moved that default to the shared AtRiskThresholdConfig (same config the
 * new AtRiskFlag scheduled job and Stage 4's chronic-absenteeism default
 * now both read from too), rather than the 40 that used to be hardcoded
 * in GradebookController's DefaultValuePipe. An explicit query param
 * still overrides it.
 */
@Injectable()
export class GradebookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly atRiskSettings: AtRiskSettingsService,
  ) {}

  async getGradebook(
    classSubjectId: string,
    sessionId: string,
    threshold: number | undefined,
    user: RequestUser,
  ): Promise<GradebookResponse> {
    if (threshold === undefined) {
      threshold = (await this.atRiskSettings.loadConfig()).caAverageFloor;
    }
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: { subject: true, class: true },
    });
    if (!classSubject) throw new NotFoundException('ClassSubject not found');

    const terms = await this.prisma.term.findMany({
      where: { sessionId },
      orderBy: { startDate: 'asc' },
    });
    if (terms.length === 0) {
      throw new NotFoundException('Session not found or has no terms');
    }

    // Teachers only see gradebooks for class/subjects they're assigned to
    // (any term of the session); ADMIN is unscoped.
    if (!user.roles.includes('ADMIN')) {
      const assignment = await this.prisma.teacherAssignment.findFirst({
        where: {
          staffId: user.id,
          classSubjectId,
          termId: { in: terms.map((t) => t.id) },
        },
      });
      if (!assignment) {
        throw new ForbiddenException(
          'You are not assigned to teach this class/subject in this session',
        );
      }
    }

    const scores = await this.prisma.score.findMany({
      where: { classSubjectId, termId: { in: terms.map((t) => t.id) } },
      include: {
        assessmentComponent: { select: { maxScore: true } },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            admissionNumber: true,
          },
        },
      },
    });

    // studentId → termId → { scored, max }
    const byStudent = new Map<
      string,
      {
        student: (typeof scores)[0]['student'];
        byTerm: Map<string, { scored: number; max: number }>;
      }
    >();
    for (const score of scores) {
      if (!byStudent.has(score.studentId)) {
        byStudent.set(score.studentId, {
          student: score.student,
          byTerm: new Map(),
        });
      }
      const entry = byStudent.get(score.studentId)!;
      const bucket = entry.byTerm.get(score.termId) ?? { scored: 0, max: 0 };
      bucket.scored += score.score;
      bucket.max += score.assessmentComponent.maxScore;
      entry.byTerm.set(score.termId, bucket);
    }

    const students: GradebookStudentRow[] = [...byStudent.values()]
      .map(({ student, byTerm }) => {
        const perTerm = terms.map((term) => {
          const bucket = byTerm.get(term.id);
          return {
            termId: term.id,
            termName: term.name,
            average:
              bucket && bucket.max > 0
                ? Math.round((bucket.scored / bucket.max) * 1000) / 10
                : null,
          };
        });
        const withData = perTerm.filter(
          (t): t is typeof t & { average: number } => t.average !== null,
        );
        const overallAverage =
          withData.length > 0
            ? Math.round(
                (withData.reduce((s, t) => s + t.average, 0) /
                  withData.length) *
                  10,
              ) / 10
            : null;
        return {
          studentId: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionNumber: student.admissionNumber,
          perTerm,
          overallAverage,
          atRisk: overallAverage !== null && overallAverage < threshold,
        };
      })
      .sort((a, b) => (b.overallAverage ?? -1) - (a.overallAverage ?? -1));

    const averages = students
      .map((s) => s.overallAverage)
      .filter((a): a is number => a !== null);

    return {
      classSubjectId,
      subjectName: classSubject.subject.name,
      className: classSubject.class.name,
      sessionId,
      threshold,
      terms: terms.map((t) => ({ termId: t.id, termName: t.name })),
      students,
      classAverage:
        averages.length > 0
          ? Math.round(
              (averages.reduce((s, a) => s + a, 0) / averages.length) * 10,
            ) / 10
          : null,
      highest: averages.length > 0 ? Math.max(...averages) : null,
      lowest: averages.length > 0 ? Math.min(...averages) : null,
      distribution: DISTRIBUTION_BUCKETS.map((bucket) => ({
        range: bucket.range,
        count: averages.filter((a) => a >= bucket.min && a <= bucket.max)
          .length,
      })),
    };
  }
}
