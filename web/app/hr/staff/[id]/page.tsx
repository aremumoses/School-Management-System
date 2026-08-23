import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StaffProfileTabs } from '@/app/admin/staff/[id]/staff-profile-tabs';
import { PageHeader } from '@/components/dashboard/page-header';
import { getEmploymentRecord, listSalaryStructures, listStaffDocuments } from '@/lib/actions/hr';
import { ApiError, apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';

/**
 * Same underlying StaffProfileTabs component as /admin/staff/[id] — one
 * staff profile, more tabs, not two competing screens — mounted here as a
 * parallel route because HR_OFFICER can't pass the 'admin' segment's
 * ADMIN/VICE_PRINCIPAL role gate to reach the other one. Only the HR-owned
 * tabs (employment record, documents) render here — the academic tabs
 * (bio-data/roles/teaching) stay on the admin route since their edit
 * actions are all @Roles('ADMIN') on the backend.
 */
export default async function HrStaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const staff = await apiFetch<StaffDto>(`/staff/${id}`).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  });

  const [employmentRecord, salaryStructures, documents] = await Promise.all([
    getEmploymentRecord(id),
    listSalaryStructures(),
    listStaffDocuments(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/hr"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Staff Directory
        </Link>
        <PageHeader title={`${staff.firstName} ${staff.lastName}`} description={staff.email} />
      </div>

      <StaffProfileTabs
        staff={staff}
        isSelf={false}
        assignments={[]}
        classSubjectOptions={[]}
        termOptions={[]}
        employmentRecord={employmentRecord}
        salaryStructures={salaryStructures}
        documents={documents}
        variant="hr"
      />
    </div>
  );
}
