import { ArrowLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getStaffAppraisalHistory } from '@/lib/actions/appraisal';
import { ApiError, apiFetch } from '@/lib/api';
import type { AppraisalSubmissionStatus } from '@/lib/types/appraisal';
import type { StaffDto } from '@/lib/types/staff';

const STATUS_BADGE: Record<AppraisalSubmissionStatus, 'secondary' | 'warning' | 'success'> = {
  DRAFT: 'secondary',
  SUBMITTED: 'warning',
  SIGNED_OFF: 'success',
};

export default async function StaffAppraisalHistoryPage({
  params,
}: {
  params: Promise<{ staffId: string }>;
}) {
  const { staffId } = await params;
  const [staff, history] = await Promise.all([
    apiFetch<StaffDto>(`/staff/${staffId}`).catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) notFound();
      throw error;
    }),
    getStaffAppraisalHistory(staffId),
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
          title={`${staff.firstName} ${staff.lastName} — Appraisal History`}
          description="Every past cycle's submission for this staff member."
        />
      </div>

      {history.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>No appraisal history yet</EmptyTitle>
            <EmptyDescription>Assign this staff member to a cycle to get started.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {history.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{s.cycle?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Reviewer: {s.reviewer?.firstName} {s.reviewer?.lastName}
                    </p>
                  </div>
                  <Badge variant={STATUS_BADGE[s.status]}>{s.status.replace('_', ' ')}</Badge>
                </div>
                {s.status !== 'DRAFT' && s.cycle?.form && (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {s.cycle.form.sections.ratedCategories.map((c) => (
                      <div key={c.key} className="rounded-md border border-border p-2 text-sm">
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className="font-semibold text-foreground">
                          {s.responses.ratings[c.key] ?? '—'} / {c.maxScore}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {s.status !== 'DRAFT' &&
                  s.cycle?.form.sections.freeTextSections.map(
                    (sec) =>
                      s.responses.freeText[sec.key] && (
                        <p key={sec.key} className="text-sm text-foreground">
                          <span className="font-medium">{sec.label}:</span>{' '}
                          {s.responses.freeText[sec.key]}
                        </p>
                      ),
                  )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
