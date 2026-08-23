import { FormSkeleton, PageHeaderSkeleton } from '@/components/dashboard/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-2 h-4 w-40" />
        <PageHeaderSkeleton />
      </div>
      <Skeleton className="h-8 w-80" />
      <FormSkeleton />
    </div>
  );
}
