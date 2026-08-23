'use client';

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { DAY_LABELS, SCHOOL_DAYS } from '@/components/timetable/week-grid';
import {
  createTimetableEntry,
  deleteTimetableEntry,
  updateTimetableEntry,
} from '@/lib/actions/timetable';
import type { PeriodDto, TimetableEntryDto } from '@/lib/types/timetable';

interface SlotSelection {
  dayOfWeek: number;
  period: PeriodDto;
  /** Present when editing an occupied cell. */
  entry?: TimetableEntryDto;
}

export function TimetableBuilder({
  armId,
  armLabel,
  termId,
  periods,
  entries,
  classSubjectOptions,
}: {
  armId: string;
  armLabel: string;
  termId: string;
  periods: PeriodDto[];
  entries: TimetableEntryDto[];
  classSubjectOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [slot, setSlot] = useState<SlotSelection | null>(null);
  const [classSubjectId, setClassSubjectId] = useState('');
  const [room, setRoom] = useState('');
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  function openSlot(selection: SlotSelection) {
    setSlot(selection);
    setClassSubjectId(selection.entry?.classSubjectId ?? '');
    setRoom(selection.entry?.room ?? '');
    setConflictError(null);
  }

  function close() {
    setSlot(null);
    setConflictError(null);
  }

  async function handleSave() {
    if (!slot) return;
    if (!classSubjectId) {
      setConflictError('Choose a subject first.');
      return;
    }
    setIsSaving(true);
    setConflictError(null);
    try {
      if (slot.entry) {
        await updateTimetableEntry(slot.entry.id, {
          classSubjectId,
          room: room.trim() || undefined,
        });
      } else {
        await createTimetableEntry({
          armId,
          classSubjectId,
          periodId: slot.period.id,
          dayOfWeek: slot.dayOfWeek,
          termId,
          room: room.trim() || undefined,
        });
      }
      toast.success('Saved.');
      close();
      router.refresh();
    } catch (error) {
      // The backend names exactly what's double-booked — surface it inline
      // in the dialog, not as a transient toast.
      setConflictError(error instanceof Error ? error.message : 'Could not save this slot.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemove() {
    if (!slot?.entry) return;
    setIsRemoving(true);
    try {
      await deleteTimetableEntry(slot.entry.id);
      toast.success('Removed.');
      close();
      router.refresh();
    } catch (error) {
      setConflictError(error instanceof Error ? error.message : 'Could not remove this entry.');
    } finally {
      setIsRemoving(false);
    }
  }

  function cellEntry(day: number, periodId: string): TimetableEntryDto | undefined {
    return entries.find((e) => e.dayOfWeek === day && e.periodId === periodId);
  }

  const cellButton = (day: number, period: PeriodDto) => {
    const entry = cellEntry(day, period.id);
    return (
      <button
        type="button"
        onClick={() => openSlot({ dayOfWeek: day, period, entry })}
        className={`w-full rounded-md px-2 py-1.5 text-left transition-colors ${
          entry
            ? 'bg-primary/10 hover:bg-primary/20'
            : 'border border-dashed border-border text-muted-foreground/60 hover:border-primary hover:text-primary'
        }`}
      >
        {entry ? (
          <>
            <p className="text-xs font-medium text-foreground">{entry.subjectName}</p>
            <p className="text-[11px] text-muted-foreground">
              {[entry.teacherName, entry.room].filter(Boolean).join(' · ') || ' '}
            </p>
          </>
        ) : (
          <span className="text-xs">+ Assign</span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* ≥md: grid */}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Period</th>
              {SCHOOL_DAYS.map((day) => (
                <th key={day} className="px-3 py-2 font-medium">
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {periods.map((period) => (
              <tr key={period.id}>
                <td className="whitespace-nowrap px-3 py-2 align-top">
                  <p className="font-medium text-foreground">{period.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {period.startTime}–{period.endTime}
                  </p>
                </td>
                {SCHOOL_DAYS.map((day) => (
                  <td key={day} className="px-2 py-1.5 align-top">
                    {cellButton(day, period)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* <md: day-by-day stacked (same cells, one day at a time) */}
      <div className="space-y-4 md:hidden">
        {SCHOOL_DAYS.map((day) => (
          <div key={day} className="overflow-hidden rounded-lg border border-border">
            <p className="bg-muted/50 px-3 py-2 text-xs font-semibold text-foreground">
              {DAY_LABELS[day]}
            </p>
            <div className="space-y-1.5 p-2">
              {periods.map((period) => (
                <div key={period.id} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {period.startTime}
                  </span>
                  <div className="min-w-0 flex-1">{cellButton(day, period)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={slot !== null} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {slot?.entry ? 'Edit slot' : 'Assign slot'} — {armLabel}
            </DialogTitle>
            <DialogDescription>
              {slot && `${DAY_LABELS[slot.dayOfWeek]}, ${slot.period.name} (${slot.period.startTime}–${slot.period.endTime})`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select
                value={classSubjectId}
                onValueChange={(v) => {
                  if (v) setClassSubjectId(v);
                }}
                items={classSubjectOptions.map((cs) => ({ value: cs.id, label: cs.label }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a subject…" />
                </SelectTrigger>
                <SelectContent>
                  {classSubjectOptions.map((cs) => (
                    <SelectItem key={cs.id} value={cs.id}>
                      {cs.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {classSubjectOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No subjects are mapped to this class yet — do that under Subjects &amp;
                  Curriculum.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slot-room">Room (optional)</Label>
              <Input
                id="slot-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Lab 1"
              />
            </div>

            {conflictError && (
              <div className="flex items-start gap-2 rounded-lg border border-error-soft bg-error-soft px-3 py-2.5 text-sm text-error-soft-foreground">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{conflictError}</span>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            {slot?.entry ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleRemove()}
                disabled={isRemoving || isSaving}
                className="text-muted-foreground hover:text-destructive"
              >
                {isRemoving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                Remove
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={close} disabled={isSaving || isRemoving}>
                Cancel
              </Button>
              <Button onClick={() => void handleSave()} disabled={isSaving || isRemoving}>
                {isSaving ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Saving…
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
