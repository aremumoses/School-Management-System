import { CalendarRange } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { apiFetch } from '@/lib/api';
import type { AcademicSessionDto } from '@/lib/types/academic';
import { NewSessionDialog } from './new-session-dialog';
import { SessionList } from './session-list';

export default async function AcademicSessionsPage() {
  const sessions = await apiFetch<AcademicSessionDto[]>('/academic-sessions');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Sessions"
        description="Each session runs across 3 terms — only one term across the whole school can be current at a time."
        action={<NewSessionDialog />}
      />

      {sessions.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarRange />
            </EmptyMedia>
            <EmptyTitle>No academic sessions yet</EmptyTitle>
            <EmptyDescription>
              Create your school&apos;s first academic session to get started — it scaffolds
              all 3 terms in one step.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewSessionDialog />
          </EmptyContent>
        </Empty>
      ) : (
        <SessionList sessions={sessions} />
      )}
    </div>
  );
}
