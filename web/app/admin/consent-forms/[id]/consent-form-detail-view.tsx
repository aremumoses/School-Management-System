import { ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CONSENT_TYPE_LABELS } from '@/lib/consent-labels';
import type { ConsentFormRowDto, ConsentResponsesDto } from '@/lib/types/clubs';
import { cn } from '@/lib/utils';

const HEAD = 'h-12 font-semibold text-primary dark:text-heading';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

/** The consent form page's content, kept apart from its data fetching. */
export function ConsentFormDetailView({
  form,
  result,
}: {
  form: ConsentFormRowDto | undefined;
  result: ConsentResponsesDto;
}) {
  const count = result.respondents.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={form?.title ?? 'Consent Form'}
        description={
          form
            ? `${CONSENT_TYPE_LABELS[form.type]} · ${form.armLabel ?? 'Whole school'} · sent by ${form.createdBy.firstName} ${form.createdBy.lastName}`
            : undefined
        }
        action={
          <Button variant="outline" render={<Link href="/admin/consent-forms" />}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            All Forms
          </Button>
        }
      />

      {form && (
        <section className="rounded-xl bg-card p-5 sm:p-6 dark:ring-1 dark:ring-foreground/10">
          <h2 className="text-base font-semibold text-heading">Details</h2>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {form.description}
          </p>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Consented" value={result.tally.consented} icon={CheckCircle2} variant="success" />
        <StatCard label="Declined" value={result.tally.declined} icon={XCircle} variant="error" />
        <StatCard label="No response" value={result.tally.noResponse} icon={Clock} variant="amber" />
      </div>

      <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-heading">Respondents</h2>
          <Badge variant="secondary">{count}</Badge>
        </div>
        {count === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground sm:px-6">
            No students are targeted by this form.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5 hover:bg-primary/5">
                <TableHead className={cn(HEAD, 'pl-5 sm:pl-6')}>Student</TableHead>
                <TableHead className={HEAD}>Response</TableHead>
                <TableHead className={HEAD}>Signed By</TableHead>
                <TableHead className={cn(HEAD, 'pr-5 sm:pr-6')}>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.respondents.map((row) => (
                <TableRow key={row.studentId} className="hover:bg-primary/5">
                  <TableCell className="py-3 pl-5 sm:pl-6">
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary sm:flex dark:text-heading"
                      >
                        {initials(row.studentName)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-heading">{row.studentName}</p>
                        <p className="font-mono text-xs text-primary dark:text-muted-foreground">
                          {row.admissionNumber}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    {row.response === 'CONSENTED' ? (
                      <Badge variant="success">Consented</Badge>
                    ) : row.response === 'DECLINED' ? (
                      <Badge variant="error">Declined</Badge>
                    ) : (
                      <Badge variant="outline">No response</Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-muted-foreground">
                    {row.signatureName ? (
                      <>
                        <span className="italic text-foreground">“{row.signatureName}”</span>
                        {row.guardianName && (
                          <span className="block text-xs">({row.guardianName})</span>
                        )}
                      </>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="py-3 pr-5 text-xs text-muted-foreground tabular-nums sm:pr-6">
                    {row.respondedAt
                      ? new Date(row.respondedAt).toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
