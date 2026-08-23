import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { getEmploymentRecord, listSalaryStructures, listStaffDocuments } from '@/lib/actions/hr';
import { ApiError, apiFetch } from '@/lib/api';
import type { AcademicSessionDto, SubjectDto } from '@/lib/types/academic';
import type { StaffDto, TeacherAssignmentDto } from '@/lib/types/staff';
import { type ClassSubjectOption, type TermOption } from './teaching-assignments-section';
import { StaffProfileTabs } from './staff-profile-tabs';

export default async function StaffDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  const [session, staff] = await Promise.all([
    auth(),
    apiFetch<StaffDto>(`/staff/${id}`).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) {
        notFound();
      }
      throw error;
    }),
  ]);

  const [assignments, subjects, sessions, employmentRecord, salaryStructures, documents] =
    await Promise.all([
      apiFetch<TeacherAssignmentDto[]>(`/staff/${id}/teaching-assignments`),
      apiFetch<SubjectDto[]>('/subjects'),
      apiFetch<AcademicSessionDto[]>('/academic-sessions'),
      getEmploymentRecord(id),
      listSalaryStructures(),
      listStaffDocuments(id),
    ]);
  const isSelf = session?.user.id === staff.id;

  const classSubjectOptions: ClassSubjectOption[] = subjects.flatMap((subject) =>
    subject.classSubjects.map((cs) => ({
      id: cs.id,
      label: `${cs.class.name} — ${subject.name}`,
    })),
  );

  const termOptions: TermOption[] = sessions.flatMap((session) =>
    session.terms.map((term) => ({
      id: term.id,
      label: `${session.name} — ${term.name} Term`,
      isCurrent: term.isCurrent,
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/staff"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Staff Directory
        </Link>
        <PageHeader title={`${staff.firstName} ${staff.lastName}`} description={staff.email} />
      </div>

      <StaffProfileTabs
        staff={staff}
        isSelf={isSelf}
        assignments={assignments}
        classSubjectOptions={classSubjectOptions}
        termOptions={termOptions}
        employmentRecord={employmentRecord}
        salaryStructures={salaryStructures}
        documents={documents}
        defaultTab={tab}
      />
    </div>
  );
}
