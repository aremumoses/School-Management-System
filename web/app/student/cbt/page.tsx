import { auth } from '@/auth';
import { PageHeader } from '@/components/dashboard/page-header';
import { getMockHistory, listStudentTests } from '@/lib/actions/cbt';
import { StudentCbtTabs } from './student-cbt-tabs';

export default async function StudentCbtPage() {
  const session = await auth();
  const studentId = session!.user.id;

  const [tests, mockHistory] = await Promise.all([
    listStudentTests(),
    getMockHistory(studentId).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="CBT Tests"
        description="Take your scheduled computer-based tests and practise JAMB-style mocks."
      />
      <StudentCbtTabs tests={tests} mockHistory={mockHistory} />
    </div>
  );
}
