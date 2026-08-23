import { ClipboardX } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getResultStatus } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import { RESULT_STAGE_BADGE, RESULT_STAGE_LABELS } from '@/lib/result-stage-labels';
import type { ClassDto, TermDto } from '@/lib/types/academic';
import { CollateButton } from './collate-button';

/**
 * The Exam Officer's queue across every arm — per docs/03 §2 and the
 * Stage 5 backend, the Exam Officer collates and sends for approval;
 * final approve/return/publish stays with the Admin.
 */
export default async function ResultApprovalsQueuePage() {
  const [classes, currentTerm] = await Promise.all([
    apiFetch<ClassDto[]>('/classes'),
    apiFetch<TermDto>('/terms/current').catch(() => null),
  ]);

  const arms = classes.flatMap((klass) =>
    klass.arms.map((arm) => ({ id: arm.id, label: `${klass.name} ${arm.name}` })),
  );

  if (!currentTerm || arms.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Result Approvals" />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardX />
            </EmptyMedia>
            <EmptyTitle>Nothing to review yet</EmptyTitle>
            <EmptyDescription>
              Classes, arms, and a current term need to be set up first.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const statuses = await Promise.all(
    arms.map((arm) => getResultStatus(arm.id, currentTerm.id)),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Result Approvals"
        description={`Per-arm workflow status for the ${currentTerm.name} term. You collate once every subject is locked — final approval and publishing rest with the Admin.`}
      />

      <div className="space-y-3">
        {arms.map((arm, index) => {
          const status = statuses[index];
          const outstanding = status.outstandingSubjects.length;
          const total = status.subjects.length;
          const canCollate =
            status.allSubjectsLocked &&
            (status.stage === 'SCORES_IN_PROGRESS' ||
              status.stage === 'PENDING_COLLATION' ||
              status.stage === 'RETURNED');
          return (
            <Card key={arm.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/exam-officer/broadsheet?arm=${arm.id}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {arm.label}
                    </Link>
                    <Badge variant={RESULT_STAGE_BADGE[status.stage]}>
                      {RESULT_STAGE_LABELS[status.stage]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {total === 0
                      ? 'No subjects set up for this class yet.'
                      : outstanding === 0
                        ? `All ${total} subjects submitted and locked.`
                        : `${outstanding} of ${total} subjects still outstanding: ${status.outstandingSubjects
                            .map((s) => s.subjectName)
                            .join(', ')}`}
                  </p>
                  {status.stage === 'RETURNED' && status.returnReason && (
                    <p className="text-xs text-error-soft-foreground">
                      Returned: {status.returnReason}
                    </p>
                  )}
                </div>
                {canCollate && <CollateButton armId={arm.id} termId={currentTerm.id} />}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
