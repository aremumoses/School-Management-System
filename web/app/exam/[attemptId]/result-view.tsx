import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AttemptDto, McqOption, TakingQuestionDto } from '@/lib/types/cbt';

function optionText(question: TakingQuestionDto, id: unknown): string {
  const opts = Array.isArray(question.options) ? (question.options as McqOption[]) : [];
  return opts.find((o) => o.id === id)?.text ?? String(id);
}

function formatAnswer(question: TakingQuestionDto, value: unknown): string {
  if (value === undefined || value === null || value === '') return '(no answer)';
  switch (question.type) {
    case 'MCQ_SINGLE':
      return optionText(question, value);
    case 'MCQ_MULTIPLE':
      return Array.isArray(value)
        ? value.map((v) => optionText(question, v)).join(', ')
        : String(value);
    case 'TRUE_FALSE':
      return String(value) === 'true' ? 'True' : 'False';
    case 'FILL_BLANK':
      return Array.isArray(value) ? value.join(' / ') : String(value);
    default:
      return typeof value === 'string' ? value : JSON.stringify(value);
  }
}

export function ResultView({ attempt }: { attempt: AttemptDto }) {
  const released = attempt.released && attempt.score !== null;
  const percentage =
    attempt.score !== null && attempt.maxScore > 0
      ? (attempt.score / attempt.maxScore) * 100
      : null;
  const passed = percentage !== null && percentage >= attempt.passMark;
  const answerByQuestion = new Map(attempt.answers.map((a) => [a.questionId, a]));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <Link
        href="/student/cbt"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to CBT tests
      </Link>

      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{attempt.testTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {attempt.subjectName}
            {attempt.isMockPractice && ' · Mock practice'}
            {attempt.status === 'AUTO_SUBMITTED' && ' · auto-submitted at time limit'}
          </p>
        </CardHeader>
        <CardContent className="space-y-3 text-center">
          {released && percentage !== null ? (
            <>
              <p className="text-5xl font-bold text-foreground">
                {attempt.score}
                <span className="text-2xl font-normal text-muted-foreground">
                  /{attempt.maxScore}
                </span>
              </p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-lg text-muted-foreground">{percentage.toFixed(1)}%</p>
                <Badge variant={passed ? 'success' : 'error'}>
                  {passed ? 'Passed' : 'Failed'} (pass mark {attempt.passMark}%)
                </Badge>
              </div>
            </>
          ) : (
            <p className="py-4 text-muted-foreground">
              Your test was submitted. The result will appear here once grading is complete and
              your teacher releases scores.
            </p>
          )}
        </CardContent>
      </Card>

      {released && attempt.correctAnswers && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Review</h2>
          {attempt.questions.map((question, i) => {
            const saved = answerByQuestion.get(question.questionId);
            const correct = attempt.correctAnswers?.[question.questionId];
            const gotFull = saved?.score !== null && saved?.score === question.points;
            return (
              <Card key={question.questionId}>
                <CardContent className="space-y-2 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {i + 1}. {question.prompt}
                    </p>
                    <Badge variant={gotFull ? 'success' : 'error'} className="shrink-0">
                      {saved?.score ?? 0}/{question.points}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Your answer:{' '}
                    <span className="text-foreground">
                      {formatAnswer(question, saved?.answer)}
                    </span>
                  </p>
                  {correct !== undefined && question.type !== 'ESSAY' && (
                    <p className="text-sm text-muted-foreground">
                      Correct answer:{' '}
                      <span className="font-medium text-success-soft-foreground">
                        {formatAnswer(question, correct)}
                      </span>
                    </p>
                  )}
                  {saved?.feedback && (
                    <p className="text-sm text-muted-foreground">Feedback: {saved.feedback}</p>
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
