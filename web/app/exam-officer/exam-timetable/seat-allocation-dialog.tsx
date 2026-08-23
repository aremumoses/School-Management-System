'use client';

import { AlertTriangle, Loader2, Shuffle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  autoAllocateSeats,
  getSeatAllocations,
  manualAllocateSeat,
} from '@/lib/actions/exam-logistics';
import type {
  ExamHallDto,
  ExamSessionDto,
  SeatAllocationDto,
} from '@/lib/types/exam-logistics';

function SeatEditor({
  examSessionId,
  allocation,
  halls,
  onSaved,
}: {
  examSessionId: string;
  allocation: SeatAllocationDto;
  halls: ExamHallDto[];
  onSaved: (allocations: SeatAllocationDto[]) => void;
}) {
  const [hallId, setHallId] = useState(allocation.hallId);
  const [seatNumber, setSeatNumber] = useState(String(allocation.seatNumber));
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    setIsSaving(true);
    try {
      const updated = await manualAllocateSeat(examSessionId, {
        studentId: allocation.studentId,
        hallId,
        seatNumber: Number(seatNumber),
      });
      onSaved(updated);
      toast.success('Seat updated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the seat.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={hallId}
        onChange={(e) => setHallId(e.target.value)}
        className="h-8 rounded-md border border-border bg-background px-1.5 text-xs"
        aria-label="Hall"
      >
        {halls.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
      <Input
        type="number"
        min="1"
        value={seatNumber}
        onChange={(e) => setSeatNumber(e.target.value)}
        className="h-8 w-14 px-1.5 text-xs"
        aria-label="Seat number"
      />
      <Button size="sm" variant="ghost" onClick={() => void save()} disabled={isSaving}>
        {isSaving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : 'Save'}
      </Button>
    </div>
  );
}

export function SeatAllocationDialog({
  session,
  halls,
  onClose,
}: {
  session: ExamSessionDto;
  halls: ExamHallDto[];
  onClose: () => void;
}) {
  const [allocations, setAllocations] = useState<SeatAllocationDto[]>([]);
  const [selectedHallIds, setSelectedHallIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isAllocating, setIsAllocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTimeout(() => {
      void getSeatAllocations(session.id).then((data) => {
        if (!cancelled) {
          setAllocations(data);
          setIsLoading(false);
        }
      });
    }, 0);
    return () => {
      cancelled = true;
    };
  }, [session.id]);

  function toggleHall(hallId: string) {
    setSelectedHallIds((prev) => {
      const next = new Set(prev);
      if (next.has(hallId)) next.delete(hallId);
      else next.add(hallId);
      return next;
    });
  }

  async function handleAutoAllocate() {
    if (selectedHallIds.size === 0) {
      setError('Pick at least one hall.');
      return;
    }
    setIsAllocating(true);
    setError(null);
    try {
      const result = await autoAllocateSeats(session.id, {
        hallIds: [...selectedHallIds],
      });
      setAllocations(result);
      toast.success('Seats allocated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't allocate seats.");
    } finally {
      setIsAllocating(false);
    }
  }

  const byHall = new Map<string, SeatAllocationDto[]>();
  for (const a of allocations) {
    const list = byHall.get(a.hall.id) ?? [];
    list.push(a);
    byHall.set(a.hall.id, list);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Seating — {session.subjectName} ({session.armLabel})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Halls to fill</p>
            <div className="flex flex-wrap gap-3">
              {halls.map((hall) => (
                <label key={hall.id} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={selectedHallIds.has(hall.id)}
                    onCheckedChange={() => toggleHall(hall.id)}
                    aria-label={hall.name}
                  />
                  {hall.name} ({hall.capacity})
                </label>
              ))}
              {halls.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No exam halls configured yet.
                </p>
              )}
            </div>
            <Button size="sm" onClick={() => void handleAutoAllocate()} disabled={isAllocating}>
              {isAllocating ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Shuffle className="size-4" aria-hidden="true" />
              )}
              Auto-allocate
            </Button>
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-error-soft bg-error-soft px-3 py-2 text-sm text-error-soft-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-border pt-3">
            {isLoading ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
            ) : allocations.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No seats allocated yet — pick halls above and auto-allocate.
              </p>
            ) : (
              [...byHall.entries()].map(([hallId, rows]) => {
                const hall = halls.find((h) => h.id === hallId);
                return (
                  <div key={hallId} className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {hall?.name ?? 'Hall'}
                    </p>
                    <ul className="space-y-1">
                      {rows
                        .sort((a, b) => a.seatNumber - b.seatNumber)
                        .map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-sm"
                          >
                            <span className="text-foreground">
                              Seat {a.seatNumber} — {a.student.firstName} {a.student.lastName}{' '}
                              <span className="text-xs text-muted-foreground">
                                ({a.student.admissionNumber})
                              </span>
                            </span>
                            <SeatEditor
                              examSessionId={session.id}
                              allocation={a}
                              halls={halls}
                              onSaved={setAllocations}
                            />
                          </li>
                        ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
