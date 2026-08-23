'use client';

import { Loader2, Paperclip } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createLessonNote,
  updateLessonNote,
  uploadLessonNoteAttachment,
} from '@/lib/actions/lesson-notes';
import {
  LESSON_NOTE_STATUS_BADGE,
  LESSON_NOTE_STATUS_LABELS,
} from '@/lib/lesson-note-status-labels';
import type { LessonNoteDto } from '@/lib/types/lesson-notes';

export interface AssignmentOption {
  classSubjectId: string;
  termId: string;
  label: string;
}

export function NoteEditor({
  note,
  assignmentOptions,
}: {
  /** Existing note when editing; undefined for a brand-new one. */
  note?: LessonNoteDto;
  assignmentOptions: AssignmentOption[];
}) {
  const router = useRouter();
  const isApproved = note?.status === 'APPROVED';

  const [classSubjectId, setClassSubjectId] = useState(note?.classSubjectId ?? '');
  const [weekOfTerm, setWeekOfTerm] = useState(note ? String(note.weekOfTerm) : '');
  const [topic, setTopic] = useState(note?.topic ?? '');
  const [nerdcReference, setNerdcReference] = useState(note?.nerdcReference ?? '');
  const [objectives, setObjectives] = useState(note?.objectives ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [activities, setActivities] = useState(note?.activities ?? '');
  const [evaluation, setEvaluation] = useState(note?.evaluation ?? '');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const week = Number(weekOfTerm);
    if (!classSubjectId) return toast.error('Choose the class/subject first.');
    if (!week || week < 1) return toast.error('Enter a valid week of term.');
    if (!topic.trim()) return toast.error('A topic is required.');
    if (!content.trim()) return toast.error('The lesson content is required.');

    const assignment = assignmentOptions.find((a) => a.classSubjectId === classSubjectId);

    setIsSaving(true);
    try {
      let saved: LessonNoteDto;
      const fields = {
        weekOfTerm: week,
        topic: topic.trim(),
        nerdcReference: nerdcReference.trim() || undefined,
        objectives: objectives.trim() || undefined,
        content: content.trim(),
        activities: activities.trim() || undefined,
        evaluation: evaluation.trim() || undefined,
      };
      if (note) {
        saved = await updateLessonNote(note.id, fields);
      } else {
        saved = await createLessonNote({
          classSubjectId,
          termId: assignment!.termId,
          ...fields,
        });
      }

      if (attachment) {
        const formData = new FormData();
        formData.set('file', attachment);
        try {
          await uploadLessonNoteAttachment(saved.id, formData);
        } catch {
          toast.warning('Note saved, but the attachment upload failed — try attaching it again.');
        }
      }

      toast.success(note ? 'Lesson note updated.' : 'Lesson note submitted for approval.');
      router.push('/teacher/lesson-notes');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the lesson note.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {note && (
        <div className="flex items-center gap-2">
          <Badge variant={LESSON_NOTE_STATUS_BADGE[note.status]}>
            {LESSON_NOTE_STATUS_LABELS[note.status]}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {note.classSubject.class.name} — {note.classSubject.subject.name} ·{' '}
            {note.term.name} term
          </span>
        </div>
      )}

      {note?.status === 'RETURNED' && note.reviewerNotes && (
        <div className="rounded-lg border border-error-soft bg-error-soft px-4 py-3 text-sm text-error-soft-foreground">
          <strong>Returned for revision:</strong> {note.reviewerNotes}
          {note.reviewedBy && (
            <span className="block text-xs opacity-80">
              — {note.reviewedBy.firstName} {note.reviewedBy.lastName}
            </span>
          )}
          <span className="mt-1 block text-xs">Saving your edits resubmits it for approval.</span>
        </div>
      )}

      {isApproved && (
        <div className="rounded-lg border border-success-soft bg-success-soft px-4 py-3 text-sm text-success-soft-foreground">
          This note has been approved and can no longer be edited — use Duplicate from the list to
          start a new draft from it.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{note ? 'Lesson Note' : 'New Lesson Note'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!note && (
            <div className="space-y-1.5">
              <Label>Class / Subject</Label>
              <Select
                value={classSubjectId}
                onValueChange={(v) => {
                  if (v) setClassSubjectId(v);
                }}
                items={assignmentOptions.map((a) => ({
                  value: a.classSubjectId,
                  label: a.label,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose one of your classes…" />
                </SelectTrigger>
                <SelectContent>
                  {assignmentOptions.map((a) => (
                    <SelectItem key={a.classSubjectId} value={a.classSubjectId}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="week">Week of Term</Label>
              <Input
                id="week"
                type="number"
                min="1"
                max="20"
                value={weekOfTerm}
                onChange={(e) => setWeekOfTerm(e.target.value)}
                placeholder="e.g. 3"
                disabled={isApproved}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Simultaneous Linear Equations"
                disabled={isApproved}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nerdc">NERDC Scheme Reference (optional)</Label>
            <Input
              id="nerdc"
              value={nerdcReference}
              onChange={(e) => setNerdcReference(e.target.value)}
              placeholder="e.g. NERDC JSS2 Mathematics, Theme 2, Topic 4"
              disabled={isApproved}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="objectives">Objectives</Label>
            <Textarea
              id="objectives"
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="By the end of the lesson, students should be able to…"
              className="min-h-20"
              disabled={isApproved}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content">Content / Procedure</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="The main lesson content, step by step…"
              className="min-h-36"
              disabled={isApproved}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="activities">Activities</Label>
            <Textarea
              id="activities"
              value={activities}
              onChange={(e) => setActivities(e.target.value)}
              placeholder="Class activities, practice, group work…"
              className="min-h-20"
              disabled={isApproved}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="evaluation">Evaluation</Label>
            <Textarea
              id="evaluation"
              value={evaluation}
              onChange={(e) => setEvaluation(e.target.value)}
              placeholder="Evaluation questions / assignment…"
              className="min-h-20"
              disabled={isApproved}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="attachment">Attachment (optional)</Label>
            {note?.attachmentUrl && (
              <p className="text-xs">
                <a
                  href={note.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Paperclip className="size-3" aria-hidden="true" />
                  Current attachment
                </a>
              </p>
            )}
            <Input
              id="attachment"
              type="file"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              disabled={isApproved}
            />
          </div>

          {!isApproved && (
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => router.push('/teacher/lesson-notes')}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : note ? (
                  note.status === 'RETURNED' ? (
                    'Save & Resubmit'
                  ) : (
                    'Save Changes'
                  )
                ) : (
                  'Submit for Approval'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
