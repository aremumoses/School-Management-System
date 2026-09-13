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
      <div className="hidden w-[17.5rem] shrink-0 flex-col gap-4 bg-sidebar px-6 py-4 md:flex">
        <Skeleton className="h-10 w-36 bg-sidebar-accent" />
        <div className="space-y-2 pt-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full bg-sidebar-accent" />
          ))}
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex h-[4.5rem] items-center justify-between px-4 md:px-6 lg:px-8">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="size-10 rounded-md" />
        </div>
        <div className="flex-1 space-y-4 p-4 md:p-6 lg:p-8">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-40 w-full max-w-2xl" />
        </div>
      </div>
    </div>
  );
}
