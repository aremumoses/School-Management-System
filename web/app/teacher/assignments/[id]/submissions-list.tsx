'use client';

import { Download, Inbox, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { gradeSubmission } from '@/lib/actions/assignments';
import type { SubmissionDto } from '@/lib/types/assignments';

function GradeForm({
  assignmentId,
  submission,
}: {
  assignmentId: string;
  submission: SubmissionDto;
}) {
  const router = useRouter();
  const [grade, setGrade] = useState(submission.grade ?? '');
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function handleGrade() {
    if (!grade.trim()) {
      toast.error('Enter a grade (e.g. 8/10).');
      return;
    }
    setIsSaving(true);
    try {
      await gradeSubmission(assignmentId, submission.id, {
        grade: grade.trim(),
        feedback: feedback.trim() || undefined,
      });
      toast.success('Graded.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the grade.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-border pt-3">
      <div className="w-28 space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor={`grade-${submission.id}`}>
          Grade
        </label>
        <Input
          id={`grade-${submission.id}`}
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          placeholder="8/10"
          className="h-8 text-sm"
        />
      </div>
      <div className="min-w-56 flex-1 space-y-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor={`fb-${submission.id}`}>
          Feedback (optional)
        </label>
        <Textarea
          id={`fb-${submission.id}`}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="e.g. Good work — revise question 7."
          className="min-h-9 text-sm"
        />
      </div>
      <Button size="sm" onClick={() => void handleGrade()} disabled={isSaving}>
        {isSaving ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : submission.gradedAt ? (
          'Update Grade'
        ) : (
          'Save Grade'
        )}
      </Button>
    </div>
  );
}

export function SubmissionsList({
  assignmentId,
  submissions,
}: {
  assignmentId: string;
  submissions: SubmissionDto[];
}) {
  if (submissions.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>No submissions yet</EmptyTitle>
          <EmptyDescription>Submissions appear here as students turn them in.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {submissions.map((submission) => (
        <div key={submission.id} className="rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-foreground">
                {submission.student.firstName} {submission.student.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {submission.student.admissionNumber} · submitted{' '}
                {new Date(submission.submittedAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {submission.gradedAt ? (
                <Badge variant="success">Graded: {submission.grade}</Badge>
              ) : (
                <Badge variant="warning">Ungraded</Badge>
              )}
              {submission.fileUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  render={<a href={submission.fileUrl} target="_blank" rel="noreferrer" />}
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  File
                </Button>
              )}
            </div>
          </div>

          {submission.textResponse && (
            <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground">
              {submission.textResponse}
            </p>
          )}

          <GradeForm assignmentId={assignmentId} submission={submission} />
        </div>
      ))}
    </div>
  );
}
