import { Plus } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { getMyTeachingAssignments } from '@/lib/actions/attendance';
import { listLessonNotes } from '@/lib/actions/lesson-notes';
import { LessonNotesTable } from './lesson-notes-table';

export default async function TeacherLessonNotesPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [notes, assignments] = await Promise.all([
    listLessonNotes({}),
    getMyTeachingAssignments(userId),
  ]);
  const hasCurrentAssignment = assignments.some((a) => a.term.isCurrent);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lesson Notes"
        description="One note per topic/week, mapped to the NERDC scheme. Notes go to your HOD or the Admin for approval."
        action={
          hasCurrentAssignment ? (
            <Button render={<Link href="/teacher/lesson-notes/new" />}>
              <Plus className="size-4" aria-hidden="true" />
              New Lesson Note
            </Button>
          ) : undefined
        }
      />
      <LessonNotesTable notes={notes} />
    </div>
  );
}
