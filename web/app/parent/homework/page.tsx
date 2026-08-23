import { BookOpenCheck, Users } from 'lucide-react';
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
import { listWardAssignments } from '@/lib/actions/assignments';
import { apiFetch } from '@/lib/api';
import { ASSIGNMENT_STATUS, isDeadlinePassed } from '@/lib/assignment-status';
import type { StudentListResponse } from '@/lib/types/students';
import { ChildSwitcher } from '../fees/child-switcher';

export default async function ParentHomeworkPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const params = await searchParams;
  const childrenRes = await apiFetch<StudentListResponse>('/students');
  const children = childrenRes.data;

  if (children.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Homework Tracker" />
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No children linked to your account</EmptyTitle>
            <EmptyDescription>
              Contact the school office if this doesn&apos;t look right.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const selectedId = children.some((c) => c.id === params.studentId)
    ? params.studentId!
    : children[0].id;
  const child = children.find((c) => c.id === selectedId)!;

  const assignments = await listWardAssignments(selectedId);
  const sorted = [...assignments].sort(
    (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework Tracker"
        description={`What ${child.firstName} has been assigned, and whether it's been submitted and graded. Submitting is done from ${child.firstName}'s own portal.`}
      />

      {children.length > 1 && (
        <ChildSwitcher
          options={children.map((c) => ({ id: c.id, label: `${c.firstName} ${c.lastName}` }))}
          selectedId={selectedId}
        />
      )}

      {sorted.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenCheck />
            </EmptyMedia>
            <EmptyTitle>No assignments yet</EmptyTitle>
            <EmptyDescription>
              Nothing has been posted for {child.firstName}&apos;s class yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {sorted.map((assignment) => {
            const status = ASSIGNMENT_STATUS(assignment.submission);
            const due = new Date(assignment.dueDate);
            const missedDeadline =
              isDeadlinePassed(assignment.dueDate) && !assignment.submission;
            return (
              <Card key={assignment.id}>
                <CardContent className="space-y-1.5 py-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{assignment.title}</p>
                    <Badge variant={missedDeadline ? 'error' : status.variant}>
                      {missedDeadline ? 'Missed Deadline' : status.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {assignment.classSubject.subject.name} · due{' '}
                    {due.toLocaleString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {assignment.submission?.gradedAt && assignment.submission.feedback && (
                    <p className="text-xs text-muted-foreground">
                      Feedback: {assignment.submission.feedback}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
