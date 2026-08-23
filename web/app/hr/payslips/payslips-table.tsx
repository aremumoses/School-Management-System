'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { DataTable } from '@/components/dashboard/data-table';
import { Badge } from '@/components/ui/badge';
import type { PayslipDto } from '@/lib/types/hr';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function naira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const columns: ColumnDef<PayslipDto, unknown>[] = [
  {
    id: 'staff',
    header: 'Staff',
    accessorFn: (p) => `${p.staff?.firstName ?? ''} ${p.staff?.lastName ?? ''}`,
  },
  {
    id: 'period',
    header: 'Period',
    accessorFn: (p) => (p.payrollRun ? `${MONTH_NAMES[p.payrollRun.month - 1]} ${p.payrollRun.year}` : ''),
  },
  {
    id: 'netPay',
    header: 'Net Pay',
    accessorFn: (p) => p.netPay,
    cell: ({ row }) => naira(row.original.netPay),
  },
  {
    id: 'download',
    header: '',
    cell: ({ row }) =>
      row.original.pdfUrl ? (
        <a
          href={row.original.pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Download className="size-3.5" aria-hidden="true" />
          Download
        </a>
      ) : (
        <Badge variant="secondary">Not generated</Badge>
      ),
  },
];

export function PayslipsTable({ payslips }: { payslips: PayslipDto[] }) {
  return <DataTable columns={columns} data={payslips} searchPlaceholder="Search by staff name…" />;
}
