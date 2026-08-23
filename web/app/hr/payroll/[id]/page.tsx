import { ArrowLeft, Download, Wallet } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPayrollRun } from '@/lib/actions/hr';
import { ApiError } from '@/lib/api';
import { ApproveRunDialog } from './approve-run-dialog';
import { MarkReviewedButton } from './mark-reviewed-button';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function naira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const run = await getPayrollRun(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });

  const periodLabel = `${MONTH_NAMES[run.month - 1]} ${run.year}`;
  const totalNet = run.payslips.reduce((sum, p) => sum + p.netPay, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/hr/payroll"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Payroll
        </Link>
        <PageHeader
          title={`Payroll — ${periodLabel}`}
          description={`${run.payslips.length} staff · Total net pay ${naira(totalNet)}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={run.status === 'APPROVED' ? 'success' : 'warning'}>{run.status}</Badge>
              {run.status === 'DRAFT' && <MarkReviewedButton runId={run.id} />}
              {run.status === 'REVIEWED' && (
                <ApproveRunDialog runId={run.id} staffCount={run.payslips.length} periodLabel={periodLabel} />
              )}
              {run.status === 'APPROVED' && (
                <>
                  <Button
                    variant="outline"
                    render={<a href={`/api/hr/payroll/runs/${run.id}/payslips/export`} download />}
                  >
                    <Download className="size-4" aria-hidden="true" />
                    Export Payslips
                  </Button>
                  <Button
                    variant="outline"
                    render={<a href={`/api/hr/payroll/runs/${run.id}/bank-schedule/export`} download />}
                  >
                    <Download className="size-4" aria-hidden="true" />
                    Bank Schedule
                  </Button>
                </>
              )}
            </div>
          }
        />
      </div>

      {run.payslips.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Wallet />
            </EmptyMedia>
            <EmptyTitle>No payslips in this run</EmptyTitle>
            <EmptyDescription>No staff were included when this payroll run was generated.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">PAYE</TableHead>
                <TableHead className="text-right">Pension</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                {run.status === 'APPROVED' && <TableHead className="text-right">Payslip</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.payslips.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-foreground">
                    {p.staff?.firstName} {p.staff?.lastName}
                  </TableCell>
                  <TableCell className="text-right">{naira(p.grossPay)}</TableCell>
                  <TableCell className="text-right">{naira(p.payeDeduction)}</TableCell>
                  <TableCell className="text-right">{naira(p.pensionDeduction)}</TableCell>
                  <TableCell className="text-right font-semibold">{naira(p.netPay)}</TableCell>
                  {run.status === 'APPROVED' && (
                    <TableCell className="text-right">
                      {p.pdfUrl ? (
                        <a href={p.pdfUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Generating…</span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
