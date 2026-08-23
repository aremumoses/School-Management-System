import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GradingScaleEntry {
  min: number;
  max: number;
  grade: string;
  remark: string;
}

export interface GradeResult {
  grade: string;
  remark: string;
}

const UNGRADED: GradeResult = { grade: '-', remark: 'Ungraded' };

/**
 * Resolves a percentage score against the school's configured grading
 * scale (docs/14-module-academic-results.md §4) — single school, single
 * scale, stored as School.gradingScale ({min,max,grade,remark}[]).
 */
@Injectable()
export class GradingService {
  constructor(private readonly prisma: PrismaService) {}

  async gradeFor(percentage: number): Promise<GradeResult> {
    const scale = await this.loadScale();
    return this.gradeFromScale(percentage, scale);
  }

  /**
   * Fetches the scale once for reuse across a whole broadsheet/report-card
   * batch, rather than re-querying School per student row.
   */
  async loadScale(): Promise<GradingScaleEntry[]> {
    const school = await this.prisma.school.findFirst();
    return (
      (school?.gradingScale as unknown as GradingScaleEntry[] | null) ?? []
    );
  }

  gradeFromScale(percentage: number, scale: GradingScaleEntry[]): GradeResult {
    const match = scale.find(
      (entry) => percentage >= entry.min && percentage <= entry.max,
    );
    return match ? { grade: match.grade, remark: match.remark } : UNGRADED;
  }
}
