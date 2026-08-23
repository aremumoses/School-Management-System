import type { Response } from 'express';
import ExcelJS from 'exceljs';

/** Writes an Excel workbook to the HTTP response with the correct content-type and filename. */
export async function sendExcelResponse(
  res: Response,
  workbook: ExcelJS.Workbook,
  filename: string,
): Promise<void> {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await workbook.xlsx.write(res);
  res.end();
}

/** Creates a workbook with one sheet, sets auto-filter on the header row, and returns the sheet. */
export function createSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  headers: string[],
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(sheetName);

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' }, // design-system primary
  };
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Auto-width (approximate — Excel doesn't compute exact widths server-side)
  headers.forEach((h, i) => {
    sheet.getColumn(i + 1).width = Math.max(h.length + 4, 14);
  });

  if (headers.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: headers.length },
    };
  }

  return sheet;
}
