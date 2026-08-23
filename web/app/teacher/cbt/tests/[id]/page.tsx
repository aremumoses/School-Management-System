import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import {
  getTest,
  getTestStats,
  listGradingAttempts,
  listQuestions,
} from '@/lib/actions/cbt';
import { TestBuilder } from './test-builder';

export default async function TestBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const test = await getTest(id).catch(() => null);
  if (!test) notFound();

  const [bank, stats, gradingAttempts] = await Promise.all([
    listQuestions({ subjectId: test.classSubject.subject.id, status: 'APPROVED' }),
    getTestStats(id).catch(() => null),
    listGradingAttempts(id).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={test.title}
        description={`${test.classSubject.class.name} — ${test.classSubject.subject.name} · ${test.timeLimitMinutes} min · pass mark ${test.passMark}%`}
      />
      <TestBuilder test={test} bank={bank} stats={stats} gradingAttempts={gradingAttempts} />
    </div>
  );
}
