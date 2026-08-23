'use client';

import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Loader2,
  User,
  Users,
  XCircle,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
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
import { markRollCall } from '@/lib/actions/hostel-transport';
import type { RollCallDto, RollCallEntryDto, RollCallSession } from '@/lib/types/hostel-transport';
import { cn } from '@/lib/utils';

function initials(entry: { firstName: string; lastName: string }): string {
  return `${entry.firstName[0] ?? ''}${entry.lastName[0] ?? ''}`.toUpperCase();
}

type SyncState = 'idle' | 'saving' | 'saved' | 'error';

export function RollCallMarker({
  hostels,
  hostelId,
  date,
  session,
  initialRollCall,
}: {
  hostels: { id: string; name: string }[];
  hostelId: string;
  date: string;
  session: RollCallSession;
  initialRollCall: RollCallDto | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startNavigation] = useTransition();
  const [entries, setEntries] = useState<RollCallEntryDto[]>(initialRollCall?.entries ?? []);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const latestStudentRequestRef = useRef<Map<string, number>>(new Map());
  const inFlightSavesRef = useRef(0);

  function navigateTo(nextHostelId: string, nextDate: string, nextSession: RollCallSession) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('hostelId', nextHostelId);
    params.set('date', nextDate);
    params.set('session', nextSession);
    startNavigation(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function saveEntries(
    saveList: { studentId: string; present: boolean }[],
  ): Promise<RollCallEntryDto[]> {
    inFlightSavesRef.current += 1;
    setSyncState('saving');
    return (async () => {
      try {
        const result = await markRollCall({
          hostelId,
          date,
          session,
          entries: saveList,
        });
        setSyncState('saved');
        return result.entries;
      } catch (error) {
        setSyncState('error');
        toast.error(
          error instanceof Error
            ? `Couldn't save: ${error.message}`
            : "Couldn't save — please check your connection and try again.",
        );
        throw error;
      } finally {
        inFlightSavesRef.current = Math.max(0, inFlightSavesRef.current - 1);
        if (inFlightSavesRef.current === 0) {
          setSyncState((current) => (current === 'saving' ? 'saved' : current));
        }
      }
    })();
  }

  function markAllPresent() {
    const previous = entries;
    const next = entries.map((e) => ({ ...e, present: true, unapprovedAbsence: false }));
    setEntries(next);
    const toastId = toast.success(`Marked all ${next.length} boarders present.`);
    void saveEntries(next.map((e) => ({ studentId: e.studentId, present: true })))
      .then((freshEntries) => setEntries(freshEntries))
      .catch(() => {
        toast.dismiss(toastId);
        setEntries(previous);
      });
  }

  function setStudentPresent(studentId: string, present: boolean) {
    const entry = entries.find((e) => e.studentId === studentId);
    if (!entry || entry.present === present) return;
    const requestId = (latestStudentRequestRef.current.get(studentId) ?? 0) + 1;
    latestStudentRequestRef.current.set(studentId, requestId);
    const previousEntries = entries;
    // Optimistically flip the toggle; unapprovedAbsence stays whatever it
    // was until the server's recomputed value comes back — the point is
    // the present/absent state itself, not this transient flag.
    setEntries((current) =>
      current.map((e) => (e.studentId === studentId ? { ...e, present } : e)),
    );
    const toastId = toast.success(
      `${entry.firstName} ${entry.lastName} marked ${present ? 'present' : 'absent'}.`,
      { duration: 2000 },
    );
    void saveEntries([{ studentId, present }])
      .then((freshEntries) => {
        if (latestStudentRequestRef.current.get(studentId) !== requestId) return;
        // Merge in the server's recomputed unapprovedAbsence flags for
        // everyone (a leave-request decision elsewhere could have changed
        // another boarder's flag too), not just this one student.
        setEntries((current) =>
          current.map((e) => freshEntries.find((f) => f.studentId === e.studentId) ?? e),
        );
      })
      .catch(() => {
        if (latestStudentRequestRef.current.get(studentId) !== requestId) return;
        toast.dismiss(toastId);
        setEntries(previousEntries);
      });
  }

  const presentCount = entries.filter((e) => e.present).length;
  const absentCount = entries.length - presentCount;
  const unapprovedCount = entries.filter((e) => e.unapprovedAbsence).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Hostel</Label>
              <Select
                value={hostelId}
                onValueChange={(v) => v && navigateTo(v, date, session)}
                items={hostels.map((h) => ({ value: h.id, label: h.name }))}
              >
                <SelectTrigger className="w-full" aria-label="Hostel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hostels.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roll-call-date">Date</Label>
              <Input
                id="roll-call-date"
                type="date"
                defaultValue={date}
                onChange={(e) => navigateTo(hostelId, e.target.value, session)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Session</Label>
              <Select
                value={session}
                onValueChange={(v) => v && navigateTo(hostelId, date, v as RollCallSession)}
                items={[
                  { value: 'MORNING', label: 'Morning' },
                  { value: 'EVENING', label: 'Evening' },
                ]}
              >
                <SelectTrigger className="w-full" aria-label="Session">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MORNING">Morning</SelectItem>
                  <SelectItem value="EVENING">Evening</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={markAllPresent}
            disabled={isNavigating || entries.length === 0}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Mark All Present
          </Button>
        </CardContent>
      </Card>

      {entries.length > 0 && !isNavigating && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{presentCount} Present</Badge>
            <Badge variant="error">{absentCount} Absent</Badge>
            {unapprovedCount > 0 && (
              <Badge variant="error">
                <AlertTriangle className="size-3" aria-hidden="true" />
                {unapprovedCount} Unapproved
              </Badge>
            )}
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
            {syncState === 'error' && (
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="size-3.5" aria-hidden="true" />
                Couldn&apos;t save the last change
              </span>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isNavigating ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[88px] w-full rounded-lg" />
          ))
        ) : entries.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No boarders in this hostel</EmptyTitle>
              <EmptyDescription>Allocate beds under Room &amp; Bed Allocation first.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.studentId}
              className={cn(
                'flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between',
                entry.unapprovedAbsence ? 'border-destructive' : 'border-border',
              )}
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{initials(entry) || <User className="size-3.5" />}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {entry.firstName} {entry.lastName}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{entry.admissionNumber}</p>
                  {entry.unapprovedAbsence && (
                    <p className="flex items-center gap-1 text-xs font-medium text-destructive">
                      <AlertTriangle className="size-3" aria-hidden="true" />
                      Unapproved — Admin &amp; guardian notified
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 sm:w-56">
                <button
                  type="button"
                  aria-label={`Mark ${entry.firstName} ${entry.lastName} present`}
                  aria-pressed={entry.present}
                  onClick={() => setStudentPresent(entry.studentId, true)}
                  className={cn(
                    'flex h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]',
                    entry.present
                      ? 'bg-success-soft text-success-soft-foreground ring-2 ring-success'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
                  Present
                </button>
                <button
                  type="button"
                  aria-label={`Mark ${entry.firstName} ${entry.lastName} absent`}
                  aria-pressed={!entry.present}
                  onClick={() => setStudentPresent(entry.studentId, false)}
                  className={cn(
                    'flex h-11 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]',
                    !entry.present
                      ? 'bg-error-soft text-error-soft-foreground ring-2 ring-destructive'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  <XCircle className="size-3.5 shrink-0" aria-hidden="true" />
                  Absent
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
