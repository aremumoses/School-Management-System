'use client';

import { ArrowLeft, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { addTestQuestions, autoAssemble, gradeEssay, removeTestQuestion } from '@/lib/actions/cbt';
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  TEST_STATUS_BADGE,
} from '@/lib/cbt-labels';
import type {
  CBTTestDetailDto,
  GradingAttemptDto,
  QuestionDifficulty,
  QuestionDto,
  QuestionType,
  TestStatsDto,
} from '@/lib/types/cbt';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'questions', label: 'Questions' },
  { key: 'stats', label: 'Stats' },
  { key: 'grading', label: 'Essay Grading' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

function AddQuestionsDialog({
  test,
  bank,
}: {
  test: CBTTestDetailDto;
  bank: QuestionDto[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const inTest = new Set(test.questions.map((q) => q.questionId));
  const candidates = bank.filter(
    (q) =>
      !inTest.has(q.id) &&
      (!search ||
        q.prompt.toLowerCase().includes(search.toLowerCase()) ||
        q.topic.toLowerCase().includes(search.toLowerCase())),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (selected.size === 0) return toast.error('Pick at least one question.');
    setIsSaving(true);
    try {
      await addTestQuestions(test.id, [...selected]);
      toast.success(`Added ${selected.size} question${selected.size === 1 ? '' : 's'}.`);
      setSelected(new Set());
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add the questions.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Plus className="size-4" aria-hidden="true" />
        Pick from Bank
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Approved questions — {test.classSubject.subject.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompt/topic…"
            aria-label="Search bank"
          />
          {candidates.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No approved questions left to add for this subject.
            </p>
          ) : (
            <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
              {candidates.map((q) => (
                <li key={q.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-muted/50">
                    <Checkbox
                      checked={selected.has(q.id)}
                      onCheckedChange={() => toggle(q.id)}
                      aria-label={`Select: ${q.prompt}`}
                    />
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm text-foreground">{q.prompt}</p>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-xs">
                          {QUESTION_TYPE_LABELS[q.type as QuestionType]}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {DIFFICULTY_LABELS[q.difficulty as QuestionDifficulty]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{q.topic}</span>
                      </div>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={() => void handleAdd()} disabled={isSaving || selected.size === 0}>
              {isSaving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                `Add ${selected.size || ''}`.trim()
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AssembleRule {
  topic: string;
  difficulty: string;
  count: string;
}

function AutoAssembleDialog({ test, bank }: { test: CBTTestDetailDto; bank: QuestionDto[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState<AssembleRule[]>([
    { topic: '', difficulty: '', count: '5' },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  const topics = [...new Set(bank.map((q) => q.topic))].sort();

  function setRule(i: number, patch: Partial<AssembleRule>) {
    setRules((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleAssemble() {
    const cleaned = rules
      .filter((r) => r.topic && Number(r.count) > 0)
      .map((r) => ({
        topic: r.topic,
        difficulty: (r.difficulty || undefined) as QuestionDifficulty | undefined,
        count: Number(r.count),
      }));
    if (cleaned.length === 0) return toast.error('Add at least one complete rule.');
    setIsSaving(true);
    try {
      await autoAssemble(test.id, { rules: cleaned });
      toast.success('Test assembled from the bank.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't assemble the test.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Sparkles className="size-4" aria-hidden="true" />
        Auto-assemble
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Auto-assemble from bank</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Each rule pulls a random set of approved questions for a topic. Assembly fails if the
            bank can&apos;t satisfy a rule.
          </p>
          <div className="space-y-2">
            {rules.map((rule, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  {i === 0 && <Label>Topic</Label>}
                  <Select
                    value={rule.topic}
                    onValueChange={(v) => {
                      if (v) setRule(i, { topic: v });
                    }}
                    items={topics.map((t) => ({ value: t, label: t }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Topic…" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32 space-y-1">
                  {i === 0 && <Label>Difficulty</Label>}
                  <Select
                    value={rule.difficulty}
                    onValueChange={(v) => setRule(i, { difficulty: v ?? '' })}
                    items={[
                      { value: '', label: 'Mixed' },
                      ...Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      })),
                    ]}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Mixed" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Mixed</SelectItem>
                      {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-20 space-y-1">
                  {i === 0 && <Label>Count</Label>}
                  <Input
                    type="number"
                    min="1"
                    value={rule.count}
                    onChange={(e) => setRule(i, { count: e.target.value })}
                    aria-label="Question count"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRules((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={rules.length === 1}
                  aria-label="Remove rule"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRules((prev) => [...prev, { topic: '', difficulty: '', count: '5' }])}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add rule
          </Button>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={() => void handleAssemble()} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Assembling…
                </>
              ) : (
                'Assemble'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QuestionsTab({ test, bank }: { test: CBTTestDetailDto; bank: QuestionDto[] }) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const hasAttempts = test._count.attempts > 0;

  async function handleRemove(questionId: string) {
    setRemovingId(questionId);
    try {
      await removeTestQuestion(test.id, questionId);
      toast.success('Question removed.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove the question.");
    } finally {
      setRemovingId(null);
    }
  }

  const totalPoints = test.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {test.questions.length} question{test.questions.length === 1 ? '' : 's'} · {totalPoints}{' '}
          point{totalPoints === 1 ? '' : 's'}
          {hasAttempts && ' · locked (students have attempted this test)'}
        </p>
        {!hasAttempts && (
          <div className="flex gap-2">
            <AddQuestionsDialog test={test} bank={bank} />
            <AutoAssembleDialog test={test} bank={bank} />
          </div>
        )}
      </div>

      {test.questions.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          No questions yet — pick from the bank or auto-assemble by topic.
        </p>
      ) : (
        <ol className="space-y-2">
          {test.questions.map((tq, i) => (
            <li
              key={tq.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-foreground">
                  <span className="mr-1.5 font-medium text-muted-foreground">{i + 1}.</span>
                  {tq.question.prompt}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="text-xs">
                    {QUESTION_TYPE_LABELS[tq.question.type as QuestionType]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {DIFFICULTY_LABELS[tq.question.difficulty as QuestionDifficulty]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {tq.question.topic} · {tq.points} pt{tq.points === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              {!hasAttempts && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleRemove(tq.questionId)}
                  disabled={removingId === tq.questionId}
                  aria-label="Remove question"
                >
                  {removingId === tq.questionId ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="size-4" aria-hidden="true" />
                  )}
                </Button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function StatsTab({ stats }: { stats: TestStatsDto | null }) {
  if (!stats || stats.attemptCount === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        No submitted attempts yet — stats appear once students take the test.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">{stats.attemptCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {stats.average === null ? '—' : `${stats.average.toFixed(1)}%`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pass rate (≥{stats.passMark}%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {stats.passRate === null ? '—' : `${stats.passRate.toFixed(0)}%`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Score distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.distribution} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                  axisLine={{ stroke: 'var(--color-border)' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'var(--color-muted)' }}
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: 'var(--color-border)',
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EssayGradeForm({
  attemptId,
  essay,
}: {
  attemptId: string;
  essay: GradingAttemptDto['essayAnswers'][number];
}) {
  const router = useRouter();
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleGrade() {
    const value = Number(score);
    if (score === '' || Number.isNaN(value) || value < 0 || value > essay.points) {
      return toast.error(`Score must be between 0 and ${essay.points}.`);
    }
    setIsSaving(true);
    try {
      await gradeEssay(attemptId, {
        questionId: essay.questionId,
        score: value,
        feedback: feedback.trim() || undefined,
      });
      toast.success('Essay graded.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the grade.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium text-foreground">{essay.prompt}</p>
      <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap text-foreground">
        {typeof essay.answer === 'string' && essay.answer.trim()
          ? essay.answer
          : '(no answer given)'}
      </div>
      {essay.score !== null ? (
        <p className="text-sm text-success-soft-foreground">
          Graded: {essay.score}/{essay.points}
          {essay.feedback && ` — ${essay.feedback}`}
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-28 space-y-1">
            <Label htmlFor={`score-${attemptId}-${essay.questionId}`}>
              Score / {essay.points}
            </Label>
            <Input
              id={`score-${attemptId}-${essay.questionId}`}
              type="number"
              min="0"
              max={essay.points}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
          </div>
          <div className="min-w-48 flex-1 space-y-1">
            <Label htmlFor={`fb-${attemptId}-${essay.questionId}`}>Feedback (optional)</Label>
            <Textarea
              id={`fb-${attemptId}-${essay.questionId}`}
              rows={1}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => void handleGrade()} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              'Save Grade'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function GradingTab({ attempts }: { attempts: GradingAttemptDto[] }) {
  const withEssays = attempts.filter(
    (a) => a.status !== 'IN_PROGRESS' && a.essayAnswers.length > 0,
  );

  if (withEssays.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        Nothing to grade — either this test has no essay questions or no one has submitted yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {withEssays.map((attempt) => {
        const pendingCount = attempt.essayAnswers.filter((e) => e.score === null).length;
        return (
          <Card key={attempt.id}>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {attempt.student.firstName} {attempt.student.lastName}{' '}
                  <span className="font-normal text-muted-foreground">
                    ({attempt.student.admissionNumber})
                  </span>
                </CardTitle>
                {pendingCount > 0 ? (
                  <Badge variant="warning">
                    {pendingCount} pending essay{pendingCount === 1 ? '' : 's'}
                  </Badge>
                ) : (
                  <Badge variant="success">
                    Fully graded — {attempt.score}/{attempt.maxScore}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {attempt.essayAnswers.map((essay) => (
                <EssayGradeForm key={essay.questionId} attemptId={attempt.id} essay={essay} />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function TestBuilder({
  test,
  bank,
  stats,
  gradingAttempts,
}: {
  test: CBTTestDetailDto;
  bank: QuestionDto[];
  stats: TestStatsDto | null;
  gradingAttempts: GradingAttemptDto[];
}) {
  const [tab, setTab] = useState<TabKey>('questions');
  const pendingEssays = gradingAttempts.reduce(
    (sum, a) => sum + a.essayAnswers.filter((e) => e.score === null).length,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/teacher/cbt?tab=tests"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All tests
          </Link>
          {test.isMockPractice && <Badge variant="info">Mock</Badge>}
          <Badge variant={TEST_STATUS_BADGE[test.status]}>{test.status}</Badge>
        </div>
        <div className="flex gap-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              {label}
              {key === 'grading' && pendingEssays > 0 && ` (${pendingEssays})`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'questions' && <QuestionsTab test={test} bank={bank} />}
      {tab === 'stats' && <StatsTab stats={stats} />}
      {tab === 'grading' && <GradingTab attempts={gradingAttempts} />}
    </div>
  );
}
