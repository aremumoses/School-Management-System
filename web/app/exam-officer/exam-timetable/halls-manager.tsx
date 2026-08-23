'use client';

import { ChevronDown, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createExamHall, deleteExamHall } from '@/lib/actions/exam-logistics';
import type { ExamHallDto } from '@/lib/types/exam-logistics';

/** Exam hall (name + capacity) config — collapsed by default once halls exist. */
export function HallsManager({ halls }: { halls: ExamHallDto[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(halls.length === 0);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!name.trim() || !capacity) {
      toast.error('Name and capacity are both required.');
      return;
    }
    setIsSaving(true);
    try {
      await createExamHall({ name: name.trim(), capacity: Number(capacity) });
      setName('');
      setCapacity('');
      toast.success('Hall added.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add the hall.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteExamHall(id);
      toast.success('Hall removed.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove the hall.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
        <CardTitle className="text-base">
          Exam Halls{' '}
          <span className="text-sm font-normal text-muted-foreground">
            ({halls.length} hall{halls.length === 1 ? '' : 's'})
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
          {halls.length === 0 && (
            <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
              No exam halls defined yet.
            </p>
          )}
          {halls.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {halls.map((hall) => (
                <li key={hall.id} className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm text-foreground">
                    {hall.name}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({hall.capacity} seats)
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => void handleDelete(hall.id)}
                    disabled={deletingId === hall.id}
                    aria-label={`Delete ${hall.name}`}
                  >
                    {deletingId === hall.id ? (
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
              <Label htmlFor="hall-name" className="text-xs">
                Name
              </Label>
              <Input
                id="hall-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Assembly Hall"
                className="h-8 w-40 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hall-capacity" className="text-xs">
                Capacity
              </Label>
              <Input
                id="hall-capacity"
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="h-8 w-24 text-sm"
              />
            </div>
            <Button size="sm" onClick={() => void handleAdd()} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-3.5" aria-hidden="true" />
              )}
              Add Hall
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
