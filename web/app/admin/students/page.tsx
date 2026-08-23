import { Download, Plus, TrendingUp, Upload, Users } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto, ClassDto } from '@/lib/types/academic';
import type { EnrollmentStatus, StudentListResponse } from '@/lib/types/students';
import { StudentFilters } from './student-filters';
import { StudentsTable } from './students-table';

export default async function StudentsDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    classId?: string;
    armId?: string;
    sessionId?: string;
    status?: string;
    search?: string;
    includeInactive?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? '1') || 1;
  const includeInactive = params.includeInactive === 'true';

  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (params.classId) query.set('classId', params.classId);
  if (params.armId) query.set('armId', params.armId);
  if (params.sessionId) query.set('sessionId', params.sessionId);
  if (params.status) query.set('status', params.status);
  if (params.search) query.set('search', params.search);
  if (includeInactive) query.set('includeInactive', 'true');

  const [studentsRes, classes, sessions] = await Promise.all([
    apiFetch<StudentListResponse>(`/students?${query.toString()}`),
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<AcademicSessionDto[]>('/academic-sessions'),
  ]);

  const hasAnyFilter = Boolean(
    params.classId ||
      params.armId ||
      params.sessionId ||
      params.status ||
      params.search ||
      includeInactive,
  );
  const isTrulyEmpty = studentsRes.total === 0 && !hasAnyFilter;

  // Build export URL preserving current filters
  const exportQuery = new URLSearchParams();
  if (params.classId) exportQuery.set('classId', params.classId);
  if (params.armId) exportQuery.set('armId', params.armId);
  if (params.sessionId) exportQuery.set('sessionId', params.sessionId);
  if (params.status) exportQuery.set('status', params.status);
  if (params.search) exportQuery.set('search', params.search);
  if (params.includeInactive) exportQuery.set('includeInactive', params.includeInactive);
  const exportHref = `/api/students/export${exportQuery.size > 0 ? `?${exportQuery.toString()}` : ''}`;

  const actions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        render={<a href={exportHref} download />}
      >
        <Download className="size-4" aria-hidden="true" />
        Export Excel
      </Button>
      <Button variant="outline" render={<Link href="/admin/students/promotion" />}>
        <TrendingUp className="size-4" aria-hidden="true" />
        Auto-Promote
      </Button>
      <Button variant="outline" render={<Link href="/admin/students/import" />}>
        <Upload className="size-4" aria-hidden="true" />
        Bulk Import
      </Button>
      <Button render={<Link href="/admin/students/new" />}>
        <Plus className="size-4" aria-hidden="true" />
        Add Student
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory"
        description="Every enrolled student, searchable and filterable by class, arm, session, and status."
        action={actions}
      />

      {isTrulyEmpty ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No students yet</EmptyTitle>
            <EmptyDescription>
              Add your school&apos;s first student, or bulk-import an existing roster from Excel.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{actions}</EmptyContent>
        </Empty>
      ) : (
        <>
          <StudentFilters
            classes={classes}
            sessions={sessions}
            initial={{
              classId: params.classId,
              armId: params.armId,
              sessionId: params.sessionId,
              status: params.status as EnrollmentStatus | undefined,
              search: params.search,
              includeInactive,
            }}
          />
          <StudentsTable response={studentsRes} currentPage={page} />
        </>
      )}
    </div>
  );
}
