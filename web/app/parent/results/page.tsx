import { Users } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { ReportCardView } from '@/components/results/report-card-view';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { apiFetch } from '@/lib/api';
import type { StudentListResponse } from '@/lib/types/students';
import { ChildSwitcher } from './child-switcher';

export default async function ParentResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const params = await searchParams;
  const childrenRes = await apiFetch<StudentListResponse>('/students');
  const ward = childrenRes.data;

  if (ward.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Report Cards" />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No children linked to your account</EmptyTitle>
            <EmptyDescription>Contact the school office if this looks wrong.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const childOptions = ward.map((child) => ({ id: child.id, label: `${child.firstName} ${child.lastName}` }));
  const selectedId = ward.some((c) => c.id === params.studentId) ? params.studentId! : ward[0].id;
  const selectedChild = ward.find((c) => c.id === selectedId)!;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Report Cards"
        description={`${selectedChild.firstName}'s results and performance trend.`}
      />
      {ward.length > 1 && <ChildSwitcher options={childOptions} selectedId={selectedId} />}
      <ReportCardView key={selectedId} studentId={selectedId} />
    </div>
  );
}
