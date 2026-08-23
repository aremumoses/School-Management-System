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
import { markTransportAttendance } from '@/lib/actions/hostel-transport';
import type {
  TransportAttendanceDto,
  TransportAttendanceEntryDto,
  TransportRun,
} from '@/lib/types/hostel-transport';
import { cn } from '@/lib/utils';

function initials(entry: { firstName: string; lastName: string }): string {
  return `${entry.firstName[0] ?? ''}${entry.lastName[0] ?? ''}`.toUpperCase();
}

type SyncState = 'idle' | 'saving' | 'saved' | 'error';

export function PickupAttendanceMarker({
  routes,
  routeId,
  date,
  run,
  initialAttendance,
}: {
  routes: { id: string; name: string }[];
  routeId: string;
  date: string;
  run: TransportRun;
  initialAttendance: TransportAttendanceDto | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, startNavigation] = useTransition();
  const [entries, setEntries] = useState<TransportAttendanceEntryDto[]>(
    initialAttendance?.entries ?? [],
  );
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const latestRequestRef = useRef<Map<string, number>>(new Map());
  const inFlightRef = useRef(0);

  function navigateTo(nextRouteId: string, nextDate: string, nextRun: TransportRun) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('routeId', nextRouteId);
    params.set('date', nextDate);
    params.set('run', nextRun);
    startNavigation(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function saveEntries(
    saveList: { studentId: string; boarded: boolean }[],
  ): Promise<TransportAttendanceEntryDto[]> {
    inFlightRef.current += 1;
    setSyncState('saving');
    return (async () => {
      try {
        const result = await markTransportAttendance({ routeId, date, run, entries: saveList });
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
        inFlightRef.current = Math.max(0, inFlightRef.current - 1);
        if (inFlightRef.current === 0) {
          setSyncState((current) => (current === 'saving' ? 'saved' : current));
        }
      }
    })();
  }

  function markAllBoarded() {
    const previous = entries;
    const next = entries.map((e) => ({ ...e, boarded: true }));
    setEntries(next);
    const toastId = toast.success(`Marked all ${next.length} students boarded.`);
    void saveEntries(next.map((e) => ({ studentId: e.studentId, boarded: true })))
      .then((fresh) => setEntries(fresh))
      .catch(() => {
        toast.dismiss(toastId);
        setEntries(previous);
      });
  }

  function setBoarded(studentId: string, boarded: boolean) {
    const entry = entries.find((e) => e.studentId === studentId);
    if (!entry || entry.boarded === boarded) return;
    const requestId = (latestRequestRef.current.get(studentId) ?? 0) + 1;
    latestRequestRef.current.set(studentId, requestId);
    const previousEntries = entries;
    setEntries((current) =>
      current.map((e) => (e.studentId === studentId ? { ...e, boarded } : e)),
    );
    const toastId = toast.success(
      `${entry.firstName} ${entry.lastName} marked ${boarded ? 'boarded' : 'no-show'}.`,
      { duration: 2000 },
    );
    void saveEntries([{ studentId, boarded }])
      .then((fresh) => {
        if (latestRequestRef.current.get(studentId) !== requestId) return;
        setEntries((current) =>
          current.map((e) => fresh.find((f) => f.studentId === e.studentId) ?? e),
        );
      })
      .catch(() => {
        if (latestRequestRef.current.get(studentId) !== requestId) return;
        toast.dismiss(toastId);
        setEntries(previousEntries);
      });
  }

  const boardedCount = entries.filter((e) => e.boarded).length;
  const noShowCount = entries.length - boardedCount;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-col gap-3 py-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Route</Label>
              <Select
                value={routeId}
                onValueChange={(v) => v && navigateTo(v, date, run)}
                items={routes.map((r) => ({ value: r.id, label: r.name }))}
              >
                <SelectTrigger className="w-full" aria-label="Route">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {routes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pickup-date">Date</Label>
              <Input
                id="pickup-date"
                type="date"
                defaultValue={date}
                onChange={(e) => navigateTo(routeId, e.target.value, run)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Run</Label>
              <Select
                value={run}
                onValueChange={(v) => v && navigateTo(routeId, date, v as TransportRun)}
                items={[
                  { value: 'PICKUP', label: 'Pickup' },
                  { value: 'DROPOFF', label: 'Drop-off' },
                ]}
              >
                <SelectTrigger className="w-full" aria-label="Run">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PICKUP">Pickup</SelectItem>
                  <SelectItem value="DROPOFF">Drop-off</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={markAllBoarded}
            disabled={isNavigating || entries.length === 0}
          >
            <CheckCheck className="size-4" aria-hidden="true" />
            Mark All Boarded
          </Button>
        </CardContent>
      </Card>

      {entries.length > 0 && !isNavigating && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success">{boardedCount} Boarded</Badge>
            <Badge variant="error">{noShowCount} No-show</Badge>
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
              <EmptyTitle>No students assigned to this route</EmptyTitle>
              <EmptyDescription>Assign students under Student-Route Assignment first.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.studentId}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{initials(entry) || <User className="size-3.5" />}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {entry.firstName} {entry.lastName}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {entry.admissionNumber} · {entry.stopName}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  aria-label={`Mark ${entry.firstName} ${entry.lastName} boarded`}
                  aria-pressed={entry.boarded}
                  onClick={() => setBoarded(entry.studentId, true)}
                  className={cn(
                    'flex h-12 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]',
                    entry.boarded
                      ? 'bg-success-soft text-success-soft-foreground ring-2 ring-success'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                  Boarded
                </button>
                <button
                  type="button"
                  aria-label={`Mark ${entry.firstName} ${entry.lastName} no-show`}
                  aria-pressed={!entry.boarded}
                  onClick={() => setBoarded(entry.studentId, false)}
                  className={cn(
                    'flex h-12 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98]',
                    !entry.boarded
                      ? 'bg-error-soft text-error-soft-foreground ring-2 ring-destructive'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70',
                  )}
                >
                  <XCircle className="size-4 shrink-0" aria-hidden="true" />
                  No-show
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
