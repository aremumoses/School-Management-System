'use client';

import { CheckCircle2, Inbox, Loader2, Undo2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { reviewQuestion } from '@/lib/actions/cbt';
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  TEST_STATUS_BADGE,
} from '@/lib/cbt-labels';
import type {
  CBTTestDto,
  McqOption,
  QuestionDifficulty,
  QuestionDto,
  QuestionType,
} from '@/lib/types/cbt';

function AnswerDetail({ question }: { question: QuestionDto }) {
  const { type, options, correctAnswer } = question;

  if (type === 'MCQ_SINGLE' || type === 'MCQ_MULTIPLE') {
    const opts = Array.isArray(options) ? (options as McqOption[]) : [];
    const correctIds = new Set(
      Array.isArray(correctAnswer)
        ? (correctAnswer as string[])
        : typeof correctAnswer === 'string'
          ? [correctAnswer]
          : [],
    );
    return (
      <ul className="space-y-1">
        {opts.map((opt) => (
          <li
            key={opt.id}
            className={
              correctIds.has(opt.id)
                ? 'text-sm font-medium text-success-soft-foreground'
                : 'text-sm text-muted-foreground'
            }
          >
            {correctIds.has(opt.id) ? '✓ ' : '· '}
            {opt.text}
          </li>
        ))}
      </ul>
    );
  }

  if (type === 'TRUE_FALSE') {
    return (
      <p className="text-sm text-success-soft-foreground">
        Correct: {String(correctAnswer) === 'true' ? 'True' : 'False'}
      </p>
    );
  }

  if (type === 'FILL_BLANK') {
    const accepted = Array.isArray(correctAnswer) ? (correctAnswer as string[]) : [];
    return (
      <p className="text-sm text-muted-foreground">
        Accepted answers:{' '}
        <span className="font-medium text-success-soft-foreground">{accepted.join(', ')}</span>
      </p>
    );
  }

  if (type === 'ESSAY') {
    return <p className="text-sm text-muted-foreground">Essay — graded manually after submit.</p>;
  }

  return null;
}

function PendingCard({ question }: { question: QuestionDto }) {
  const router = useRouter();
  const [returning, setReturning] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<'approve' | 'return' | null>(null);

  async function decide(decision: 'APPROVED' | 'RETURNED') {
    if (decision === 'RETURNED' && !notes.trim()) {
      return toast.error('Say what needs fixing so the teacher can resubmit.');
    }
    setBusy(decision === 'APPROVED' ? 'approve' : 'return');
    try {
      await reviewQuestion(question.id, {
        decision,
        notes: decision === 'RETURNED' ? notes.trim() : undefined,
      });
      toast.success(decision === 'APPROVED' ? 'Question approved.' : 'Returned to the author.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the review.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">{question.prompt}</p>
          {question.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.imageUrl}
              alt="Question attachment"
              className="max-h-48 rounded-md border border-border"
            />
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="info" className="text-xs">
              {question.subject.name}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {QUESTION_TYPE_LABELS[question.type as QuestionType]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {DIFFICULTY_LABELS[question.difficulty as QuestionDifficulty]}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {question.topic} · Level {question.classLevel} · by {question.authoredBy.firstName}{' '}
              {question.authoredBy.lastName}
            </span>
          </div>
        </div>

        <AnswerDetail question={question} />

        {returning && (
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What needs fixing before this can enter the bank?"
            rows={2}
            aria-label="Return notes"
          />
        )}

        <div className="flex justify-end gap-2">
          {returning ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setReturning(false)} disabled={busy !== null}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => void decide('RETURNED')}
                disabled={busy !== null}
              >
                {busy === 'return' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Undo2 className="size-4" aria-hidden="true" />
                )}
                Return to Author
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setReturning(true)} disabled={busy !== null}>
                <Undo2 className="size-4" aria-hidden="true" />
                Return
              </Button>
              <Button size="sm" onClick={() => void decide('APPROVED')} disabled={busy !== null}>
                {busy === 'approve' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                )}
                Approve
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function QuestionBankReview({
  questions,
  tests,
}: {
  questions: QuestionDto[];
  tests: CBTTestDto[];
}) {
  const pending = questions.filter((q) => q.status === 'PENDING');
  const approved = questions.filter((q) => q.status === 'APPROVED').length;
  const returned = questions.filter((q) => q.status === 'RETURNED').length;

  const bySubject = new Map<string, { total: number; approved: number }>();
  for (const q of questions) {
    const entry = bySubject.get(q.subject.name) ?? { total: 0, approved: 0 };
    entry.total += 1;
    if (q.status === 'APPROVED') entry.approved += 1;
    bySubject.set(q.subject.name, entry);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bank questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{questions.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{approved}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Awaiting review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{pending.length}</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Returned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{returned}</p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Approval queue{pending.length > 0 && ` (${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>Queue is clear</EmptyTitle>
              <EmptyDescription>
                Teacher-authored questions land here for review before entering the shared bank.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {pending.map((q) => (
              <PendingCard key={q.id} question={q} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Bank by subject</h2>
        {bySubject.size === 0 ? (
          <p className="text-sm text-muted-foreground">No questions authored yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead className="text-right">Approved</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...bySubject.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([subject, counts]) => (
                  <TableRow key={subject}>
                    <TableCell className="font-medium">{subject}</TableCell>
                    <TableCell className="text-right">{counts.total}</TableCell>
                    <TableCell className="text-right">{counts.approved}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">All CBT tests</h2>
        {tests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tests created yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Class / Subject</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">
                    {test.title}
                    {test.isMockPractice && (
                      <Badge variant="info" className="ml-1.5 text-xs">
                        Mock
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {test.classSubject.class.name} — {test.classSubject.subject.name}
                  </TableCell>
                  <TableCell>
                    {test.createdBy.firstName} {test.createdBy.lastName}
                  </TableCell>
                  <TableCell className="text-right">{test._count.questions}</TableCell>
                  <TableCell className="text-right">{test._count.attempts}</TableCell>
                  <TableCell>
                    <Badge variant={TEST_STATUS_BADGE[test.status]}>{test.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}
