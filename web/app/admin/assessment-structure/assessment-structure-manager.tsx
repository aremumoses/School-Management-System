'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createAssessmentComponent,
  deleteAssessmentComponent,
  updateAssessmentComponent,
} from '@/lib/actions/admin';
import type { AssessmentComponentDto } from '@/lib/types/results';
import { cn } from '@/lib/utils';

// Reads as plain text until hovered or focused, then shows its edit frame.
const INLINE_INPUT =
  'h-9 rounded-md border border-transparent bg-transparent px-2 text-sm text-heading outline-none transition-colors hover:border-border focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary/20 disabled:opacity-60';

const HEAD = 'h-12 text-left font-semibold whitespace-nowrap text-primary dark:text-heading';

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
    <div>
      {components.length === 0 ? (
        <div className="px-5 pt-5 sm:px-6">
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No assessment components defined for this term yet. Add one below.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[22rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-primary/5">
                <th scope="col" className={cn(HEAD, 'px-5 sm:pl-6')}>Name</th>
                <th scope="col" className={cn(HEAD, 'w-28 px-3')}>Max Score</th>
                <th scope="col" className={cn(HEAD, 'w-32 px-3')}>Weight</th>
                <th scope="col" className="w-14 pr-5 sm:pr-6">
                  <span className="sr-only">Actions</span>
                </th>
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
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-primary/5">
                <td colSpan={2} className="px-5 py-3 font-semibold text-heading sm:pl-6">
                  Total weight
                </td>
                <td colSpan={2} className="px-3 py-3 pr-5 sm:pr-6">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-heading tabular-nums">{totalWeight}%</span>
                    {totalWeight !== 100 && (
                      <Badge variant="warning">should sum to 100%</Badge>
                    )}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add new component */}
      <div className="border-t border-border px-5 py-5 sm:px-6">
        <h3 className="mb-4 text-base font-semibold text-heading">Add Component</h3>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] sm:items-end">
          <div className="space-y-2">
            <FormFieldLabel htmlFor="new-name" required>
              Name
            </FormFieldLabel>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. CA1 or Exam"
              className="h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:contents">
            <div className="space-y-2">
              <FormFieldLabel htmlFor="new-max" required>
                Max score
              </FormFieldLabel>
              <Input
                id="new-max"
                type="number"
                min="1"
                value={newMax}
                onChange={(e) => setNewMax(e.target.value)}
                placeholder="30"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <FormFieldLabel htmlFor="new-weight" required>
                Weight %
              </FormFieldLabel>
              <Input
                id="new-weight"
                type="number"
                min="1"
                max="100"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="30"
                className="h-10"
              />
            </div>
          </div>
          <Button onClick={handleAdd} disabled={isPending} className="h-10 w-full px-4 sm:w-auto">
            {isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="size-4" aria-hidden="true" />
            )}
            Add
          </Button>
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
    <tr className="transition-colors hover:bg-primary/5">
      {/* Cell padding minus the input's own 1px border and 8px padding, so
          the values line up with their column headings. */}
      <td className="py-2 pr-3 pl-3 sm:pl-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={(e) => handleBlur('name', e.target.value)}
          aria-label="Component name"
          className={cn(INLINE_INPUT, 'w-full min-w-24 font-semibold')}
          disabled={rowPending || isPending}
        />
      </td>
      <td className="px-1 py-2">
        <input
          type="number"
          value={maxScore}
          onChange={(e) => setMaxScore(e.target.value)}
          onBlur={(e) => handleBlur('maxScore', e.target.value)}
          aria-label={`${component.name} max score`}
          className={cn(INLINE_INPUT, 'w-20 tabular-nums')}
          disabled={rowPending || isPending}
          min="1"
        />
      </td>
      <td className="px-1 py-2">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            onBlur={(e) => handleBlur('weight', e.target.value)}
            aria-label={`${component.name} weight percentage`}
            className={cn(INLINE_INPUT, 'w-20 tabular-nums')}
            disabled={rowPending || isPending}
            min="1"
            max="100"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </span>
      </td>
      <td className="py-2 pr-3 text-right sm:pr-4">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          disabled={rowPending || isPending}
          aria-label={`Delete ${component.name}`}
        >
          {rowPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="size-4 text-destructive" aria-hidden="true" />
          )}
        </Button>
      </td>
    </tr>
  );
}
