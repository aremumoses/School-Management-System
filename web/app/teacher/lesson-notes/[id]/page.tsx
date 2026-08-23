import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { getMyTeachingAssignments } from '@/lib/actions/attendance';
import { getLessonNote } from '@/lib/actions/lesson-notes';
import { NoteEditor, type AssignmentOption } from '../note-editor';

export default async function EditLessonNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const [note, assignments] = await Promise.all([
    getLessonNote(id),
    getMyTeachingAssignments(userId),
  ]);

  const options: AssignmentOption[] = assignments
    .filter((a) => a.term.isCurrent)
    .map((a) => ({
      classSubjectId: a.classSubjectId,
      termId: a.termId,
      label: `${a.classSubject.class.name} — ${a.classSubject.subject.name}`,
    }));

  return (
    <div className="space-y-6">
      <PageHeader title="Lesson Note" description={`Week ${note.weekOfTerm} — ${note.topic}`} />
      <NoteEditor note={note} assignmentOptions={options} />
    </div>
  );
}
