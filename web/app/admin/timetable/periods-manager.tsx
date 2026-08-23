'use client';

import { ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPeriod, deletePeriod } from '@/lib/actions/timetable';
import type { PeriodDto } from '@/lib/types/timetable';

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
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
        <CardTitle className="text-base">
          School Periods{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({periods.length} slot{periods.length === 1 ? '' : 's'})
          </span>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setExpanded((e) => !e)}>
          {expanded ? (
            <ChevronDown className="size-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="size-4" aria-hidden="true" />
          )}
          {expanded ? 'Hide' : 'Manage'}
        </Button>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          {periods.length === 0 && (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              No periods defined yet.
            </p>
          )}
          {periods.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {periods.map((period) => (
                <li key={period.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-foreground">
                    {period.name}{' '}
                    <span className="tabular-nums text-xs text-muted-foreground">
                      {period.startTime}–{period.endTime}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleDelete(period.id)}
                    disabled={deletingId === period.id}
                    aria-label={`Delete ${period.name}`}
                  >
                    {deletingId === period.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="period-name" className="text-xs">
                Name
              </Label>
              <Input
                id="period-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Period 1"
                className="h-8 w-36 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period-start" className="text-xs">
                Starts
              </Label>
              <Input
                id="period-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-8 w-28 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period-end" className="text-xs">
                Ends
              </Label>
              <Input
                id="period-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="h-8 w-28 text-sm"
              />
            </div>
            <Button size="sm" onClick={() => void handleAdd()} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-3.5" aria-hidden="true" />
              )}
              Add Period
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
