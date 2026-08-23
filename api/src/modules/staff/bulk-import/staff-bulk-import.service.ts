import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import ExcelJS from 'exceljs';
import type { Role } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { assertEmailAvailableAcrossUserTypes } from '../../../common/utils/assert-email-available';
import { generateTempPassword } from '../../../common/utils/generate-temp-password';

const BCRYPT_ROUNDS = 10;

const VALID_ROLES = [
  'ADMIN',
  'VICE_PRINCIPAL',
  'HOD',
  'CLASS_TEACHER',
  'SUBJECT_TEACHER',
  'EXAM_OFFICER',
  'BURSAR',
  'LIBRARIAN',
  'HOSTEL_WARDEN',
  'TRANSPORT_OFFICER',
  'HR_OFFICER',
  'FRONT_DESK',
] as const;

const TEMPLATE_HEADERS = [
  'First Name',
  'Last Name',
  'Email',
  'Phone',
  'Employment Date (YYYY-MM-DD)',
  'Roles (comma-separated, e.g. SUBJECT_TEACHER,CLASS_TEACHER)',
];

export interface StaffImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentDate: string;
  roles: string[];
}

export interface StaffImportError {
  rowNumber: number;
  field: string;
  message: string;
}

export interface StaffBulkPreviewResult {
  valid: StaffImportRow[];
  errors: StaffImportError[];
  totalRows: number;
}

export interface StaffBulkCommitResult {
  created: number;
  skipped: number;
  staffIds: string[];
}

@Injectable()
export class StaffBulkImportService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Staff Import');
    const headerRow = sheet.addRow(TEMPLATE_HEADERS);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    TEMPLATE_HEADERS.forEach((h, i) => {
      sheet.getColumn(i + 1).width = Math.max(h.length + 4, 18);
    });
    // Example row
    sheet.addRow([
      'Ngozi',
      'Okafor',
      'ngozi.okafor@demoschool.ng',
      '+2348012345678',
      '2023-09-01',
      'SUBJECT_TEACHER,CLASS_TEACHER',
    ]);
    const buf = await wb.xlsx.writeBuffer();
    return Buffer.from(buf);
  }

  async preview(fileBuffer: Buffer): Promise<StaffBulkPreviewResult> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(
      fileBuffer as unknown as Parameters<typeof wb.xlsx.load>[0],
    );
    const sheet = wb.worksheets[0];

    const valid: StaffImportRow[] = [];
    const errors: StaffImportError[] = [];
    let rowNumber = 0;

    sheet.eachRow((row, idx) => {
      if (idx === 1) return; // skip header
      rowNumber++;
      const cells = (row.values as (string | null | undefined)[]).slice(1);
      const [firstName, lastName, email, phone, employmentDate, rolesRaw] =
        cells.map((c) => (c ?? '').toString().trim());

      const rowErrors: StaffImportError[] = [];

      if (!firstName)
        rowErrors.push({ rowNumber, field: 'First Name', message: 'Required' });
      if (!lastName)
        rowErrors.push({ rowNumber, field: 'Last Name', message: 'Required' });
      if (!email || !email.includes('@'))
        rowErrors.push({ rowNumber, field: 'Email', message: 'Invalid email' });

      const roles = rolesRaw
        .split(',')
        .map((r) => r.trim().toUpperCase())
        .filter(Boolean);
      if (roles.length === 0)
        rowErrors.push({
          rowNumber,
          field: 'Roles',
          message: 'At least one role required',
        });
      for (const role of roles) {
        if (!VALID_ROLES.includes(role as (typeof VALID_ROLES)[number]))
          rowErrors.push({
            rowNumber,
            field: 'Roles',
            message: `Unknown role: ${role}`,
          });
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        valid.push({
          rowNumber,
          firstName,
          lastName,
          email,
          phone,
          employmentDate,
          roles,
        });
      }
    });

    return { valid, errors, totalRows: rowNumber };
  }

  async commit(rows: StaffImportRow[]): Promise<StaffBulkCommitResult> {
    const staffIds: string[] = [];
    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        // Skip if email already exists in any user type
        const existing = await this.prisma.staff.findUnique({
          where: { email: row.email },
        });
        if (existing) {
          skipped++;
          continue;
        }
        await assertEmailAvailableAcrossUserTypes(
          this.prisma,
          row.email,
          'STAFF',
        );

        const temporaryPassword = generateTempPassword();
        const passwordHash = await bcrypt.hash(
          temporaryPassword,
          BCRYPT_ROUNDS,
        );

        const staff = await this.prisma.staff.create({
          data: {
            firstName: row.firstName,
            lastName: row.lastName,
            email: row.email,
            phone: row.phone || null,
            employmentDate: row.employmentDate
              ? new Date(row.employmentDate)
              : null,
            passwordHash,
            roles: {
              create: row.roles.map((role) => ({ role: role as Role })),
            },
          },
        });

        staffIds.push(staff.id);
        created++;
      } catch {
        skipped++;
      }
    }

    return { created, skipped, staffIds };
  }
}
