'use client';

import { Check, ChevronLeft, ChevronRight, CloudUpload, Loader2, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { saveAnswer, submitAttempt } from '@/lib/actions/cbt';
import { deadlineFromSeconds, formatCountdown, secondsUntil } from '@/lib/exam-time';
import type { AttemptDto, McqOption, TakingQuestionDto } from '@/lib/types/cbt';
import { cn } from '@/lib/utils';
import { ResultView } from './result-view';

const SAVE_DEBOUNCE_MS = 700;

function isAnswered(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: TakingQuestionDto;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const options = Array.isArray(question.options) ? (question.options as McqOption[]) : [];

  switch (question.type) {
    case 'MCQ_SINGLE':
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                'w-full rounded-lg border p-3 text-left text-sm transition-colors',
                value === opt.id
                  ? 'border-primary bg-primary/10 font-medium text-foreground'
                  : 'border-border text-foreground hover:bg-muted/50',
              )}
            >
              {opt.text}
            </button>
          ))}
        </div>
      );

    case 'MCQ_MULTIPLE': {
      const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.id}
              className={cn(
                'flex w-full cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors',
                selected.has(opt.id)
                  ? 'border-primary bg-primary/10 font-medium text-foreground'
                  : 'border-border text-foreground hover:bg-muted/50',
              )}
            >
              <Checkbox
                checked={selected.has(opt.id)}
                onCheckedChange={() => {
                  const next = new Set(selected);
                  if (next.has(opt.id)) next.delete(opt.id);
                  else next.add(opt.id);
                  onChange([...next]);
                }}
                aria-label={opt.text}
              />
              {opt.text}
            </label>
          ))}
        </div>
      );
    }

    case 'TRUE_FALSE':
      return (
        <div className="flex gap-3">
          {[
            { label: 'True', v: true },
            { label: 'False', v: false },
          ].map(({ label, v }) => (
            <button
              key={label}
              type="button"
              onClick={() => onChange(v)}
              className={cn(
                'flex-1 rounded-lg border p-4 text-sm font-medium transition-colors',
                value === v
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-foreground hover:bg-muted/50',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      );

    case 'FILL_BLANK':
      return (
        <Input
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer…"
          aria-label="Your answer"
        />
      );

    case 'ESSAY':
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your answer…"
          rows={8}
          aria-label="Your essay answer"
        />
      );

    default:
      return (
        <p className="text-sm text-muted-foreground">
          This question type can&apos;t be answered in the browser player.
        </p>
      );
  }
}

export function ExamScreen({ initial }: { initial: AttemptDto }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(initial.answers.map((a) => [a.questionId, a.answer])),
  );
  const [current, setCurrent] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    initial.answers.length > 0 ? 'saved' : 'idle',
  );
  const [remaining, setRemaining] = useState(initial.remainingSeconds);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AttemptDto | null>(null);

  const [deadline] = useState(() => deadlineFromSeconds(initial.remainingSeconds));
  const answersRef = useRef<Record<string, unknown>>({ ...Object.fromEntries(initial.answers.map((a) => [a.questionId, a.answer])) });
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dirtyRef = useRef<Set<string>>(new Set());
  const submittingRef = useRef(false);

  const questions = initial.questions;
  const question = questions[current];

  const doSubmit = useCallback(
    async (auto: boolean) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setIsSubmitting(true);
      setConfirmOpen(false);

      // Flush any answers still waiting on the debounce so nothing typed in
      // the last few seconds is lost. The server's grace window covers these.
      for (const timer of Object.values(timersRef.current)) clearTimeout(timer);
      const dirty = [...dirtyRef.current];
      await Promise.allSettled(
        dirty.map((qid) => saveAnswer(initial.id, qid, answersRef.current[qid])),
      );

      try {
        const submitted = await submitAttempt(initial.id);
        if (auto) toast.info('Time up — your test was submitted automatically.');
        setResult(submitted);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Couldn't submit the test.");
        submittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [initial.id],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const s = secondsUntil(deadline);
      setRemaining(s);
      if (s <= 0) {
        clearInterval(interval);
        void doSubmit(true);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [deadline, doSubmit]);

  function setAnswer(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    answersRef.current[questionId] = value;
    dirtyRef.current.add(questionId);
    setSaveState('saving');
    const timers = timersRef.current;
    if (timers[questionId]) clearTimeout(timers[questionId]);
    timers[questionId] = setTimeout(() => {
      void (async () => {
        try {
          await saveAnswer(initial.id, questionId, answersRef.current[questionId]);
          dirtyRef.current.delete(questionId);
          if (dirtyRef.current.size === 0) setSaveState('saved');
        } catch {
          setSaveState('error');
        }
      })();
    }, SAVE_DEBOUNCE_MS);
  }

  if (result) {
    return <ResultView attempt={result} />;
  }

  const answeredCount = questions.filter((q) => isAnswered(answers[q.questionId])).length;
  const unansweredCount = questions.length - answeredCount;
  const lowTime = remaining <= 60;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Exam-mode header: title, save indicator, big timer. No app chrome. */}
      <header className="sticky top-0 z-10 border-b border-border bg-background">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{initial.testTitle}</p>
            <p className="text-xs text-muted-foreground">
              {initial.subjectName}
              {initial.isMockPractice && ' · Mock practice'}
            </p>
          </div>
          <div
            className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex"
            aria-live="polite"
          >
            {saveState === 'saving' && (
              <>
                <CloudUpload className="size-3.5 animate-pulse" aria-hidden="true" />
                Saving…
              </>
            )}
            {saveState === 'saved' && (
              <>
                <Check className="size-3.5 text-success-soft-foreground" aria-hidden="true" />
                Saved
              </>
            )}
            {saveState === 'error' && (
              <>
                <TriangleAlert className="size-3.5 text-error-soft-foreground" aria-hidden="true" />
                Save failed — check your connection
              </>
            )}
          </div>
          <p
            className={cn(
              'font-mono text-2xl font-bold tabular-nums sm:text-3xl',
              lowTime ? 'text-error-soft-foreground' : 'text-foreground',
            )}
            aria-label="Time remaining"
          >
            {formatCountdown(remaining)}
          </p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-6 lg:flex-row">
        {/* Question area */}
        <main className="flex-1 space-y-6">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Question {current + 1} of {questions.length} · {question.points} point
              {question.points === 1 ? '' : 's'}
            </p>
            <p className="text-lg font-medium text-foreground">{question.prompt}</p>
            {question.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={question.imageUrl}
                alt="Question attachment"
                className="max-h-72 rounded-md border border-border"
              />
            )}
          </div>

          <QuestionInput
            question={question}
            value={answers[question.questionId]}
            onChange={(value) => setAnswer(question.questionId, value)}
          />

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              disabled={current === questions.length - 1}
            >
              Next
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </main>

        {/* Question palette */}
        <aside className="w-full shrink-0 space-y-4 lg:w-64">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Questions ({answeredCount}/{questions.length} answered)
            </p>
            <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
              {questions.map((q, i) => {
                const answered = isAnswered(answers[q.questionId]);
                return (
                  <button
                    key={q.questionId}
                    type="button"
                    onClick={() => setCurrent(i)}
                    aria-label={`Question ${i + 1}${answered ? ' (answered)' : ''}`}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-md border text-sm font-medium transition-colors',
                      i === current && 'ring-2 ring-primary ring-offset-1',
                      answered
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <Button className="w-full" onClick={() => setConfirmOpen(true)} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Submitting…
              </>
            ) : (
              'Submit Test'
            )}
          </Button>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Submit test?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {unansweredCount > 0
                ? `You have ${unansweredCount} unanswered question${unansweredCount === 1 ? '' : 's'}. Unanswered questions score zero.`
                : 'All questions answered. You can’t change anything after submitting.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Keep Working
              </Button>
              <Button onClick={() => void doSubmit(false)} disabled={isSubmitting}>
                Submit Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
