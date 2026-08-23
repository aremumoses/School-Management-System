import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAppraisalCycle } from '@/lib/actions/appraisal';
import { ApiError, apiFetch } from '@/lib/api';
import type { StaffDto } from '@/lib/types/staff';
import { AssignSubmissionDialog } from './assign-submission-dialog';
import { StatusControls } from './status-controls';
import { SubmissionList } from './submission-list';

export default async function AppraisalCycleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [cycle, staff] = await Promise.all([
    getAppraisalCycle(id).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    apiFetch<StaffDto[]>('/staff'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/hr/appraisals"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Back to Appraisals
        </Link>
        <PageHeader
          title={cycle.name}
          description={`${new Date(cycle.periodStart).toLocaleDateString('en-GB')} – ${new Date(cycle.periodEnd).toLocaleDateString('en-GB')}`}
          action={
            <div className="flex items-center gap-2">
              <Badge variant={cycle.status === 'ACTIVE' ? 'success' : cycle.status === 'CLOSED' ? 'warning' : 'secondary'}>
                {cycle.status}
              </Badge>
              <StatusControls cycleId={cycle.id} status={cycle.status} />
            </div>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Form: {cycle.form.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {cycle.form.sections.ratedCategories.map((c) => (
              <span key={c.key} className="rounded-full border border-border px-3 py-1 text-xs">
                {c.label} (1–{c.maxScore})
              </span>
            ))}
            {cycle.form.sections.freeTextSections.map((s) => (
              <span key={s.key} className="rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground">
                {s.label}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Submissions ({cycle.submissions.length})</CardTitle>
          <AssignSubmissionDialog cycleId={cycle.id} staff={staff} />
        </CardHeader>
        <CardContent>
          <SubmissionList submissions={cycle.submissions} />
        </CardContent>
      </Card>
    </div>
  );
}
