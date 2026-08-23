import { CardListSkeleton, PageHeaderSkeleton } from '@/components/dashboard/skeletons';

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardListSkeleton count={3} />
    </div>
  );
}
