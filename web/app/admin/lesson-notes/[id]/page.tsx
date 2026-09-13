import { getLessonNote } from '@/lib/actions/lesson-notes';
import { LessonNoteReview } from './lesson-note-review';

export default async function LessonNoteReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getLessonNote(id);

  return <LessonNoteReview note={note} />;
}
