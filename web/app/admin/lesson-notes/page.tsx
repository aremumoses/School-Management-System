import { PageHeader } from '@/components/dashboard/page-header';
import { listLessonNotes } from '@/lib/actions/lesson-notes';
import type { LessonNoteStatus } from '@/lib/types/lesson-notes';
import { ApprovalQueueTable } from './approval-queue-table';
import { StatusFilter } from './status-filter';

const VALID_STATUSES: LessonNoteStatus[] = ['PENDING', 'APPROVED', 'RETURNED'];

export default async function LessonNoteApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  // Filtered to the approval queue by default; "ALL" clears the filter.
  const status =
    params.status === 'ALL'
      ? undefined
      : VALID_STATUSES.includes(params.status as LessonNoteStatus)
        ? (params.status as LessonNoteStatus)
        : 'PENDING';

  const notes = await listLessonNotes({ status });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lesson Note Approvals"
        description="Notes submitted by teachers, awaiting review. Returning one requires a reason the teacher will see."
      />
      <StatusFilter selected={status ?? 'ALL'} />
      <ApprovalQueueTable notes={notes} />
    </div>
  );
}
