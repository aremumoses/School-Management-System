import { Skeleton } from '@/components/ui/skeleton';

/**
 * Generic sidebar+content skeleton shown while a route segment's data is
 * resolving (e.g. a dashboard layout's requireDashboardAccess() call) —
 * matches the eventual shell shape so there's no flash of blank/unstyled
 * content. Role-agnostic since we don't know which shell yet at this point.
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden w-64 shrink-0 flex-col gap-4 border-r border-border bg-sidebar p-4 md:flex">
        <Skeleton className="h-8 w-32 bg-sidebar-accent" />
        <div className="space-y-2 pt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full bg-sidebar-accent" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="size-8 rounded-full" />
        </div>
        <div className="flex-1 space-y-4 p-4 md:p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-40 w-full max-w-2xl" />
        </div>
      </div>
    </div>
  );
}
