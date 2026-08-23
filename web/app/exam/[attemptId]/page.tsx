import { notFound } from 'next/navigation';
import { getAttempt } from '@/lib/actions/cbt';
import { ExamScreen } from './exam-screen';
import { ResultView } from './result-view';

// The server re-fetches the attempt (with all saved answers) on every load,
// so refreshing mid-test resumes exactly where the student left off.
export default async function ExamAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  const attempt = await getAttempt(attemptId).catch(() => null);
  if (!attempt) notFound();

  if (attempt.status !== 'IN_PROGRESS') {
    return <ResultView attempt={attempt} />;
  }

  return <ExamScreen initial={attempt} />;
}
