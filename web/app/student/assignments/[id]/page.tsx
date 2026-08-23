import { ArrowLeft, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStudentAssignment } from '@/lib/actions/assignments';
import { ASSIGNMENT_STATUS, isDeadlinePassed } from '@/lib/assignment-status';
import { SubmissionForm } from './submission-form';

export default async function StudentAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assignment = await getStudentAssignment(id);
  const status = ASSIGNMENT_STATUS(assignment.submission);
  const due = new Date(assignment.dueDate);
  const overdue = isDeadlinePassed(assignment.dueDate);
  const canSubmit =
    (!overdue || assignment.allowLateSubmission) && !assignment.submission?.gradedAt;

  return (
    <div className="space-y-6">
      <PageHeader
        title={assignment.title}
        description={`${assignment.classSubject.subject.name} · ${assignment.createdBy.firstName} ${assignment.createdBy.lastName}`}
        action={
          <div className="flex items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <Button variant="ghost" size="sm" render={<Link href="/student/assignments" />}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>
          </div>
        }
      />

      {/* The deadline, shown clearly either way (frontend prompt §2). */}
      <div
        className={`rounded-lg border px-4 py-3 text-sm ${
          overdue
            ? assignment.allowLateSubmission
              ? 'border-warning-soft bg-warning-soft text-warning-soft-foreground'
              : 'border-error-soft bg-error-soft text-error-soft-foreground'
            : 'border-info/30 bg-info-soft text-info-soft-foreground'
        }`}
      >
        Due{' '}
        <strong>
          {due.toLocaleString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </strong>
        {overdue &&
          (assignment.allowLateSubmission
            ? ' — the deadline has passed, but late submissions are accepted.'
            : ' — the deadline has passed; submissions are closed.')}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Instructions</CardTitle>
          {assignment.attachmentUrl && (
            <Button
              variant="outline"
              size="sm"
              render={<a href={assignment.attachmentUrl} target="_blank" rel="noreferrer" />}
            >
              <Paperclip className="size-3.5" aria-hidden="true" />
              Attachment
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {assignment.instructions}
          </p>
        </CardContent>
      </Card>

      {assignment.submission?.gradedAt && (
        <Card>
          <CardHeader>
            <CardTitle>Grade &amp; Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-2xl font-bold text-foreground">{assignment.submission.grade}</p>
            {assignment.submission.feedback && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {assignment.submission.feedback}
              </p>
            )}
            {assignment.submission.gradedBy && (
              <p className="text-xs text-muted-foreground">
                — {assignment.submission.gradedBy.firstName}{' '}
                {assignment.submission.gradedBy.lastName}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {assignment.submission ? 'Your Submission' : 'Submit Your Work'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubmissionForm
            assignmentId={assignment.id}
            submission={assignment.submission}
            canSubmit={canSubmit}
          />
        </CardContent>
      </Card>
    </div>
  );
}
