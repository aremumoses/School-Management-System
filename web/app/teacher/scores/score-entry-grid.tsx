'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { AlertTriangle, CheckCircle2, Clock3, CloudOff, Loader2, User, Users } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NotificationPermissionPrompt } from '@/components/pwa/notification-permission-prompt';
import { computeSubjectPercentage, gradeBadgeVariant, gradeFromScale } from '@/lib/grading';
import { submitScores } from '@/lib/actions/results';
import {
  enqueueScoreSubmission,
  flushScoreQueue,
  getQueuedScoreCount,
  getQueuedScoreSubmission,
} from '@/lib/offline/score-queue';
import { useFlushOnReconnect } from '@/lib/offline/use-flush-on-reconnect';
import type { GradingScaleEntry } from '@/lib/types/academic';
import type { ScoreGridResponseDto } from '@/lib/types/results';
import { cn } from '@/lib/utils';

export interface ScoreEntryContext {
  key: string;
  classSubjectId: string;
  termId: string;
  label: string;
  scoreEntryDeadline: string | null;
}

type ValueMap = Record<string, Record<string, number | ''>>;

function initials(student: { firstName: string; lastName: string }): string {
  return `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
}

function formatDeadline(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function ScoreEntryGrid({
  contexts,
  initialContextKey,
  initialGrid,
  gradingScale,
}: {
  contexts: ScoreEntryContext[];
  initialContextKey: string;
  initialGrid: ScoreGridResponseDto;
  gradingScale: GradingScaleEntry[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startNavigation] = useTransition();
  const [isSubmitting, startSubmit] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isQueued, setIsQueued] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [hasSubmittedOnce, setHasSubmittedOnce] = useState(false);

  const selectedContext = contexts.find((c) => c.key === initialContextKey) ?? contexts[0];
  const { components, rows, locked, submittedAt } = initialGrid;

  const onQueueFlushed = useCallback(
    (count: number) => {
      toast.success(`${count} queued submission(s) synced.`);
      setIsQueued(false);
      setQueuedCount(0);
      router.refresh();
    },
    [router],
  );
  useFlushOnReconnect(flushScoreQueue, onQueueFlushed);

  // Reload could happen while still offline, so re-derive "is this
  // context's submission queued" from IndexedDB rather than assuming
  // in-memory state survived — same reasoning as the deferred
  // setTimeout(fn, 0) pattern used elsewhere for React Compiler purity.
  useEffect(() => {
    const timer = setTimeout(() => {
      void getQueuedScoreSubmission(selectedContext.classSubjectId, selectedContext.termId).then(
        (queued) => setIsQueued(queued !== undefined),
      );
      void getQueuedScoreCount().then(setQueuedCount);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedContext.classSubjectId, selectedContext.termId]);

  const [values, setValues] = useState<ValueMap>(() => {
    const initial: ValueMap = {};
    for (const row of rows) {
      initial[row.studentId] = {};
      for (const cell of row.scores) {
        initial[row.studentId][cell.assessmentComponentId] = cell.score ?? '';
      }
    }
    return initial;
  });
  // TanStack Table's `flexRender` calls each columnDef's `cell` by
  // reference — if `columns` were recreated on every keystroke (the
  // natural result of a `useMemo` depending on `values`), React would see
  // a "different" cell function at the same position on each render and
  // remount the underlying <input>, dropping focus after the very first
  // character typed. Cell renderers read the *current* values from this
  // ref instead, so `columns` itself never needs to change while typing.
  const valuesRef = useRef(values);
  valuesRef.current = values;

  function navigateTo(nextContextKey: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('context', nextContextKey);
    startNavigation(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function setCell(studentId: string, componentId: string, raw: string) {
    setValues((current) => {
      const parsed = raw === '' ? '' : Number(raw);
      return {
        ...current,
        [studentId]: { ...current[studentId], [componentId]: Number.isNaN(parsed) ? '' : parsed },
      };
    });
  }

  const filledCount = rows.reduce(
    (count, row) =>
      count + components.filter((c) => values[row.studentId]?.[c.id] !== '').length,
    0,
  );
  const totalCells = rows.length * components.length;
  const allFilled = totalCells > 0 && filledCount === totalCells;
  const hasOverMax = rows.some((row) =>
    components.some((c) => {
      const v = values[row.studentId]?.[c.id];
      return v !== '' && v !== undefined && v > c.maxScore;
    }),
  );

  const columns = useMemo<ColumnDef<(typeof rows)[number]>[]>(() => {
    const cols: ColumnDef<(typeof rows)[number]>[] = [
      {
        id: 'student',
        header: 'Student',
        cell: ({ row }) => {
          const student = row.original;
          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8">
                {student.photoUrl && <AvatarImage src={student.photoUrl} alt="" />}
                <AvatarFallback className="text-xs">
                  {initials(student) || <User className="size-3.5" />}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {student.firstName} {student.lastName}
                </p>
                <p className="font-mono text-xs text-muted-foreground">{student.admissionNumber}</p>
              </div>
            </div>
          );
        },
      },
    ];

    for (const component of components) {
      cols.push({
        id: component.id,
        header: () => (
          <div className="text-center">
            <div>{component.name}</div>
            <div className="text-[11px] font-normal text-muted-foreground">/ {component.maxScore}</div>
          </div>
        ),
        cell: ({ row }) => {
          const studentId = row.original.studentId;
          const value = valuesRef.current[studentId]?.[component.id] ?? '';
          const isOverMax = value !== '' && value > component.maxScore;
          return (
            <input
              type="number"
              inputMode="decimal"
              min={0}
              max={component.maxScore}
              value={value}
              disabled={locked}
              title={isOverMax ? `Maximum for ${component.name} is ${component.maxScore}` : undefined}
              onChange={(e) => setCell(studentId, component.id, e.target.value)}
              className={cn(
                'h-9 w-16 rounded-md border bg-transparent px-2 text-center text-sm tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60',
                isOverMax ? 'border-destructive ring-2 ring-destructive/30' : 'border-input',
              )}
            />
          );
        },
      });
    }

    cols.push(
      {
        id: 'total',
        header: () => <div className="text-center">Total</div>,
        cell: ({ row }) => {
          const total = computeSubjectPercentage(
            valuesRef.current[row.original.studentId] ?? {},
            components,
          );
          return <div className="text-center text-sm font-semibold tabular-nums">{total.toFixed(1)}</div>;
        },
      },
      {
        id: 'grade',
        header: () => <div className="text-center">Grade</div>,
        cell: ({ row }) => {
          const total = computeSubjectPercentage(
            valuesRef.current[row.original.studentId] ?? {},
            components,
          );
          const allEntered = components.every(
            (c) => valuesRef.current[row.original.studentId]?.[c.id] !== '',
          );
          if (!allEntered) {
            return <div className="text-center text-xs text-muted-foreground">—</div>;
          }
          const { grade } = gradeFromScale(total, gradingScale);
          return (
            <div className="flex justify-center">
              <Badge variant={gradeBadgeVariant(grade)}>{grade}</Badge>
            </div>
          );
        },
      },
    );

    return cols;
    // `values` is deliberately excluded — see valuesRef above. Cell
    // renderers read the ref directly, so columns stay referentially
    // stable across keystrokes while still showing live totals/grades on
    // every render (this component re-renders on every keystroke anyway,
    // since `setValues` is what drives the onChange handler below).
  }, [components, locked, gradingScale]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  async function queueSubmission(
    entries: { studentId: string; assessmentComponentId: string; score: number }[],
  ) {
    await enqueueScoreSubmission({
      classSubjectId: selectedContext.classSubjectId,
      termId: selectedContext.termId,
      entries,
    });
    setIsQueued(true);
    setQueuedCount(await getQueuedScoreCount());
    setConfirmOpen(false);
    toast.message('Saved offline — will submit when you reconnect.');
  }

  async function handleSubmit() {
    startSubmit(async () => {
      const entries = rows.flatMap((row) =>
        components.map((component) => ({
          studentId: row.studentId,
          assessmentComponentId: component.id,
          score: Number(values[row.studentId]?.[component.id] ?? 0),
        })),
      );
      try {
        if (!navigator.onLine) {
          await queueSubmission(entries);
          return;
        }
        await submitScores({
          classSubjectId: selectedContext.classSubjectId,
          termId: selectedContext.termId,
          entries,
        });
        toast.success(`${selectedContext.label} scores submitted and locked.`);
        setConfirmOpen(false);
        setHasSubmittedOnce(true);
        router.refresh();
      } catch (error) {
        // Same TypeError-signals-unreachable-server heuristic as the
        // attendance marker — a real rejection from a server action that
        // did run (e.g. deadline passed) throws an Error/ApiError instead.
        if (error instanceof TypeError) {
          await queueSubmission(entries);
          return;
        }
        toast.error(error instanceof Error ? error.message : "Couldn't submit scores.");
      }
    });
  }

  const deadlinePassed =
    selectedContext.scoreEntryDeadline != null &&
    new Date(selectedContext.scoreEntryDeadline).getTime() < Date.now();

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm flex-1 space-y-1.5">
            <Label>Class & Subject</Label>
            <Select
              value={initialContextKey}
              onValueChange={(value) => value && navigateTo(value)}
              items={contexts.map((c) => ({ value: c.key, label: c.label }))}
            >
              <SelectTrigger className="w-full" aria-label="Class & Subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contexts.map((c) => (
                  <SelectItem key={c.key} value={c.key}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedContext.scoreEntryDeadline && (
            <div
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium',
                deadlinePassed ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              <Clock3 className="size-3.5" aria-hidden="true" />
              {deadlinePassed ? 'Deadline passed: ' : 'Deadline: '}
              {formatDeadline(selectedContext.scoreEntryDeadline)}
            </div>
          )}
        </CardContent>
      </Card>

      {locked && (
        <div className="flex items-center gap-2 rounded-lg border border-info-soft bg-info-soft px-4 py-3 text-sm text-info-soft-foreground">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Submitted — awaiting collation.
            {submittedAt && ` Submitted ${formatDeadline(submittedAt)}.`} An Exam Officer or Admin
            must unlock this before you can make further changes.
          </span>
        </div>
      )}

      {!locked && isQueued && (
        <div className="flex items-center gap-2 rounded-lg border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
          <CloudOff className="size-4 shrink-0" aria-hidden="true" />
          <span>
            Saved offline — will submit and lock automatically once you reconnect.
            {queuedCount > 1 && ` (${queuedCount} submissions queued across classes.)`}
          </span>
        </div>
      )}

      {isNavigating ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 w-full animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>No students enrolled</EmptyTitle>
            <EmptyDescription>This class has no actively-enrolled students yet.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      className={cn(index === 0 && 'sticky left-0 z-20 bg-card')}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell key={cell.id} className={cn(index === 0 && 'sticky left-0 z-10 bg-card')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!locked && !isQueued && rows.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filledCount} of {totalCells} cells filled
            {hasOverMax && (
              <span className="ml-2 inline-flex items-center gap-1 text-destructive">
                <AlertTriangle className="size-3.5" aria-hidden="true" />
                One or more scores exceed the maximum
              </span>
            )}
          </p>
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger render={<Button disabled={!allFilled || hasOverMax} />}>
              Submit Final Scores
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Submit final scores?</AlertDialogTitle>
                <AlertDialogDescription>
                  You won&apos;t be able to edit after submitting unless an Exam Officer unlocks
                  it — submit final scores for {selectedContext.label}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction disabled={isSubmitting} onClick={handleSubmit}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Submitting…
                    </>
                  ) : (
                    'Submit'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <NotificationPermissionPrompt show={hasSubmittedOnce} />
    </div>
  );
}
