import { Skeleton } from '@/components/ui/skeleton';

/** Matches PageHeader's shape — title + description + top-right action button. */
export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-8 w-32 shrink-0" />
    </div>
  );
}

/** Matches the expandable Card-list pattern used by Sessions/Classes. */
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl p-6 ring-1 ring-foreground/10">
          <Skeleton className="h-6 w-40" />
        </div>
      ))}
    </div>
  );
}

/** Matches the DataTable pattern used by Subjects/Staff. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8 w-64" />
      <div className="space-y-2 rounded-lg border border-border p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    </div>
  );
}

/** Matches a Card-wrapped form (School Profile, Bio-data). */
export function FormSkeleton() {
  return (
    <div className="rounded-xl p-6 ring-1 ring-foreground/10">
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
    </div>
  );
}
