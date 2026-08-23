import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { IncidentDetail } from '@/components/discipline/incident-detail';
import { getIncident } from '@/lib/actions/discipline';
import { ApiError, apiFetch } from '@/lib/api';
import { CAN_PROPOSE_ACTION_ROLES, hasAnyRole } from '@/lib/discipline-roles';
import type { StudentDetailDto } from '@/lib/types/students';

export default async function AdminIncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const incident = await getIncident(id).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const student = await apiFetch<StudentDetailDto>(`/students/${incident.studentId}`).catch(
    (error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    },
  );

  const canProposeAction = hasAnyRole(session!.user.roles, CAN_PROPOSE_ACTION_ROLES);
  const canApprove = session!.user.roles.includes('ADMIN');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/discipline"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Discipline
        </Link>
        <PageHeader
          title={`${student.firstName} ${student.lastName}`}
          description={`Admission No. ${student.admissionNumber}`}
        />
      </div>
      <div className="max-w-2xl">
        <IncidentDetail
          incident={incident}
          studentName={`${student.firstName} ${student.lastName}`}
          canProposeAction={canProposeAction}
          canApprove={canApprove}
        />
      </div>
    </div>
  );
}
