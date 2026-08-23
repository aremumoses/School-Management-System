'use client';

import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Clock3,
  CloudOff,
  FileCheck2,
  Loader2,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { NotificationPermissionPrompt } from '@/components/pwa/notification-permission-prompt';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ATTENDANCE_STATUS_BADGE,
  ATTENDANCE_STATUS_LABELS,
  TEACHER_MARKABLE_STATUSES,
} from '@/lib/attendance-status-labels';
import { markAttendance } from '@/lib/actions/attendance';
import {
  flushAttendanceQueue,
  getQueuedAttendanceCount,
  mergeIntoQueuedAttendanceWrite,
} from '@/lib/offline/attendance-queue';
import { useFlushOnReconnect } from '@/lib/offline/use-flush-on-reconnect';
import type { AttendanceRosterEntry, AttendanceStatus } from '@/lib/types/attendance';
import { cn } from '@/lib/utils';

export interface MarkingContext {
  key: string;
  armId: string;
  classSubjectId?: string;
  label: string;
}

const STATUS_ICONS: Record<AttendanceStatus, typeof CheckCircle2> = {
  PRESENT: CheckCircle2,
  ABSENT: XCircle,
  LATE: Clock3,
  EXCUSED: FileCheck2,
  ON_LEAVE: FileCheck2,
};

const ACTIVE_CLASSES: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-success-soft text-success-soft-foreground ring-2 ring-success',
  ABSENT: 'bg-error-soft text-error-soft-foreground ring-2 ring-destructive',
  LATE: 'bg-warning-soft text-warning-soft-foreground ring-2 ring-warning',
  EXCUSED: 'bg-info-soft text-info-soft-foreground ring-2 ring-info',
  ON_LEAVE: 'bg-info-soft text-info-soft-foreground ring-2 ring-info',
};

