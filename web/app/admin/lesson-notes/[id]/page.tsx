import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Hash,
  type LucideIcon,
  Paperclip,
  School,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getLessonNote } from '@/lib/actions/lesson-notes';
import {
  LESSON_NOTE_STATUS_BADGE,
  LESSON_NOTE_STATUS_LABELS,
} from '@/lib/lesson-note-status-labels';
import { ReviewActions } from './review-actions';

function Section({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <div className="px-5 py-5 sm:px-6">
      <h3 className="mb-2 text-base font-semibold text-heading">{title}</h3>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{body}</p>
    </div>
  );
}

/** A key detail beside a brand-coral icon circle, as on the profile hero. */
function Detail({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-coral text-brand-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-semibold text-heading">{value}</p>
      </div>
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
        description={`Submitted by ${note.submittedBy.firstName} ${note.submittedBy.lastName}`}
        action={
          <>
            <Badge variant={LESSON_NOTE_STATUS_BADGE[note.status]}>
              {LESSON_NOTE_STATUS_LABELS[note.status]}
            </Badge>
            <Button variant="outline" render={<Link href="/admin/lesson-notes" />}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Queue
            </Button>
          </>
        }
      />

      {note.status === 'RETURNED' && note.reviewerNotes && (
        <div className="flex items-start gap-3 rounded-xl border border-error-soft bg-error-soft px-5 py-4 text-sm text-error-soft-foreground">
          <Undo2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <strong>Returned:</strong> {note.reviewerNotes}
            {note.reviewedBy && (
              <span className="block text-xs opacity-80">
                — {note.reviewedBy.firstName} {note.reviewedBy.lastName}
              </span>
            )}
          </div>
        </div>
      )}

      <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-heading">Note Content</h2>
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
        </div>

        <div className="grid gap-4 border-b border-border px-5 py-5 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <Detail icon={BookOpen} label="Subject" value={note.classSubject.subject.name} />
          <Detail icon={School} label="Class" value={note.classSubject.class.name} />
          <Detail
            icon={CalendarDays}
            label="Week"
            value={`Week ${note.weekOfTerm}, ${note.term.name} term`}
          />
          {note.nerdcReference && (
            <Detail icon={Hash} label="NERDC reference" value={note.nerdcReference} />
          )}
        </div>

        <div className="divide-y divide-border">
          <Section title="Objectives" body={note.objectives} />
          <Section title="Content / Procedure" body={note.content} />
          <Section title="Activities" body={note.activities} />
          <Section title="Evaluation" body={note.evaluation} />
        </div>
      </section>

      {note.status === 'PENDING' && <ReviewActions noteId={note.id} />}

      {note.status === 'APPROVED' && note.reviewedBy && (
        <div className="flex items-start gap-3 rounded-xl border border-success-soft bg-success-soft px-5 py-4 text-sm text-success-soft-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            Approved by {note.reviewedBy.firstName} {note.reviewedBy.lastName}
            {note.reviewedAt &&
              ` on ${new Date(note.reviewedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}`}
            .
          </p>
        </div>
      )}
    </div>
  );
}
