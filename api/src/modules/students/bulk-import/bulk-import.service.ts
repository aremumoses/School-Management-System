import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ADMISSION_NUMBER_LOCK_KEY } from '../../../common/utils/admission-number-lock';
import { assertEmailAvailableAcrossUserTypes } from '../../../common/utils/assert-email-available';
import { generateTempPassword } from '../../../common/utils/generate-temp-password';
import { translatePrismaError } from '../../../common/utils/prisma-error';
import { BulkImportCommitDto } from '../dto/bulk-import-commit.dto';
import type {
  BulkImportCommitResult,
  BulkImportPreviewResult,
  InvalidStudentImportRow,
  ValidStudentImportRow,
} from './bulk-import.types';
import {
  cleanString,
  isPlausibleEmail,
  normalizeHeader,
  parseFlexibleDate,
  parseGender,
} from './parse-helpers';

const BCRYPT_ROUNDS = 10;

const TEMPLATE_HEADERS = [
  'First Name',
  'Last Name',
  'Date of Birth',
  'Gender',
  'State of Origin',
  'LGA',
  'Religion',
  'Blood Group',
  'Genotype',
  'Address',
  'Class',
  'Arm',
  'Guardian First Name',
  'Guardian Last Name',
  'Guardian Email',
  'Guardian Phone',
  'Relationship',
];

const TEMPLATE_EXAMPLE_ROW = [
  'Aisha',
  'Bello',
  '2012-04-20',
  'FEMALE',
  'Lagos',
  'Ikeja',
  'Islam',
  'O+',
  'AA',
  '12 Allen Avenue, Ikeja',
  'JSS1',
  'Gold',
  'Funke',
  'Bello',
  'funke.bello@example.com',
  '+2348012345678',
  'Mother',
];

