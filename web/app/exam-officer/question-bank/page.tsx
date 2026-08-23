import { PageHeader } from '@/components/dashboard/page-header';
import { listQuestions, listTests } from '@/lib/actions/cbt';
import { QuestionBankReview } from './question-bank-review';

export default async function ExamOfficerQuestionBankPage() {
  const [questions, tests] = await Promise.all([listQuestions({}), listTests()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        description="Review teacher-authored questions and monitor the school-wide bank and CBT tests."
      />
      <QuestionBankReview questions={questions} tests={tests} />
    </div>
  );
}
