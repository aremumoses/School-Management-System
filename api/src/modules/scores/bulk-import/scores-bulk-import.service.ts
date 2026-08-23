/**
 * Stage 13 — Scores bulk import for historical data migration.
 * Bypasses the teacher-assignment check (Admin is migrating existing records)
 * but validates max-score limits exactly like ScoresService.submit() does.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import { AssessmentService } from '../../assessment/assessment.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditLogService } from '../../../common/audit-log/audit-log.service';

export interface ScoreBulkEntry {
  studentId: string;
  assessmentComponentId: string;
  score: number;
}

export interface ScoreBulkPreviewResult {
  classSubjectId: string;
  termId: string;
  valid: ScoreBulkEntry[];
  errors: { studentId: string; componentId: string; message: string }[];
  totalRows: number;
}

@Injectable()
export class ScoresBulkImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentService: AssessmentService,
    private readonly auditLog: AuditLogService,
  ) {}

  async buildTemplate(classSubjectId: string, termId: string): Promise<Buffer> {
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      include: {
        class: true,
        subject: true,
      },
    });
    if (!classSubject) throw new NotFoundException('ClassSubject not found');

    const components = await this.assessmentService.assertReadyForSubmission(
      termId,
      classSubject.subjectId,
    );

    // Get enrolled students
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId: classSubject.classId, termId, status: 'ACTIVE' },
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
      orderBy: { student: { admissionNumber: 'asc' } },
    });

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet(
      `${classSubject.class.name} - ${classSubject.subject.name}`,
    );

    // Headers: fixed cols + one per component
    const headers = [
      'Student ID (do not edit)',
      'Admission No.',
      'First Name',
      'Last Name',
      ...components.map((c) => `${c.name} (max ${c.maxScore})`),
    ];
    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headers.forEach((h, i) => {
      sheet.getColumn(i + 1).width = Math.max(h.length + 2, 16);
    });

    // Add a comment row with componentIds
    const commentRow = sheet.addRow([
      'componentIds (do not edit)',
      '',
      '',
      '',
      ...components.map((c) => c.id),
    ]);
    commentRow.font = { color: { argb: 'FF999999' }, italic: true, size: 8 };

    // Student rows
    for (const enrollment of enrollments) {
      const s = enrollment.student;
      sheet.addRow([
        s.id,
        s.admissionNumber,
        s.firstName,
        s.lastName,
        ...components.map(() => ''),
      ]);
    }

    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async preview(
    fileBuffer: Buffer,
    classSubjectId: string,
    termId: string,
  ): Promise<ScoreBulkPreviewResult> {
    const classSubject = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
    });
    if (!classSubject) throw new NotFoundException('ClassSubject not found');

    const components = await this.assessmentService.assertReadyForSubmission(
      termId,
      classSubject.subjectId,
    );
    const componentById = new Map(components.map((c) => [c.id, c]));

    // Enrolled students for validation
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classId: classSubject.classId, termId, status: 'ACTIVE' },
    });
    const enrolledIds = new Set(enrollments.map((e) => e.studentId));

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(
      fileBuffer as unknown as Parameters<typeof wb.xlsx.load>[0],
    );
    const sheet = wb.worksheets[0];

    // Row 1 = headers, Row 2 = componentId hints, Row 3+ = data
    const componentIdRow = sheet.getRow(2).values as (
      | string
      | null
      | undefined
    )[];
    // componentIdRow[1] = 'componentIds (do not edit)', [2..3] = '', then component ids from [5] onward
    const componentIds = (componentIdRow as string[]).slice(5).filter(Boolean);

    const valid: ScoreBulkEntry[] = [];
    const errors: ScoreBulkPreviewResult['errors'] = [];
    let totalRows = 0;

    sheet.eachRow((row, idx) => {
      if (idx <= 2) return; // skip headers + comment row
      const cells = (
        row.values as (string | number | null | undefined)[]
      ).slice(1);
      const studentId = (cells[0] ?? '').toString().trim();
      if (!studentId) return;
      totalRows++;

      if (!enrolledIds.has(studentId)) {
        errors.push({
          studentId,
          componentId: '',
          message: 'Student not enrolled in this class/term',
        });
        return;
      }

      for (let i = 0; i < componentIds.length; i++) {
        const componentId = componentIds[i];
        const rawScore = cells[4 + i];
        if (rawScore === '' || rawScore === null || rawScore === undefined)
          continue;
        const score = Number(rawScore);
        if (isNaN(score)) {
          errors.push({
            studentId,
            componentId,
            message: `Invalid score value: ${String(rawScore)}`,
          });
          continue;
        }
        const component = componentById.get(componentId);
        if (!component) {
          errors.push({
            studentId,
            componentId,
            message: `Unknown component ID ${componentId}`,
          });
          continue;
        }
        if (score < 0 || score > component.maxScore) {
          errors.push({
            studentId,
            componentId,
            message: `Score ${score} exceeds max ${component.maxScore} for ${component.name}`,
          });
          continue;
        }
        valid.push({ studentId, assessmentComponentId: componentId, score });
      }
    });

    return { classSubjectId, termId, valid, errors, totalRows };
  }

  async commit(
    classSubjectId: string,
    termId: string,
    entries: ScoreBulkEntry[],
    actorId: string,
  ): Promise<{ upserted: number }> {
    // Validate max scores one more time on commit (same as submit does)
    const classSubject = await this.prisma.classSubject.findUniqueOrThrow({
      where: { id: classSubjectId },
    });
    const components = await this.assessmentService.assertReadyForSubmission(
      termId,
      classSubject.subjectId,
    );
    const componentById = new Map(components.map((c) => [c.id, c]));

    for (const entry of entries) {
      const component = componentById.get(entry.assessmentComponentId);
      if (!component)
        throw new BadRequestException(
          `Unknown component ${entry.assessmentComponentId}`,
        );
      if (entry.score > component.maxScore)
        throw new BadRequestException(
          `Score ${entry.score} exceeds max ${component.maxScore}`,
        );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        await tx.score.upsert({
          where: {
            studentId_classSubjectId_termId_assessmentComponentId: {
              studentId: entry.studentId,
              classSubjectId,
              termId,
              assessmentComponentId: entry.assessmentComponentId,
            },
          },
          update: { score: entry.score, enteredByStaffId: actorId },
          create: {
            studentId: entry.studentId,
            classSubjectId,
            termId,
            assessmentComponentId: entry.assessmentComponentId,
            score: entry.score,
            enteredByStaffId: actorId,
          },
        });
      }
    });

    await this.auditLog.write({
      actorId,
      actorType: 'STAFF',
      actorRole: 'ADMIN',
      action: 'SCORES_BULK_IMPORT',
      entityType: 'Score',
      afterJson: { classSubjectId, termId, count: entries.length },
    });

    return { upserted: entries.length };
  }
}
