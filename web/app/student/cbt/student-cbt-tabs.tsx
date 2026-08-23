'use client';

import { Loader2, MonitorCheck, Play } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { startAttempt } from '@/lib/actions/cbt';
import type { MockHistoryRowDto, StudentTestRowDto } from '@/lib/types/cbt';
import { cn } from '@/lib/utils';

function formatWindow(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function TestActionButton({ test }: { test: StudentTestRowDto }) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const inProgress = test.myAttempts.find((a) => a.status === 'IN_PROGRESS');
  const finished = test.myAttempts.filter((a) => a.status !== 'IN_PROGRESS');
  const attemptsLeft = test.attemptsAllowed - test.myAttempts.length;
  const latestFinished = finished[0];

  async function handleStart() {
    setIsStarting(true);
    try {
      const attempt = await startAttempt(test.id);
      router.push(`/exam/${attempt.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't start the test.");
      setIsStarting(false);
    }
  }

  if (inProgress) {
    return (
      <Button onClick={() => router.push(`/exam/${inProgress.id}`)}>
        <Play className="size-4" aria-hidden="true" />
        Resume
      </Button>
    );
  }

  if (test.status === 'OPEN' && attemptsLeft > 0) {
    return (
      <Button onClick={() => void handleStart()} disabled={isStarting}>
        {isStarting ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Starting…
          </>
        ) : (
          <>
            <Play className="size-4" aria-hidden="true" />
            Start Test
          </>
        )}
      </Button>
    );
  }

  if (latestFinished) {
    return (
      <Button variant="outline" onClick={() => router.push(`/exam/${latestFinished.id}`)}>
        View Result
      </Button>
    );
  }

  return null;
}

function TestCard({ test }: { test: StudentTestRowDto }) {
  const finished = test.myAttempts.filter((a) => a.status !== 'IN_PROGRESS');
  const latest = finished[0];

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="min-w-0 space-y-1">
          <p className="font-medium text-foreground">{test.title}</p>
          <p className="text-xs text-muted-foreground">
            {test.classSubject.subject.name} · {test.questionCount} questions ·{' '}
            {test.timeLimitMinutes} min · {finished.length}/{test.attemptsAllowed} attempt
            {test.attemptsAllowed === 1 ? '' : 's'} used
          </p>
          <p className="text-xs text-muted-foreground">
            {test.status === 'SCHEDULED'
              ? `Opens ${formatWindow(test.availableFrom)}`
              : `Closes ${formatWindow(test.availableTo)}`}
          </p>
          {latest && (
            <p className="text-xs">
              {latest.score !== null ? (
                <span
                  className={
                    (latest.score / latest.maxScore) * 100 >= test.passMark
                      ? 'font-medium text-success-soft-foreground'
                      : 'font-medium text-error-soft-foreground'
                  }
                >
                  Last score: {latest.score}/{latest.maxScore}
                </span>
              ) : latest.gradedAt === null && latest.status !== 'IN_PROGRESS' ? (
                <span className="text-muted-foreground">Awaiting grading</span>
              ) : (
                <span className="text-muted-foreground">Result withheld</span>
              )}
            </p>
          )}
        </div>
        <TestActionButton test={test} />
      </CardContent>
    </Card>
  );
}

function TestsSection({ title, tests }: { title: string; tests: StudentTestRowDto[] }) {
  if (tests.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      <div className="space-y-2">
        {tests.map((t) => (
          <TestCard key={t.id} test={t} />
        ))}
      </div>
    </section>
  );
}

function MockTrendChart({ history }: { history: MockHistoryRowDto[] }) {
  if (history.length < 2) return null;

  const data = [...history]
    .sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())
    .map((row) => ({
      label: new Date(row.takenAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      }),
      percentage: row.percentage,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mock score trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                axisLine={{ stroke: 'var(--color-border)' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                cursor={{ stroke: 'var(--color-border)' }}
                contentStyle={{
                  borderRadius: 8,
                  borderColor: 'var(--color-border)',
                  fontSize: 13,
                }}
                formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Score']}
              />
              <Line
                type="monotone"
                dataKey="percentage"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function StudentCbtTabs({
  tests,
  mockHistory,
}: {
  tests: StudentTestRowDto[];
  mockHistory: MockHistoryRowDto[];
}) {
  const [tab, setTab] = useState<'tests' | 'mock'>('tests');

  const regular = tests.filter((t) => !t.isMockPractice && t.status !== 'DRAFT');
  const mocks = tests.filter((t) => t.isMockPractice && t.status !== 'DRAFT');

  const open = regular.filter((t) => t.status === 'OPEN');
  const upcoming = regular.filter((t) => t.status === 'SCHEDULED');
  const past = regular.filter((t) => t.status === 'CLOSED');

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {(
          [
            { key: 'tests', label: 'My Tests' },
            { key: 'mock', label: 'JAMB Mock Practice' },
          ] as const
        ).map(({ key, label }) => (
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
          </button>
        ))}
      </div>

      {tab === 'tests' ? (
        regular.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MonitorCheck />
              </EmptyMedia>
              <EmptyTitle>No CBT tests yet</EmptyTitle>
              <EmptyDescription>
                Tests your teachers schedule for your class will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-6">
            <TestsSection title="Available now" tests={open} />
            <TestsSection title="Upcoming" tests={upcoming} />
            <TestsSection title="Past" tests={past} />
          </div>
        )
      ) : (
        <div className="space-y-6">
          <MockTrendChart history={mockHistory} />
          {mocks.length === 0 ? (
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MonitorCheck />
                </EmptyMedia>
                <EmptyTitle>No mock tests available</EmptyTitle>
                <EmptyDescription>
                  JAMB-style practice tests never count towards your report card — take them as
                  often as they allow.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-6">
              <TestsSection title="Available now" tests={mocks.filter((t) => t.status === 'OPEN')} />
              <TestsSection title="Upcoming" tests={mocks.filter((t) => t.status === 'SCHEDULED')} />
              <TestsSection title="Past" tests={mocks.filter((t) => t.status === 'CLOSED')} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
