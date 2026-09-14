import Link from 'next/link';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listAuditLog } from '@/lib/actions/admin';
import { AuditLogTable } from './audit-log-table';

const ENTITY_TYPES = [
  'Student', 'Staff', 'Enrollment', 'Score', 'Result', 'Invoice',
  'Payment', 'Fee', 'Attendance', 'Event', 'DisciplinaryAction', 'Document',
];

// A plain <select> keeps this filter a real GET form that works without JS;
// styled to match the app's select triggers.
const NATIVE_SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    entityType?: string;
    actorId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? '1') || 1);

  const result = await listAuditLog({
    entityType: params.entityType,
    actorId: params.actorId,
    from: params.from,
    to: params.to,
    page,
    pageSize: 50,
  });

  const totalPages = Math.ceil(result.total / result.pageSize);

  function pageHref(p: number) {
    const q = new URLSearchParams();
    if (params.entityType) q.set('entityType', params.entityType);
    if (params.actorId) q.set('actorId', params.actorId);
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    q.set('page', String(p));
    return `/admin/audit-log?${q.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Append-only record of every create, update, and delete in the system."
      />

      {/* Filters */}
      <form
        method="get"
        className="grid gap-4 rounded-xl bg-card p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto] lg:items-end dark:ring-1 dark:ring-foreground/10"
      >
        <div className="space-y-2">
          <FormFieldLabel htmlFor="entityType">Entity type</FormFieldLabel>
          <select
            id="entityType"
            name="entityType"
            defaultValue={params.entityType ?? ''}
            className={NATIVE_SELECT_CLASS}
          >
            <option value="">All</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <FormFieldLabel htmlFor="actorId">Actor ID (starts with)</FormFieldLabel>
          <Input id="actorId" name="actorId" defaultValue={params.actorId ?? ''} placeholder="uuid…" className="h-10" />
        </div>
        <div className="space-y-2">
          <FormFieldLabel htmlFor="from">From</FormFieldLabel>
          <Input id="from" name="from" type="date" defaultValue={params.from ?? ''} className="h-10" />
        </div>
        <div className="space-y-2">
          <FormFieldLabel htmlFor="to">To</FormFieldLabel>
          <Input id="to" name="to" type="date" defaultValue={params.to ?? ''} className="h-10" />
        </div>
        <Button type="submit" className="h-10 px-6 sm:col-span-2 lg:col-span-1">
          Filter
        </Button>
      </form>

      <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-heading">Entries</h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {result.total.toLocaleString()} total entr{result.total === 1 ? 'y' : 'ies'}
          </p>
        </div>

        <AuditLogTable entries={result.data} />

        {result.total > 0 && (
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <span className="tabular-nums">
              Showing {(page - 1) * result.pageSize + 1}–
              {Math.min(page * result.pageSize, result.total)} of {result.total.toLocaleString()}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <Button variant="outline" size="sm" render={<Link href={pageHref(page - 1)} />}>
                    Previous
                  </Button>
                )}
                <span className="px-1 text-xs tabular-nums">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Button variant="outline" size="sm" render={<Link href={pageHref(page + 1)} />}>
                    Next
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
