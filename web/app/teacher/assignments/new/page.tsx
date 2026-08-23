import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { getMyTeachingAssignments } from '@/lib/actions/attendance';
import { NewAssignmentForm } from './new-assignment-form';

export default async function NewAssignmentPage() {
  const session = await auth();
  const userId = session!.user.id;

  const assignments = await getMyTeachingAssignments(userId);
  const options = assignments
    .filter((a) => a.term.isCurrent)
    .map((a) => ({
      classSubjectId: a.classSubjectId,
      label: `${a.classSubject.class.name} — ${a.classSubject.subject.name}`,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Assignment"
        description="Students in the class (and their parents) are notified as soon as you post."
      />
      <NewAssignmentForm options={options} />
    </div>
  );
}
