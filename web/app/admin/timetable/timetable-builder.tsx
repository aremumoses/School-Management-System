'use client';

import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
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
import { cn } from '@/lib/utils';

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
    const details = entry
      ? [entry.teacherName, entry.room].filter((part): part is string => Boolean(part))
      : [];
    return (
      <button
        type="button"
        onClick={() => openSlot({ dayOfWeek: day, period, entry })}
        className={cn(
          'flex min-h-14 w-full flex-col justify-center rounded-lg px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          entry
            ? 'border-l-4 border-primary bg-primary/10 hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25'
            : 'items-center border border-dashed border-border text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary dark:hover:text-foreground',
        )}
      >
        {/* The grid's row and column headers give sighted users the slot;
            a screen reader reaching a lone "Assign" needs it spelled out. */}
        <span className="sr-only">
          {DAY_LABELS[day]}, {period.name}:{' '}
        </span>
        {entry ? (
          <>
            <span className="line-clamp-2 text-[13px] leading-snug font-semibold text-heading">
              {entry.subjectName}
            </span>
            {details.length > 0 && (
              <span className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                {/* Each part stays whole, so a narrow cell wraps "Room 4"
                    onto the next line rather than splitting it. */}
                {details.map((part, index) => (
                  <Fragment key={index}>
                    {index > 0 && ' · '}
                    <span className="whitespace-nowrap">{part}</span>
                  </Fragment>
                ))}
              </span>
            )}
          </>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium">
            <Plus className="size-3.5" aria-hidden="true" />
            Assign
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* ≥md: grid */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[48rem] table-fixed text-sm">
          <thead>
            <tr className="border-b border-border bg-primary/5">
              <th
                scope="col"
                className="w-36 px-5 py-3.5 text-left font-semibold text-primary sm:pl-6 dark:text-heading"
              >
                Period
              </th>
              {SCHOOL_DAYS.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="py-3.5 pr-2 pl-5 text-left font-semibold text-primary dark:text-heading"
                >
                  {DAY_LABELS[day]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {periods.map((period) => (
              <tr key={period.id}>
                <th scope="row" className="px-5 py-3 text-left align-top font-normal sm:pl-6">
                  <span className="block font-semibold text-heading">{period.name}</span>
                  <span className="block text-xs tabular-nums text-muted-foreground">
                    {period.startTime} – {period.endTime}
                  </span>
                </th>
                {SCHOOL_DAYS.map((day) => (
                  <td key={day} className="px-1.5 py-2 align-top last:pr-5">
                    {cellButton(day, period)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* <md: day-by-day stacked (same cells, one day at a time) */}
      <div className="space-y-3 p-4 md:hidden">
        {SCHOOL_DAYS.map((day) => (
          <div key={day} className="overflow-hidden rounded-xl border border-border">
            <p className="border-b border-border bg-primary/5 px-4 py-2.5 text-sm font-semibold text-primary dark:text-heading">
              {DAY_LABELS[day]}
            </p>
            <div className="space-y-2 p-3">
              {periods.map((period) => (
                <div key={period.id} className="flex items-center gap-3">
                  <span className="w-11 shrink-0 text-xs tabular-nums text-muted-foreground">
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
            <DialogTitle className="text-lg font-semibold text-heading">
              {slot?.entry ? 'Edit slot' : 'Assign slot'} — {armLabel}
            </DialogTitle>
            <DialogDescription>
              {slot && `${DAY_LABELS[slot.dayOfWeek]}, ${slot.period.name} (${slot.period.startTime}–${slot.period.endTime})`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="space-y-2">
              <FormFieldLabel required>Subject</FormFieldLabel>
              <Select
                value={classSubjectId}
                onValueChange={(v) => {
                  if (v) setClassSubjectId(v);
                }}
                items={classSubjectOptions.map((cs) => ({ value: cs.id, label: cs.label }))}
              >
                <SelectTrigger className="w-full data-[size=default]:h-10" aria-label="Subject">
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

            <div className="space-y-2">
              <FormFieldLabel htmlFor="slot-room">Room (optional)</FormFieldLabel>
              <Input
                id="slot-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. Lab 1"
                className="h-10"
              />
            </div>

            {conflictError && (
              <div className="flex items-start gap-2 rounded-xl border border-error-soft bg-error-soft px-3.5 py-3 text-sm text-error-soft-foreground">
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
                className="text-destructive hover:text-destructive"
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
