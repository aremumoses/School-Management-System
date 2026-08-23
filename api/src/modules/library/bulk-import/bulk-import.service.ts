import { BadRequestException, Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { translatePrismaError } from '../../../common/utils/prisma-error';
import { BulkImportCommitDto } from './bulk-import-commit.dto';
import type {
  BulkImportCommitResult,
  BulkImportPreviewResult,
  InvalidBookImportRow,
  ValidBookImportRow,
} from './bulk-import.types';

const HEADER_ALIASES: Record<string, string> = {
  title: 'title',
  author: 'author',
  isbn: 'isbn',
  isbnbarcode: 'isbn',
  barcode: 'isbn',
  category: 'category',
  totalcopies: 'totalCopies',
  copies: 'totalCopies',
  numberofcopies: 'totalCopies',
  shelflocation: 'shelfLocation',
  shelf: 'shelfLocation',
  location: 'shelfLocation',
};

function normalizeHeader(raw: string): string | null {
  const key = raw
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  return HEADER_ALIASES[key] ?? null;
}

/** Same reasoning as students/bulk-import/parse-helpers.ts's cleanString — blank/rich-text cells become null, never a stringified object. */
function cleanString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    typeof value !== 'boolean'
  ) {
    return null;
  }
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

const TEMPLATE_HEADERS = [
  'Title',
  'Author',
  'ISBN',
  'Category',
  'Total Copies',
  'Shelf Location',
];
const TEMPLATE_EXAMPLE_ROW = [
  'Things Fall Apart',
  'Chinua Achebe',
  '9780435905255',
  'Fiction',
  3,
  'Fiction Shelf 4B',
];

@Injectable()
export class LibraryBulkImportService {
  constructor(private readonly prisma: PrismaService) {}

  async buildTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Books');
    const headerRow = sheet.addRow(TEMPLATE_HEADERS);
    headerRow.font = { bold: true };
    sheet.addRow(TEMPLATE_EXAMPLE_ROW);
    sheet.columns.forEach((column) => {
      column.width = 22;
    });
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async preview(buffer: Buffer): Promise<BulkImportPreviewResult> {
    const workbook = new ExcelJS.Workbook();
    try {
      // See students/bulk-import/bulk-import.service.ts's identical cast —
      // exceljs's bundled Buffer type doesn't structurally match
      // @types/node's, type-checking-only mismatch.
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

    const requiredFields = ['title', 'author', 'category', 'totalCopies'];
    const missingHeaders = requiredFields.filter(
      (f) => ![...columnIndexToField.values()].includes(f),
    );
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `The spreadsheet is missing required column(s): ${missingHeaders.join(', ')}`,
      );
    }

    const valid: ValidBookImportRow[] = [];
    const invalid: InvalidBookImportRow[] = [];

    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;

      const raw: Record<string, unknown> = {};
      columnIndexToField.forEach((field, colNumber) => {
        raw[field] = row.getCell(colNumber).value;
      });

      const isEntirelyBlank = Object.values(raw).every(
        (v) => cleanString(v) === null,
      );
      if (isEntirelyBlank) return;

      const errors: string[] = [];
      const displayData: Record<string, string> = {};
      for (const [field, value] of Object.entries(raw)) {
        displayData[field] = cleanString(value) ?? '';
      }

      const title = cleanString(raw.title);
      if (!title) errors.push('title is required');

      const author = cleanString(raw.author);
      if (!author) errors.push('author is required');

      const category = cleanString(raw.category);
      if (!category) errors.push('category is required');

      const totalCopiesStr = cleanString(raw.totalCopies);
      let totalCopies = 0;
      if (!totalCopiesStr) {
        errors.push('totalCopies is required');
      } else {
        totalCopies = Number(totalCopiesStr);
        if (!Number.isInteger(totalCopies) || totalCopies < 1) {
          errors.push('totalCopies must be a whole number of 1 or more');
        }
      }

      if (errors.length > 0) {
        invalid.push({ rowNumber, data: displayData, errors });
        return;
      }

      valid.push({
        rowNumber,
        title: title!,
        author: author!,
        isbn: cleanString(raw.isbn),
        category: category!,
        totalCopies,
        shelfLocation: cleanString(raw.shelfLocation),
      });
    });

    return { valid, invalid };
  }

  /** One row at a time (not Promise.all) so an ISBN collision on one row never rolls back the rest of the batch — same reasoning as students' bulk-import. */
  async commit(dto: BulkImportCommitDto): Promise<BulkImportCommitResult> {
    const results: BulkImportCommitResult['results'] = [];

    for (const row of dto.rows) {
      try {
        const book = await this.prisma.book.create({
          data: {
            title: row.title,
            author: row.author,
            isbn: row.isbn,
            category: row.category,
            totalCopies: row.totalCopies,
            shelfLocation: row.shelfLocation,
          },
        });
        results.push({
          rowNumber: row.rowNumber,
          success: true,
          bookId: book.id,
        });
      } catch (error) {
        try {
          translatePrismaError(error, 'A book with this ISBN already exists');
        } catch (translated) {
          results.push({
            rowNumber: row.rowNumber,
            success: false,
            error:
              translated instanceof Error
                ? translated.message
                : 'Unknown error',
          });
        }
      }
    }

    return {
      results,
      succeededCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
    };
  }
}
