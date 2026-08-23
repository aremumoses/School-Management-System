'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  createAssessmentComponent,
  deleteAssessmentComponent,
  updateAssessmentComponent,
} from '@/lib/actions/admin';
import type { AssessmentComponentDto } from '@/lib/types/results';

export function AssessmentStructureManager({
  termId,
  initialComponents,
}: {
  termId: string;
  initialComponents: AssessmentComponentDto[];
}) {
  const [components, setComponents] = useState(initialComponents);
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState('');
  const [newMax, setNewMax] = useState('');
  const [newWeight, setNewWeight] = useState('');

  function handleAdd() {
    const name = newName.trim();
    const maxScore = Number(newMax);
    const weight = Number(newWeight);
    if (!name) return toast.error('Name is required.');
    if (!maxScore || maxScore <= 0) return toast.error('Max score must be positive.');
    if (!weight || weight <= 0) return toast.error('Weight must be positive.');

    startTransition(async () => {
      try {
        await createAssessmentComponent({ name, maxScore, weight, termId });
        setNewName('');
        setNewMax('');
        setNewWeight('');
        toast.success('Component added.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to add component.');
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      try {
        await deleteAssessmentComponent(id);
        setComponents((prev) => prev.filter((c) => c.id !== id));
        toast.success('Component removed.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to remove component.');
      }
    });
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0);

  return (
    <div className="space-y-4">
      {components.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No assessment components defined for this term yet. Add one below.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Max Score</th>
                <th className="px-3 py-2 font-medium">Weight</th>
                <th className="px-3 py-2 font-medium" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {components.map((component) => (
                <ComponentRow
                  key={component.id}
                  component={component}
                  onDelete={() => handleDelete(component.id)}
                  isPending={isPending}
                />
              ))}
              <tr className="bg-muted/30 font-medium">
                <td className="px-3 py-2 text-xs text-muted-foreground" colSpan={2}>
                  Total weight
                </td>
                <td className="px-3 py-2 tabular-nums">
                  <span className={totalWeight !== 100 ? 'text-warning-soft-foreground' : ''}>
                    {totalWeight}%
                  </span>
                  {totalWeight !== 100 && (
                    <span className="ml-2 text-xs text-warning-soft-foreground">
                      (should sum to 100%)
                    </span>
                  )}
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Add new component */}
      <div className="rounded-lg border border-dashed border-border p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Add Component</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-36 space-y-1">
            <Label htmlFor="new-name" className="text-xs">Name (e.g. CA1, Exam)</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. CA1"
              className="h-8 text-sm"
            />
          </div>
          <div className="w-24 space-y-1">
            <Label htmlFor="new-max" className="text-xs">Max Score</Label>
            <Input
              id="new-max"
              type="number"
              min="1"
              value={newMax}
              onChange={(e) => setNewMax(e.target.value)}
              placeholder="30"
              className="h-8 text-sm"
            />
          </div>
          <div className="w-24 space-y-1">
            <Label htmlFor="new-weight" className="text-xs">Weight %</Label>
            <Input
              id="new-weight"
              type="number"
              min="1"
              max="100"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="30"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={handleAdd} disabled={isPending}>
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="size-3.5" aria-hidden="true" />
              )}
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComponentRow({
  component,
  onDelete,
  isPending,
}: {
  component: AssessmentComponentDto;
  onDelete: () => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(component.name);
  const [maxScore, setMaxScore] = useState(String(component.maxScore));
  const [weight, setWeight] = useState(String(component.weight));
  const [rowPending, startRowTransition] = useTransition();

  function handleBlur(field: 'name' | 'maxScore' | 'weight', value: string) {
    const update: Record<string, unknown> = {};
    if (field === 'name' && value.trim() && value !== component.name) {
      update.name = value.trim();
    } else if (field === 'maxScore' && Number(value) > 0 && Number(value) !== component.maxScore) {
      update.maxScore = Number(value);
    } else if (field === 'weight' && Number(value) > 0 && Number(value) !== component.weight) {
      update.weight = Number(value);
    }
    if (Object.keys(update).length === 0) return;
    startRowTransition(async () => {
      try {
        await updateAssessmentComponent(component.id, update as Parameters<typeof updateAssessmentComponent>[1]);
        toast.success('Updated.');
      } catch {
        toast.error('Failed to update.');
      }
    });
  }

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-3 py-1.5">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => handleBlur('name', e.target.value)}
          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-border focus:outline-none"
          disabled={rowPending || isPending}
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          type="number"
          value={maxScore}
          onChange={(e) => setMaxScore(e.target.value)}
          onBlur={(e) => handleBlur('maxScore', e.target.value)}
          className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm tabular-nums focus:border-border focus:outline-none"
          disabled={rowPending || isPending}
          min="1"
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onBlur={(e) => handleBlur('weight', e.target.value)}
          className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm tabular-nums focus:border-border focus:outline-none"
          disabled={rowPending || isPending}
          min="1"
          max="100"
        />
        <span className="ml-0.5 text-xs text-muted-foreground">%</span>
      </td>
      <td className="px-3 py-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={rowPending || isPending}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          aria-label={`Delete ${component.name}`}
        >
          {rowPending ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="size-3" aria-hidden="true" />
          )}
        </Button>
      </td>
    </tr>
  );
}
