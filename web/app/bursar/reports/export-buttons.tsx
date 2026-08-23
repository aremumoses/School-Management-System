'use client';

import { FileDown, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CollectionSummaryDto, OutstandingReportDto } from '@/lib/types/fees';

function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(','),
    )
    .join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * docs/15-module-fees-payments.md §8's "Export to Excel/PDF" — implemented
 * without a new backend export pipeline or a heavy client-side
 * XLSX/PDF-generation dependency (the design system explicitly wants a
 * lean bundle): a CSV opens natively in Excel, and the browser's own
 * print-to-PDF (triggered via window.print(), with the dashboard chrome
 * hidden under a `print:hidden` rule) produces a real PDF with zero
 * added dependencies.
 */
export function ExportButtons({
  summary,
  outstanding,
}: {
  summary: CollectionSummaryDto;
  outstanding: OutstandingReportDto;
}) {
  function exportExcel() {
    const rows: (string | number)[][] = [
      ['Class', 'Expected', 'Collected', 'Outstanding'],
      ...summary.byClass.map((c) => [c.className, c.expected, c.collected, c.outstanding]),
      [],
      ['Fee Component', 'Expected', 'Collected'],
      ...summary.byComponent.map((c) => [c.name, c.expected, c.collected]),
      [],
      ['Payment Method', 'Amount'],
      ...summary.byMethod.map((m) => [m.method, m.amount]),
      [],
      ['School-wide Outstanding', outstanding.totalOutstanding],
    ];
    downloadCsv(`financial-report-${summary.termId}.csv`, toCsv(rows));
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportExcel}>
        <FileDown className="size-4" aria-hidden="true" />
        Export Excel
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer className="size-4" aria-hidden="true" />
        Export PDF
      </Button>
    </div>
  );
}
