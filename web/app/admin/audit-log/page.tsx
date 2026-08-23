import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { listAuditLog } from '@/lib/actions/admin';
import { AuditLogTable } from './audit-log-table';

const ENTITY_TYPES = [
  'Student', 'Staff', 'Enrollment', 'Score', 'Result', 'Invoice',
  'Payment', 'Fee', 'Attendance', 'Event', 'DisciplinaryAction', 'Document',
];

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
      <Card>
        <CardContent className="pt-4">
          <form method="get" className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-40 space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="entityType">
                Entity Type
              </label>
              <select
                id="entityType"
                name="entityType"
                defaultValue={params.entityType ?? ''}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-40 space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="actorId">
                Actor ID (starts with)
              </label>
              <input
                id="actorId"
                name="actorId"
                defaultValue={params.actorId ?? ''}
                placeholder="uuid…"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex-1 min-w-36 space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="from">
                From
              </label>
              <input
                id="from"
                name="from"
                type="date"
                defaultValue={params.from ?? ''}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex-1 min-w-36 space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="to">
                To
              </label>
              <input
                id="to"
                name="to"
                type="date"
                defaultValue={params.to ?? ''}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Filter
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {result.total.toLocaleString()} total entr{result.total === 1 ? 'y' : 'ies'}
          {result.total > 0 &&
            ` — showing ${(page - 1) * result.pageSize + 1}–${Math.min(page * result.pageSize, result.total)}`}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={pageHref(page - 1)}
                className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted"
              >
                Previous
              </Link>
            )}
            <span className="text-xs">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={pageHref(page + 1)}
                className="rounded-md border border-border px-3 py-1 text-xs hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        )}
      </div>

      <AuditLogTable entries={result.data} />
    </div>
  );
}
