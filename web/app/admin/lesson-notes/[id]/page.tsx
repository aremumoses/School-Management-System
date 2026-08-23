import { ArrowLeft, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getLessonNote } from '@/lib/actions/lesson-notes';
import {
  LESSON_NOTE_STATUS_BADGE,
  LESSON_NOTE_STATUS_LABELS,
} from '@/lib/lesson-note-status-labels';
import { ReviewActions } from './review-actions';

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-foreground">{title}</h3>
      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export default async function LessonNoteReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const note = await getLessonNote(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={note.topic}
        description={`${note.classSubject.subject.name} · ${note.classSubject.class.name} · Week ${note.weekOfTerm}, ${note.term.name} term — submitted by ${note.submittedBy.firstName} ${note.submittedBy.lastName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={LESSON_NOTE_STATUS_BADGE[note.status]}>
              {LESSON_NOTE_STATUS_LABELS[note.status]}
            </Badge>
            <Button variant="ghost" size="sm" render={<Link href="/admin/lesson-notes" />}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Queue
            </Button>
          </div>
        }
      />

      {note.status === 'RETURNED' && note.reviewerNotes && (
        <div className="rounded-lg border border-error-soft bg-error-soft px-4 py-3 text-sm text-error-soft-foreground">
          <strong>Returned:</strong> {note.reviewerNotes}
          {note.reviewedBy && (
            <span className="block text-xs opacity-80">
              — {note.reviewedBy.firstName} {note.reviewedBy.lastName}
            </span>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Note Content</CardTitle>
          {note.attachmentUrl && (
            <Button
              variant="outline"
              size="sm"
              render={<a href={note.attachmentUrl} target="_blank" rel="noreferrer" />}
            >
              <Paperclip className="size-3.5" aria-hidden="true" />
              Attachment
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {note.nerdcReference && (
            <p className="text-xs text-muted-foreground">
              NERDC reference: <span className="text-foreground">{note.nerdcReference}</span>
            </p>
          )}
          <Section title="Objectives" body={note.objectives} />
          <Section title="Content / Procedure" body={note.content} />
          <Section title="Activities" body={note.activities} />
          <Section title="Evaluation" body={note.evaluation} />
        </CardContent>
      </Card>

      {note.status === 'PENDING' && <ReviewActions noteId={note.id} />}

      {note.status === 'APPROVED' && note.reviewedBy && (
        <p className="text-sm text-muted-foreground">
          Approved by {note.reviewedBy.firstName} {note.reviewedBy.lastName}
          {note.reviewedAt &&
            ` on ${new Date(note.reviewedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}`}
          .
        </p>
      )}
    </div>
  );
}
