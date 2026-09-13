'use client';

import { ChevronDown, Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPeriod, deletePeriod } from '@/lib/actions/timetable';
import type { PeriodDto } from '@/lib/types/timetable';
import { cn } from '@/lib/utils';

const PANEL_ID = 'school-periods-panel';

/** "6 slots · 08:00–14:00", from the earliest start to the latest end. */
function periodsSummary(periods: PeriodDto[]): string {
  if (periods.length === 0) return 'No periods yet — add the time slots of the school day';
  // HH:MM strings sort correctly as text.
  const start = periods.reduce((min, p) => (p.startTime < min ? p.startTime : min), periods[0].startTime);
  const end = periods.reduce((max, p) => (p.endTime > max ? p.endTime : max), periods[0].endTime);
  return `${periods.length} slot${periods.length === 1 ? '' : 's'} · ${start}–${end}`;
}

/** School-wide period (time slot) config — collapsed by default once slots exist. */
export function PeriodsManager({ periods }: { periods: PeriodDto[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(periods.length === 0);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim() || !startTime || !endTime) {
      toast.error('Name, start, and end time are all required.');
      return;
    }
    setIsSaving(true);
    try {
      await createPeriod({
        name: name.trim(),
        startTime,
        endTime,
        sortOrder: periods.length + 1,
      });
      setName('');
      setStartTime('');
      setEndTime('');
      toast.success('Period added.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add the period.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deletePeriod(id);
      toast.success('Period removed.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove the period.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={expanded ? PANEL_ID : undefined}
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:px-6 sm:py-5"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-heading">School Periods</span>
          <span className="block text-sm text-muted-foreground">{periodsSummary(periods)}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary dark:text-foreground">
          <span className="hidden sm:inline">{expanded ? 'Hide' : 'Manage'}</span>
          <ChevronDown
            className={cn('size-5 transition-transform', expanded && 'rotate-180')}
            aria-hidden="true"
          />
        </span>
      </button>

      {expanded && (
        <div id={PANEL_ID} className="border-t border-border">
          {periods.length > 0 && (
            <ul className="divide-y divide-border border-b border-border">
              {periods.map((period) => (
                <li key={period.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Clock className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-heading">{period.name}</p>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {period.startTime} – {period.endTime}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void handleDelete(period.id)}
                    disabled={deletingId === period.id}
                    aria-label={`Delete ${period.name}`}
                  >
                    {deletingId === period.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-4 px-5 py-5 sm:px-6">
            {periods.length === 0 && (
              <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                No periods defined yet.
              </p>
            )}
            <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-end">
              <div className="space-y-2 sm:w-48">
                <FormFieldLabel htmlFor="period-name" required>
                  Name
                </FormFieldLabel>
                <Input
                  id="period-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Period 1"
                  className="h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:contents">
                <div className="space-y-2 sm:w-36">
                  <FormFieldLabel htmlFor="period-start" required>
                    Starts
                  </FormFieldLabel>
                  <Input
                    id="period-start"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-10"
                  />
                </div>
                <div className="space-y-2 sm:w-36">
                  <FormFieldLabel htmlFor="period-end" required>
                    Ends
                  </FormFieldLabel>
                  <Input
                    id="period-end"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
              <Button onClick={() => void handleAdd()} disabled={isSaving} className="h-10 px-4">
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Plus className="size-4" aria-hidden="true" />
                )}
                Add Period
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
