import { BadRequestException, Injectable } from '@nestjs/common';
import { GradingService } from '../../common/grading/grading.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AssessmentService } from '../assessment/assessment.service';
import { ScoresService } from '../scores/scores.service';

// No School-level "passing percentage" field exists (Stage 5 only stores a
// list of {min,max,grade,remark} bands — see grading.service.ts) — a
// student is treated as passing when their grade band's remark isn't
// "Fail" (the seeded WAEC-style scale's own convention for its lowest
// band). If no scale is configured at all, fall back to the common
// WAEC/NECO 40% pass line rather than fail loudly, since this is a
// read-only stats view, not a workflow gate.
const FALLBACK_PASS_PERCENTAGE = 40;

export interface PassRateRow {
  classSubjectId: string;
  className: string;
  subjectName: string;
  studentCount: number;
  average: number | null;
  passRate: number | null;
}

export interface SubjectComparisonRow {
  subjectId: string;
  subjectName: string;
  studentCount: number;
  average: number | null;
  passRate: number | null;
}

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentService: AssessmentService,
    private readonly scoresService: ScoresService,
    private readonly gradingService: GradingService,
  ) {}

  async getPassRate(
    termId: string | undefined,
    classId?: string,
    subjectId?: string,
  ): Promise<PassRateRow[]> {
    const resolvedTermId = await this.resolveTermId(termId);
    const scale = await this.gradingService.loadScale();

    const classSubjects = await this.prisma.classSubject.findMany({
      where: {
        ...(classId && { classId }),
        ...(subjectId && { subjectId }),
      },
      include: { class: true, subject: true },
    });

    const rows: PassRateRow[] = [];
    for (const cs of classSubjects) {
      const percentages = await this.percentagesForClassSubjects(
        [cs.id],
        cs.subjectId,
        resolvedTermId,
      );
      rows.push({
        classSubjectId: cs.id,
        className: cs.class.name,
        subjectName: cs.subject.name,
        studentCount: percentages.length,
        average: this.average(percentages),
        passRate: this.passRate(percentages, scale),
      });
    }
    return rows;
  }

  async getSubjectComparison(
    termId: string | undefined,
  ): Promise<SubjectComparisonRow[]> {
    const resolvedTermId = await this.resolveTermId(termId);
    const scale = await this.gradingService.loadScale();

    const subjects = await this.prisma.subject.findMany({
      include: { classSubjects: true },
      orderBy: { name: 'asc' },
    });

    const rows: SubjectComparisonRow[] = [];
    for (const subject of subjects) {
      if (subject.classSubjects.length === 0) continue;
      const classSubjectIds = subject.classSubjects.map((cs) => cs.id);
      const percentages = await this.percentagesForClassSubjects(
        classSubjectIds,
        subject.id,
        resolvedTermId,
      );
      if (percentages.length === 0) continue;
      rows.push({
        subjectId: subject.id,
        subjectName: subject.name,
        studentCount: percentages.length,
        average: this.average(percentages),
        passRate: this.passRate(percentages, scale),
      });
    }
    return rows;
  }

  /** One student's total percentage per classSubject, for every enrolled+scored student, across the given classSubjects (all mapping to the same subjectId). */
  private async percentagesForClassSubjects(
    classSubjectIds: string[],
    subjectId: string,
    termId: string,
  ): Promise<number[]> {
    const components = await this.assessmentService.getEffectiveComponents(
      termId,
      subjectId,
    );
    if (components.length === 0) return [];

    const scores = await this.prisma.score.findMany({
      where: { classSubjectId: { in: classSubjectIds }, termId },
    });
    if (scores.length === 0) return [];

    const scoresByStudent = new Map<string, typeof scores>();
    for (const score of scores) {
      const list = scoresByStudent.get(score.studentId) ?? [];
      list.push(score);
      scoresByStudent.set(score.studentId, list);
    }

    return [...scoresByStudent.values()].map((studentScores) =>
      this.scoresService.computeSubjectPercentage(studentScores, components),
    );
  }

  private average(percentages: number[]): number | null {
    if (percentages.length === 0) return null;
    return percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
  }

  private passRate(
    percentages: number[],
    scale: Awaited<ReturnType<GradingService['loadScale']>>,
  ): number | null {
    if (percentages.length === 0) return null;
    const passing = percentages.filter((p) =>
      scale.length > 0
        ? this.gradingService.gradeFromScale(p, scale).remark.toLowerCase() !==
          'fail'
        : p >= FALLBACK_PASS_PERCENTAGE,
    );
    return (passing.length / percentages.length) * 100;
  }

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
}