function initials(student: { firstName: string; lastName: string }): string {
  return `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase();
}

type SyncState = 'idle' | 'saving' | 'saved' | 'queued' | 'error';

/**
 * The parent page renders this with `key={`${contextKey}::${date}`}`, so a
 * context/date change (whether from this component's own picker or from a
 * fresh page load / browser refresh) always remounts with the matching
 * server-fetched roster, instead of this component's own state drifting out
 * of sync with the URL.
 */
export function AttendanceMarker({
  contexts,
  initialContextKey,
  initialDate,
  initialRoster,
}: {
  contexts: MarkingContext[];
  initialContextKey: string;
  initialDate: string;
  initialRoster: AttendanceRosterEntry[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startNavigation] = useTransition();
  const [roster, setRoster] = useState(initialRoster);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [queuedCount, setQueuedCount] = useState(0);
  const [hasSavedOnce, setHasSavedOnce] = useState(false);
  // Same idea per student: tapping a status, then tapping a different one
  // for the same student before the first save resolves, must not let the
  // first (now-stale) save's failure roll back over the second tap.
  const latestStudentRequestRef = useRef<Map<string, number>>(new Map());
  const inFlightSavesRef = useRef(0);

  const onQueueFlushed = useCallback(
    (count: number) => {
      toast.success(`${count} queued change(s) synced.`);
      setQueuedCount(0);
      setSyncState('saved');
      router.refresh();
    },
    [router],
  );
  useFlushOnReconnect(flushAttendanceQueue, onQueueFlushed);

  const selectedContext = contexts.find((c) => c.key === initialContextKey) ?? contexts[0];
  const counts = TEACHER_MARKABLE_STATUSES.reduce(
    (acc, status) => {
      acc[status] = roster.filter((s) => s.status === status).length;
      return acc;
    },
    {} as Record<AttendanceStatus, number>,
  );

  function navigateTo(nextContextKey: string, nextDate: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('context', nextContextKey);
    params.set('date', nextDate);
    startNavigation(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  /**
   * Every status change saves itself immediately — there is deliberately
   * no separate "Save" button. Tapping a status and trusting it's done is
   * the whole point: a two-step "tap, then remember to also press Save
   * lower down" flow is exactly how marks were silently never reaching the
   * server (and never showing up on the Admin dashboard) in practice.
   */
  async function queueEntries(entries: { studentId: string; status: AttendanceStatus }[]) {
    await mergeIntoQueuedAttendanceWrite({
      armId: selectedContext.armId,
      classSubjectId: selectedContext.classSubjectId,
      date: initialDate,
      entries,
    });
    setQueuedCount(await getQueuedAttendanceCount());
    setSyncState('queued');
    toast.message('Saved offline — will sync when you reconnect.');
  }

  function saveEntries(entries: { studentId: string; status: AttendanceStatus }[]): Promise<void> {
    inFlightSavesRef.current += 1;
    setSyncState('saving');
    // Returns the real promise (not a void-called, fire-and-forget IIFE) —
    // callers below need to `.catch()` onto an actual rejection to know
    // whether to roll back their optimistic update. An earlier version of
    // this function discarded its own internal promise, which meant the
    // rollback logic silently never ran on failure.
    return (async () => {
      try {
        if (!navigator.onLine) {
          await queueEntries(entries);
          return;
        }
        try {
          await markAttendance({
            armId: selectedContext.armId,
            classSubjectId: selectedContext.classSubjectId,
            date: initialDate,
            entries,
          });
          setSyncState('saved');
          setHasSavedOnce(true);
        } catch (error) {
          // A TypeError here means fetch never reached the server at all
          // (offline, DNS failure, connection dropped mid-request) — as
          // opposed to an Error/ApiError thrown from inside a server action
          // that DID run, whose message survives the RSC boundary intact.
          // Only the former is safe to silently queue instead of surfacing.
          if (error instanceof TypeError) {
            await queueEntries(entries);
            return;
          }
          setSyncState('error');
          toast.error(
            error instanceof Error
              ? `Couldn't save: ${error.message}`
              : "Couldn't save — please check your connection and try again.",
          );
          throw error;
        }
      } finally {
        inFlightSavesRef.current = Math.max(0, inFlightSavesRef.current - 1);
        if (inFlightSavesRef.current === 0) {
          setSyncState((current) => (current === 'saving' ? 'saved' : current));
        }
      }
    })();
  }

  function markAllPresent() {
    const previousRoster = roster;
    const next = roster.map((s) => ({ ...s, status: 'PRESENT' as const }));
    setRoster(next);
    const toastId = toast.success(`Marked all ${next.length} students present.`);
    void saveEntries(next.map((s) => ({ studentId: s.studentId, status: s.status }))).catch(() => {
      toast.dismiss(toastId);
      setRoster(previousRoster);
    });
  }

  function setStudentStatus(studentId: string, status: AttendanceStatus) {
    const student = roster.find((s) => s.studentId === studentId);
    if (!student || student.status === status) return;
    const requestId = (latestStudentRequestRef.current.get(studentId) ?? 0) + 1;
    latestStudentRequestRef.current.set(studentId, requestId);
    const previousStatus = student.status;
    setRoster((current) =>
      current.map((s) => (s.studentId === studentId ? { ...s, status } : s)),
    );
    const toastId = toast.success(
      `${student.firstName} ${student.lastName} marked ${ATTENDANCE_STATUS_LABELS[status]}.`,
      { duration: 2000 },
    );
    void saveEntries([{ studentId, status }]).catch(() => {
      // Only roll back if no newer tap for this same student has happened
      // since — otherwise an old, slower failure could clobber a later,
      // successful change.
      if (latestStudentRequestRef.current.get(studentId) !== requestId) {
        return;
      }
      toast.dismiss(toastId);
      setRoster((current) =>
        current.map((s) => (s.studentId === studentId ? { ...s, status: previousStatus } : s)),
      );
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select
                value={initialContextKey}
                onValueChange={(value) => value && navigateTo(value, initialDate)}
                items={contexts.map((c) => ({ value: c.key, label: c.label }))}
              >
                {/* aria-label, not just the visible Label above — this
                    trigger is a button, not a native <select>, so a
                    plain unlinked <label> (no htmlFor/id pairing
                    possible here) isn't announced by screen readers. */}
                <SelectTrigger className="w-full" aria-label="Class">
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
            <div className="space-y-1.5">
              <Label htmlFor="attendance-date">Date</Label>
              <Input
                id="attendance-date"
                type="date"
                defaultValue={initialDate}
                onChange={(e) => navigateTo(initialContextKey, e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={markAllPresent}
            disabled={isNavigating || roster.length === 0}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Mark All Present
          </Button>
        </CardContent>
      </Card>

      {/* Today's attendance at a glance — a teacher should be able to see
          what's recorded for this class/date without scanning every row. */}
      {roster.length > 0 && !isNavigating && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {TEACHER_MARKABLE_STATUSES.map((status) => (
              <Badge key={status} variant={ATTENDANCE_STATUS_BADGE[status]}>
                {counts[status]} {ATTENDANCE_STATUS_LABELS[status]}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
            {syncState === 'saving' && (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Saving…
              </>
            )}
            {syncState === 'saved' && (
              <>
                <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                All changes saved
              </>
            )}
            {syncState === 'queued' && (
              <span className="flex items-center gap-1.5 text-warning">
                <CloudOff className="size-3.5" aria-hidden="true" />
                Queued — will sync when back online
                {queuedCount > 1 && ` (${queuedCount})`}
              </span>
            )}
            {syncState === 'error' && (
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="size-3.5" aria-hidden="true" />
                Couldn&apos;t save the last change
              </span>
            )}
          </div>
        </div>
      )}

      <NotificationPermissionPrompt show={hasSavedOnce} />

      <div className="space-y-2">
        {isNavigating ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[104px] w-full rounded-lg sm:h-[68px]" />
          ))
        ) : roster.length === 0 ? (
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
          roster.map((student) => (
            <div
              key={student.studentId}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  {student.photoUrl && <AvatarImage src={student.photoUrl} alt="" />}
                  <AvatarFallback>{initials(student) || <User className="size-3.5" />}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{student.admissionNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {TEACHER_MARKABLE_STATUSES.map((status) => {
                  const Icon = STATUS_ICONS[status];
                  const isActive = student.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      aria-label={`Mark ${student.firstName} ${student.lastName} ${ATTENDANCE_STATUS_LABELS[status]}`}
                      aria-pressed={isActive}
                      onClick={() => setStudentStatus(student.studentId, status)}
                      className={cn(
                        'flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] leading-none font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] sm:h-10 sm:flex-row sm:gap-1.5 sm:text-xs',
                        isActive
                          ? ACTIVE_CLASSES[status]
                          : 'bg-muted text-muted-foreground hover:bg-muted/70',
                      )}
                    >
                      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                      {ATTENDANCE_STATUS_LABELS[status]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
