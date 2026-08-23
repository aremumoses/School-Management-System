import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { listTeacherAssignments } from '@/lib/actions/assignments';
import { AssignmentsTable } from './assignments-table';

export default async function TeacherAssignmentsPage() {
  const assignments = await listTeacherAssignments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Homework you've posted, with submission counts. Students and parents are notified when you post and again 24h before the deadline."
        action={
          <Button render={<Link href="/teacher/assignments/new" />}>
            <Plus className="size-4" aria-hidden="true" />
            New Assignment
          </Button>
        }
      />
      <AssignmentsTable assignments={assignments} />
    </div>
  );
}
