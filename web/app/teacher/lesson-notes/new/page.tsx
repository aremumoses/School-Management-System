import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { getMyTeachingAssignments } from '@/lib/actions/attendance';
import { NoteEditor, type AssignmentOption } from '../note-editor';

export default async function NewLessonNotePage() {
  const session = await auth();
  const userId = session!.user.id;

  const assignments = await getMyTeachingAssignments(userId);
  const options: AssignmentOption[] = assignments
    .filter((a) => a.term.isCurrent)
    .map((a) => ({
      classSubjectId: a.classSubjectId,
      termId: a.termId,
      label: `${a.classSubject.class.name} — ${a.classSubject.subject.name}`,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Lesson Note"
        description="Submitted notes go to your HOD or the Admin for approval."
      />
      <NoteEditor assignmentOptions={options} />
    </div>
  );
}
