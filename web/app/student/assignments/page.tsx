import { BookOpenCheck } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { listStudentAssignments } from '@/lib/actions/assignments';
import { ASSIGNMENT_STATUS, isDeadlinePassed } from '@/lib/assignment-status';

export default async function StudentAssignmentsPage() {
  const assignments = await listStudentAssignments();
  // Due-date sorted: open ones first (soonest deadline on top), closed after.
  const sorted = [...assignments].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Homework from your teachers — submit before the deadline."
      />

      {sorted.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenCheck />
            </EmptyMedia>
            <EmptyTitle>No assignments</EmptyTitle>
            <EmptyDescription>Nothing has been posted for your class yet.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {sorted.map((assignment) => {
            const status = ASSIGNMENT_STATUS(assignment.submission);
            const due = new Date(assignment.dueDate);
            const overdue = isDeadlinePassed(assignment.dueDate);
            return (
              <Link
                key={assignment.id}
                href={`/student/assignments/${assignment.id}`}
                className="block"
              >
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="space-y-2 py-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{assignment.title}</p>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {assignment.classSubject.subject.name} ·{' '}
                      {assignment.createdBy.firstName} {assignment.createdBy.lastName}
                    </p>
                    <p
                      className={`text-xs ${overdue && !assignment.submission ? 'font-medium text-error-soft-foreground' : 'text-muted-foreground'}`}
                    >
                      Due{' '}
                      {due.toLocaleString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {overdue && ' — deadline passed'}
                      {overdue && assignment.allowLateSubmission && ' (late submission allowed)'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
