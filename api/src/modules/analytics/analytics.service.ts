import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface PerformanceTrendPoint {
  termId: string;
  termName: string;
  /** Average score as a percentage (0–100) across all class+subject entries */
  averageScore: number;
  /** Per-class breakdown */
  byClass: { classId: string; className: string; averageScore: number }[];
}

export interface SubjectPerformanceRow {
  subjectId: string;
  subjectName: string;
  averageScore: number;
  entryCount: number;
}

export interface TeacherPerformanceRow {
  staffId: string;
  staffName: string;
  classSubjectId: string;
  subjectName: string;
  className: string;
  averageScore: number;
  entryCount: number;
}

export interface AttendanceTrendPoint {
  termId: string;
  termName: string;
  /** Daily (non-per-subject) attendance rate (0–100) */
  attendanceRate: number;
  totalDays: number;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPerformanceTrends(
    sessionId: string,
  ): Promise<PerformanceTrendPoint[]> {
    const terms = await this.prisma.term.findMany({
      where: { sessionId },
      orderBy: { startDate: 'asc' },
    });
    if (terms.length === 0) return [];

    const termIds = terms.map((t) => t.id);

    // Raw scores with component maxScores to compute normalised marks
    const scores = await this.prisma.score.findMany({
      where: { termId: { in: termIds } },
      include: {
        assessmentComponent: { select: { maxScore: true } },
        classSubject: {
          select: {
            class: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Group: termId → classId → normalised scores
    const byTermClass = new Map<string, Map<string, number[]>>();
    for (const score of scores) {
      const maxScore = score.assessmentComponent.maxScore;
      if (maxScore === 0) continue;
      const pct = (score.score / maxScore) * 100;

      if (!byTermClass.has(score.termId))
        byTermClass.set(score.termId, new Map());
      const byClass = byTermClass.get(score.termId)!;
      const classId = score.classSubject.class.id;
      if (!byClass.has(classId)) byClass.set(classId, []);
      byClass.get(classId)!.push(pct);
    }

    // Preload class names
    const classIds = [...new Set(scores.map((s) => s.classSubject.class.id))];
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, name: true },
    });
    const classNameMap = new Map(classes.map((c) => [c.id, c.name]));

    return terms.map((term) => {
      const byClass = byTermClass.get(term.id) ?? new Map<string, number[]>();
      const allScores: number[] = [];
      const classBreakdown = [...byClass.entries()].map(
        ([classId, classScores]) => {
          const avg =
            classScores.reduce((s, v) => s + v, 0) / classScores.length;
          allScores.push(...classScores);
          return {
            classId,
            className: classNameMap.get(classId) ?? classId,
            averageScore: Math.round(avg * 10) / 10,
          };
        },
      );
      const averageScore =
        allScores.length > 0
          ? Math.round(
              (allScores.reduce((s, v) => s + v, 0) / allScores.length) * 10,
            ) / 10
          : 0;
      return {
        termId: term.id,
        termName: term.name,
        averageScore,
        byClass: classBreakdown.sort((a, b) => b.averageScore - a.averageScore),
      };
    });
  }

  async getSubjectPerformance(
    termId: string,
  ): Promise<SubjectPerformanceRow[]> {
    const scores = await this.prisma.score.findMany({
      where: { termId },
      include: {
        assessmentComponent: { select: { maxScore: true } },
        classSubject: {
          select: { subject: { select: { id: true, name: true } } },
        },
      },
    });

    const bySubject = new Map<string, { name: string; scores: number[] }>();
    for (const s of scores) {
      const maxScore = s.assessmentComponent.maxScore;
      if (maxScore === 0) continue;
      const pct = (s.score / maxScore) * 100;
      const { id, name } = s.classSubject.subject;
      if (!bySubject.has(id)) bySubject.set(id, { name, scores: [] });
      bySubject.get(id)!.scores.push(pct);
    }

    return [...bySubject.entries()]
      .map(([subjectId, { name, scores }]) => ({
        subjectId,
        subjectName: name,
        averageScore:
          Math.round((scores.reduce((a, v) => a + v, 0) / scores.length) * 10) /
          10,
        entryCount: scores.length,
      }))
      .sort((a, b) => b.averageScore - a.averageScore);
  }

  async getTeacherPerformance(
    termId: string,
  ): Promise<TeacherPerformanceRow[]> {
    const scores = await this.prisma.score.findMany({
      where: { termId },
      include: {
        assessmentComponent: { select: { maxScore: true } },
        classSubject: {
          select: {
            id: true,
            subject: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
    });

    // Build classSubjectId → normalised score list
    const byClassSubject = new Map<
      string,
      { className: string; subjectName: string; scores: number[] }
    >();
    for (const s of scores) {
      const maxScore = s.assessmentComponent.maxScore;
      if (maxScore === 0) continue;
      const pct = (s.score / maxScore) * 100;
      const csId = s.classSubjectId;
      if (!byClassSubject.has(csId)) {
        byClassSubject.set(csId, {
          className: s.classSubject.class.name,
          subjectName: s.classSubject.subject.name,
          scores: [],
        });
      }
      byClassSubject.get(csId)!.scores.push(pct);
    }

    // Resolve teachers for these classSubjects
    const csIds = [...byClassSubject.keys()];
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: { classSubjectId: { in: csIds }, termId },
      include: {
        staff: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const csIdToTeacher = new Map(
      assignments.map((a) => [
        a.classSubjectId,
        {
          staffId: a.staffId,
          staffName: `${a.staff.firstName} ${a.staff.lastName}`,
        },
      ]),
    );

    return csIds
      .filter((csId) => csIdToTeacher.has(csId))
      .map((csId) => {
        const { className, subjectName, scores } = byClassSubject.get(csId)!;
        const { staffId, staffName } = csIdToTeacher.get(csId)!;
        return {
          staffId,
          staffName,
          classSubjectId: csId,
          subjectName,
          className,
          averageScore:
            Math.round(
              (scores.reduce((a, v) => a + v, 0) / scores.length) * 10,
            ) / 10,
          entryCount: scores.length,
        };
      })
      .sort((a, b) => b.averageScore - a.averageScore);
  }

  async getAttendanceTrends(
    sessionId: string,
  ): Promise<AttendanceTrendPoint[]> {
    const terms = await this.prisma.term.findMany({
      where: { sessionId },
      orderBy: { startDate: 'asc' },
    });
    if (terms.length === 0) return [];

    const termIds = terms.map((t) => t.id);

    const records = await this.prisma.attendance.groupBy({
      by: ['termId', 'status'],
      where: { termId: { in: termIds }, classSubjectId: null },
      _count: { status: true },
    });

    const byTerm = new Map<string, { present: number; total: number }>();
    for (const r of records) {
      if (!byTerm.has(r.termId)) byTerm.set(r.termId, { present: 0, total: 0 });
      const bucket = byTerm.get(r.termId)!;
      bucket.total += r._count.status;
      if (r.status === 'PRESENT' || r.status === 'LATE') {
        bucket.present += r._count.status;
      }
    }

    return terms.map((term) => {
      const bucket = byTerm.get(term.id) ?? { present: 0, total: 0 };
      return {
        termId: term.id,
        termName: term.name,
        attendanceRate:
          bucket.total > 0
            ? Math.round((bucket.present / bucket.total) * 1000) / 10
            : 0,
        totalDays: bucket.total,
      };
    });
  }
}
