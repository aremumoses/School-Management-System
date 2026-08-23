import { ClipboardX } from 'lucide-react';
import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { getMyTeachingAssignments } from '@/lib/actions/attendance';
import { getScores } from '@/lib/actions/results';
import { apiFetch } from '@/lib/api';
import type { SchoolDto } from '@/lib/types/academic';
import { ScoreEntryGrid, type ScoreEntryContext } from './score-entry-grid';

export default async function TeacherScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ context?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  const userId = session!.user.id;

  const assignments = await getMyTeachingAssignments(userId);
  const currentAssignments = assignments.filter((a) => a.term.isCurrent);

  const contexts: ScoreEntryContext[] = currentAssignments.map((a) => ({
    key: a.classSubjectId,
    classSubjectId: a.classSubjectId,
    termId: a.termId,
    label: `${a.classSubject.class.name} — ${a.classSubject.subject.name}`,
    scoreEntryDeadline: a.scoreEntryDeadline,
  }));

  if (contexts.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Score Entry" description="Enter CA and exam scores for your classes." />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardX />
            </EmptyMedia>
            <EmptyTitle>No subjects assigned to you this term</EmptyTitle>
            <EmptyDescription>
              You&apos;re not currently assigned to teach any subject this term. Ask an Admin to
              assign you.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const contextKey = contexts.some((c) => c.key === params.context) ? params.context! : contexts[0].key;
  const selectedContext = contexts.find((c) => c.key === contextKey)!;

  const [grid, school] = await Promise.all([
    getScores(selectedContext.classSubjectId, selectedContext.termId),
    apiFetch<SchoolDto>('/school'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Score Entry" description="Enter CA and exam scores for your classes." />
      <ScoreEntryGrid
        key={contextKey}
        contexts={contexts}
        initialContextKey={contextKey}
        initialGrid={grid}
        gradingScale={school.gradingScale ?? []}
      />
    </div>
  );
}
