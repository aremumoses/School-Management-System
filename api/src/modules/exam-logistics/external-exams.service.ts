import { Injectable, NotFoundException } from '@nestjs/common';
import type { ExternalExamCandidate } from '@prisma/client';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import {
  createSheet,
  sendExcelResponse,
} from '../../common/excel/excel-export.util';
import { GradingService } from '../../common/grading/grading.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { translatePrismaError } from '../../common/utils/prisma-error';
import { AssessmentService } from '../assessment/assessment.service';
import { ScoresService } from '../scores/scores.service';
import {
  CreateExternalExamCandidateDto,
  UpdateExternalExamCandidateDto,
} from './dto/exam-logistics.dto';

const CANDIDATE_INCLUDE = {
  student: {
    select: {
      id: true,
      admissionNumber: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      gender: true,
    },
  },
} as const;

export interface CaSummarySubject {
  subjectName: string;
  components: {
    name: string;
    maxScore: number;
    weight: number;
    score: number | null;
  }[];
  total: number;
  grade: string;
  remark: string;
}

@Injectable()
export class ExternalExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentService: AssessmentService,
    private readonly scoresService: ScoresService,
    private readonly gradingService: GradingService,
  ) {}

  async create(
    dto: CreateExternalExamCandidateDto,
  ): Promise<ExternalExamCandidate> {
    const student = await this.prisma.student.findUnique({
      where: { id: dto.studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    try {
      return await this.prisma.externalExamCandidate.create({
        data: {
          studentId: dto.studentId,
          examBody: dto.examBody,
          sessionYear: dto.sessionYear,
          subjectCombination: dto.subjectCombination,
          registrationNumber: dto.registrationNumber?.trim() || null,
        },
      });
    } catch (error) {
      return translatePrismaError(
        error,
        'This student is already registered for this exam body and session year',
      );
    }
  }

  async update(
    id: string,
    dto: UpdateExternalExamCandidateDto,
  ): Promise<ExternalExamCandidate> {
    await this.getOrThrow(id);
    return this.prisma.externalExamCandidate.update({
      where: { id },
      data: {
        ...(dto.subjectCombination !== undefined && {
          subjectCombination: dto.subjectCombination,
        }),
        ...(dto.registrationNumber !== undefined && {
          registrationNumber: dto.registrationNumber.trim() || null,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  list(examBody?: string, sessionYear?: number) {
    return this.prisma.externalExamCandidate.findMany({
      where: {
        ...(examBody && {
          examBody: examBody as ExternalExamCandidate['examBody'],
        }),
        ...(sessionYear && { sessionYear }),
      },
      include: CANDIDATE_INCLUDE,
      orderBy: [{ student: { lastName: 'asc' } }],
    });
  }

  private async getOrThrow(id: string): Promise<ExternalExamCandidate> {
    const candidate = await this.prisma.externalExamCandidate.findUnique({
      where: { id },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  /**
   * Best-generic-effort export — the *exact* per-body file format (WAEC's
   * CSV spec, NECO's, etc.) isn't standardized enough to hardcode
   * confidently without the school's current-year template in hand. This
   * is a starting point a school reformats from, not a guaranteed
   * drop-in upload file.
   */
  async exportCandidates(
    examBody: string | undefined,
    sessionYear: number | undefined,
    res: Response,
  ): Promise<void> {
    const candidates = await this.list(examBody, sessionYear);
    const wb = new ExcelJS.Workbook();
    const sheet = createSheet(wb, 'Candidates', [
      'Admission No.',
      'First Name',
      'Last Name',
      'Date of Birth',
      'Gender',
      'Exam Body',
      'Session Year',
      'Subject Combination',
      'Registration No.',
      'Status',
    ]);
    for (const c of candidates) {
      sheet.addRow([
        c.student.admissionNumber,
        c.student.firstName,
        c.student.lastName,
        c.student.dateOfBirth.toISOString().slice(0, 10),
        c.student.gender,
        c.examBody,
        c.sessionYear,
        c.subjectCombination.join(', '),
        c.registrationNumber ?? '',
        c.status,
      ]);
    }
    await sendExcelResponse(
      res,
      wb,
      `external-exam-candidates-${examBody ?? 'all'}-${Date.now()}.xlsx`,
    );
  }

  /**
   * Maps the student's existing internal CA scores (Stage 5's Score/
   * AssessmentComponent data) into a simple per-subject summary an Exam
   * Officer can cross-check before submission season — reuses
   * ScoresService.computeSubjectPercentage and GradingService.gradeFromScale
   * exactly as the broadsheet does, rather than re-deriving totals.
   */
  async getCaSummary(studentId: string): Promise<{
    studentId: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    termId: string;
    termName: string;
    subjects: CaSummarySubject[];
  }> {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, status: 'ACTIVE' },
      include: { class: true, term: true },
    });
    if (!enrollment) {
      throw new NotFoundException('This student has no active enrollment');
    }

    const classSubjects = await this.prisma.classSubject.findMany({
      where: { classId: enrollment.classId },
      include: { subject: true },
    });
    const scale = await this.gradingService.loadScale();

    const subjects: CaSummarySubject[] = [];
    for (const cs of classSubjects) {
      const components = await this.assessmentService.getEffectiveComponents(
        enrollment.termId,
        cs.subjectId,
      );
      if (components.length === 0) continue;

      const scores = await this.prisma.score.findMany({
        where: {
          studentId,
          classSubjectId: cs.id,
          termId: enrollment.termId,
        },
      });
      const scoreByComponent = new Map(
        scores.map((s) => [s.assessmentComponentId, s.score]),
      );
      const total = this.scoresService.computeSubjectPercentage(
        scores,
        components,
      );
      const { grade, remark } = this.gradingService.gradeFromScale(
        total,
        scale,
      );

      subjects.push({
        subjectName: cs.subject.name,
        components: components.map((c) => ({
          name: c.name,
          maxScore: c.maxScore,
          weight: c.weight,
          score: scoreByComponent.get(c.id) ?? null,
        })),
        total,
        grade,
        remark,
      });
    }

    return {
      studentId: student.id,
      admissionNumber: student.admissionNumber,
      firstName: student.firstName,
      lastName: student.lastName,
      termId: enrollment.termId,
      termName: enrollment.term.name,
      subjects,
    };
  }
}
