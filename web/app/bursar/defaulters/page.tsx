import { PageHeader } from '@/components/dashboard/page-header';
import { apiFetch } from '@/lib/api';
import type { ClassDto } from '@/lib/types/academic';
import type { DefaulterRowDto } from '@/lib/types/fees';
import { ClassFilter } from './class-filter';
import { DefaultersTable } from './defaulters-table';

export default async function DefaultersPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.classId) query.set('classId', params.classId);

  const [classes, defaulters] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<DefaulterRowDto[]>(`/invoices/defaulters?${query.toString()}`),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Defaulters"
        description="Students with an outstanding balance — sort or filter to find who to chase."
      />
      <ClassFilter classes={classes} selectedClassId={params.classId} />
      <DefaultersTable rows={defaulters} />
    </div>
  );
}
