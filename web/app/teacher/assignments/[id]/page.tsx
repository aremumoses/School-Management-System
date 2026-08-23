import { ArrowLeft, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAssignmentDetail } from '@/lib/actions/assignments';
import { isDeadlinePassed } from '@/lib/assignment-status';
import { SubmissionsList } from './submissions-list';

export default async function TeacherAssignmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const assignment = await getAssignmentDetail(id);

  const due = new Date(assignment.dueDate);
  const closed = isDeadlinePassed(assignment.dueDate);

  return (
    <div className="space-y-6">
      <PageHeader
        title={assignment.title}
        description={`${assignment.classSubject.subject.name} · ${assignment.classSubject.class.name} — due ${due.toLocaleString('en-GB', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`}
        action={
          <div className="flex items-center gap-2">
            {closed && <Badge variant="outline">Deadline passed</Badge>}
            {assignment.allowLateSubmission && <Badge variant="info">Late allowed</Badge>}
            <Button variant="ghost" size="sm" render={<Link href="/teacher/assignments" />}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              All Assignments
            </Button>
          </div>
        }
      />

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

      <Card>
        <CardHeader>
          <CardTitle>
            Submissions ({assignment.submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SubmissionsList assignmentId={assignment.id} submissions={assignment.submissions} />
        </CardContent>
      </Card>
    </div>
  );
}