@Injectable()
export class BulkImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** A ready-to-fill .xlsx with the exact headers preview()/commit() expect, plus one example row — see bulk-import.controller.ts. */
  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    const headerRow = sheet.addRow(TEMPLATE_HEADERS);
    headerRow.font = { bold: true };
    sheet.addRow(TEMPLATE_EXAMPLE_ROW);
    sheet.columns.forEach((column) => {
      column.width = 22;
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async preview(
    buffer: Buffer,
    termId: string,
  ): Promise<BulkImportPreviewResult> {
    const term = await this.prisma.term.findUnique({ where: { id: termId } });
    if (!term) {
      throw new BadRequestException(
        'termId does not refer to an existing term',
      );
    }

    const workbook = new ExcelJS.Workbook();
    try {
      // exceljs's bundled types declare a non-generic `Buffer` that doesn't
      // structurally match @types/node's current generic `Buffer<T>` — a
      // type-checking-only mismatch (both are real Node Buffers at
      // runtime), so the cast here is safe.
      await workbook.xlsx.load(
        buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
      );
    } catch {
      throw new BadRequestException(
        'Could not read this file — is it a valid .xlsx spreadsheet?',
      );
    }
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('The spreadsheet has no worksheets');
    }

    const headerRow = sheet.getRow(1);
    const columnIndexToField = new Map<number, string>();
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const field = normalizeHeader(cleanString(cell.value) ?? '');
      if (field) columnIndexToField.set(colNumber, field);
    });

    const requiredFields = [
      'firstName',
      'lastName',
      'dateOfBirth',
      'gender',
      'className',
      'armName',
      'guardianFirstName',
      'guardianLastName',
      'guardianEmail',
      'guardianRelationship',
    ];
    const missingHeaders = requiredFields.filter(
      (f) => ![...columnIndexToField.values()].includes(f),
    );
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `The spreadsheet is missing required column(s): ${missingHeaders.join(', ')}`,
      );
    }

    // Cache classes/arms once rather than re-querying per row.
    const classes = await this.prisma.class.findMany({
      include: { arms: true },
    });
    const findClassArm = (className: string, armName: string) => {
      const klass = classes.find(
        (c) => c.name.toLowerCase() === className.toLowerCase(),
      );
      if (!klass) return { classId: null, armId: null };
      const arm = klass.arms.find(
        (a) => a.name.toLowerCase() === armName.toLowerCase(),
      );
      return { classId: klass.id, armId: arm?.id ?? null };
    };

    const valid: ValidStudentImportRow[] = [];
    const invalid: InvalidStudentImportRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // header

      const raw: Record<string, unknown> = {};
      columnIndexToField.forEach((field, colNumber) => {
        raw[field] = row.getCell(colNumber).value;
      });

      // A fully blank row (e.g. trailing spreadsheet padding) is skipped silently, not reported as an error.
      const isEntirelyBlank = Object.values(raw).every(
        (v) => cleanString(v) === null,
      );
      if (isEntirelyBlank) return;

      const errors: string[] = [];
      const displayData: Record<string, string> = {};
      for (const [field, value] of Object.entries(raw)) {
        displayData[field] = cleanString(value) ?? '';
      }

      const firstName = cleanString(raw.firstName);
      if (!firstName) errors.push('firstName is required');

      const lastName = cleanString(raw.lastName);
      if (!lastName) errors.push('lastName is required');

      const dateOfBirth = parseFlexibleDate(raw.dateOfBirth);
      if (!dateOfBirth) {
        errors.push(
          'dateOfBirth is required and must be a valid date (YYYY-MM-DD or DD/MM/YYYY)',
        );
      } else if (dateOfBirth.getTime() > Date.now()) {
        errors.push('dateOfBirth cannot be in the future');
      }

      const gender = parseGender(raw.gender);
      if (!gender) errors.push('gender must be MALE/FEMALE (or M/F)');

      const className = cleanString(raw.className);
      const armName = cleanString(raw.armName);
      let classId: string | null = null;
      let armId: string | null = null;
      if (!className) {
        errors.push('class is required');
      } else if (!armName) {
        errors.push('arm is required');
      } else {
        const resolved = findClassArm(className, armName);
        classId = resolved.classId;
        armId = resolved.armId;
        if (!classId) errors.push(`Class "${className}" does not exist`);
        else if (!armId)
          errors.push(
            `Arm "${armName}" does not exist in class "${className}"`,
          );
      }

      const guardianFirstName = cleanString(raw.guardianFirstName);
      if (!guardianFirstName) errors.push('guardianFirstName is required');

      const guardianLastName = cleanString(raw.guardianLastName);
      if (!guardianLastName) errors.push('guardianLastName is required');

      const guardianEmail = cleanString(raw.guardianEmail);
      if (!guardianEmail) {
        errors.push('guardianEmail is required');
      } else if (!isPlausibleEmail(guardianEmail)) {
        errors.push('guardianEmail is not a valid email address');
      }

      const guardianRelationship = cleanString(raw.guardianRelationship);
      if (!guardianRelationship)
        errors.push('guardianRelationship is required');

      if (errors.length > 0) {
        invalid.push({ rowNumber, data: displayData, errors });
        return;
      }

      valid.push({
        rowNumber,
        firstName: firstName!,
        lastName: lastName!,
        dateOfBirth: dateOfBirth!.toISOString().slice(0, 10),
        gender: gender!,
        stateOfOrigin: cleanString(raw.stateOfOrigin),
        lga: cleanString(raw.lga),
        religion: cleanString(raw.religion),
        bloodGroup: cleanString(raw.bloodGroup),
        genotype: cleanString(raw.genotype),
        address: cleanString(raw.address),
        className: className!,
        armName: armName!,
        classId: classId!,
        armId: armId!,
        guardianFirstName: guardianFirstName!,
        guardianLastName: guardianLastName!,
        guardianEmail: guardianEmail!,
        guardianPhone: cleanString(raw.guardianPhone),
        guardianRelationship: guardianRelationship!,
      });
    });

    await this.flagCrossTableEmailCollisions(valid, invalid);

    return { valid, invalid };
  }

  /**
   * Moves any "valid" row whose guardianEmail already belongs to a Staff
   * or Student account into `invalid` — without this, that collision only
   * surfaces as a commitRow() failure *after* the admin already confirmed
   * the preview looked all-clear, which works against this stage's "clear,
   * actionable validation report before committing" goal. Matching an
   * *existing Guardian* is the intended sibling-dedup path (see
   * commitRow), so only Staff/Student matches count as a collision here.
   */
  private async flagCrossTableEmailCollisions(
    valid: ValidStudentImportRow[],
    invalid: InvalidStudentImportRow[],
  ): Promise<void> {
    const candidateEmails = [...new Set(valid.map((r) => r.guardianEmail))];
    if (candidateEmails.length === 0) return;

    const [staffMatches, studentMatches] = await Promise.all([
      this.prisma.staff.findMany({
        where: { email: { in: candidateEmails } },
        select: { email: true },
      }),
      this.prisma.student.findMany({
        where: { email: { in: candidateEmails } },
        select: { email: true },
      }),
    ]);
    const blockedEmails = new Set([
      ...staffMatches.map((s) => s.email),
      ...studentMatches
        .map((s) => s.email)
        .filter((e): e is string => e !== null),
    ]);
    if (blockedEmails.size === 0) return;

    const stillValid: ValidStudentImportRow[] = [];
    for (const row of valid) {
      if (!blockedEmails.has(row.guardianEmail)) {
        stillValid.push(row);
        continue;
      }
      const data: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        data[key] = value === null || value === undefined ? '' : String(value);
      }
      invalid.push({
        rowNumber: row.rowNumber,
        data,
        errors: [
          `guardianEmail "${row.guardianEmail}" is already used by a staff or student account`,
        ],
      });
    }
    valid.length = 0;
    valid.push(...stillValid);
  }

  /**
   * Processes rows sequentially (not all in one giant transaction) so one
   * bad row doesn't roll back the rest of an otherwise-valid batch — each
   * row's Guardian-find-or-create + Student + link + Enrollment is its own
   * small transaction. Sequential (not parallel) processing is what lets a
   * shared guardian email across sibling rows resolve correctly: by the
   * time row 2 runs, row 1's guardian (if newly created) has already
   * committed and is found by row 2's lookup instead of being duplicated.
   */
  async commit(dto: BulkImportCommitDto): Promise<BulkImportCommitResult> {
    const term = await this.prisma.term.findUnique({
      where: { id: dto.termId },
    });
    if (!term) {
      throw new BadRequestException(
        'termId does not refer to an existing term',
      );
    }

    const results: BulkImportCommitResult['results'] = [];

    for (const row of dto.rows) {
      try {
        const { studentId, admissionNumber } = await this.commitRow(
          row,
          dto.termId,
        );
        results.push({
          rowNumber: row.rowNumber,
          success: true,
          studentId,
          admissionNumber,
        });
      } catch (error) {
        results.push({
          rowNumber: row.rowNumber,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return {
      results,
      succeededCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
    };
  }

  private async commitRow(
    row: BulkImportCommitDto['rows'][number],
    termId: string,
  ): Promise<{ studentId: string; admissionNumber: string }> {
    try {
      return await this.runCommitRowTransaction(row, termId);
    } catch (error) {
      // Translates the rare case of two concurrent imports computing the
      // same next admission-number sequence (a P2002 on Student.admissionNumber)
      // into a message that explains what to do, instead of leaking a raw
      // Prisma constraint-violation string into the per-row result the
      // admin sees in BulkImportWizard's success/failure summary.
      translatePrismaError(
        error,
        'Admission number collision with another import running at the same time — retry this row',
      );
    }
  }

  private async runCommitRowTransaction(
    row: BulkImportCommitDto['rows'][number],
    termId: string,
  ): Promise<{ studentId: string; admissionNumber: string }> {
    return this.prisma.$transaction(async (tx) => {
      let guardian = await tx.guardian.findUnique({
        where: { email: row.guardianEmail },
      });
      if (!guardian) {
        // Deliberately checked against the outer (non-transactional) client,
        // not tx — this is a defensive cross-table advisory check, not a
        // hard concurrency invariant, and the utility is typed against
        // PrismaService rather than Prisma.TransactionClient.
        await assertEmailAvailableAcrossUserTypes(
          this.prisma,
          row.guardianEmail,
          'GUARDIAN',
        );
        const passwordHash = await bcrypt.hash(
          generateTempPassword(),
          BCRYPT_ROUNDS,
        );
        guardian = await tx.guardian.create({
          data: {
            firstName: row.guardianFirstName,
            lastName: row.guardianLastName,
            email: row.guardianEmail,
            phone: row.guardianPhone,
            passwordHash,
          },
        });
      }

      // Same lock key as students.service.ts's createStudent — without
      // sharing it, a concurrent single-create and a bulk-import row (or
      // two concurrent bulk-import requests) can still both read the same
      // "current max" and collide on Student.admissionNumber, since each
      // path's own internal sequencing only protects it against itself.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${ADMISSION_NUMBER_LOCK_KEY})`;
      const admissionNumber = await this.generateAdmissionNumberInTx(tx);
      const student = await tx.student.create({
        data: {
          admissionNumber,
          firstName: row.firstName,
          lastName: row.lastName,
          dateOfBirth: new Date(row.dateOfBirth),
          gender: row.gender,
          stateOfOrigin: row.stateOfOrigin,
          lga: row.lga,
          religion: row.religion,
          bloodGroup: row.bloodGroup,
          genotype: row.genotype,
          address: row.address,
        },
      });

      await tx.studentGuardian.create({
        data: {
          studentId: student.id,
          guardianId: guardian.id,
          relationship: row.guardianRelationship,
        },
      });

      await tx.enrollment.create({
        data: {
          studentId: student.id,
          classId: row.classId,
          armId: row.armId,
          termId,
          status: 'ACTIVE',
        },
      });

      return { studentId: student.id, admissionNumber };
    });
  }

  /** Same {year}{sequence} scheme as students.service.ts's generateAdmissionNumber, but reading through the active transaction so sequential rows in one commit never collide. */
  private async generateAdmissionNumberInTx(
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const school = await tx.school.findFirst();
    const format = school?.admissionNumberFormat ?? 'STU{year}{sequence}';
    const year = new Date().getFullYear().toString();

    const escaped = format.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped
      .replace('\\{year\\}', year)
      .replace('\\{sequence\\}', '(\\d+)');
    const regex = new RegExp(`^${pattern}$`);

    const prefix = format.split('{sequence}')[0].replace('{year}', year);
    const existing = await tx.student.findMany({
      where: { admissionNumber: { startsWith: prefix } },
      select: { admissionNumber: true },
    });

    let maxSequence = 0;
    for (const { admissionNumber } of existing) {
      const match = regex.exec(admissionNumber);
      if (match) maxSequence = Math.max(maxSequence, parseInt(match[1], 10));
    }

    const nextSequence = (maxSequence + 1).toString().padStart(3, '0');
    return format.replace('{year}', year).replace('{sequence}', nextSequence);
  }
}
