'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { proposeAction } from '@/lib/actions/discipline';
import type { DisciplinaryActionType } from '@/lib/types/discipline';

const ACTION_OPTIONS: { value: DisciplinaryActionType; label: string; helper: string }[] = [
  { value: 'WARNING', label: 'Warning', helper: 'Takes effect immediately, no approval needed.' },
  { value: 'SUSPENSION', label: 'Suspension', helper: 'Requires Admin approval before it takes effect.' },
  { value: 'EXPULSION', label: 'Expulsion', helper: 'Requires Admin approval before it takes effect.' },
];

export function ProposeActionForm({ incidentId }: { incidentId: string }) {
  const [actionType, setActionType] = useState<DisciplinaryActionType>('WARNING');
  const [isSaving, setIsSaving] = useState(false);
  const helper = ACTION_OPTIONS.find((o) => o.value === actionType)?.helper;

  async function submit() {
    setIsSaving(true);
    try {
      await proposeAction(incidentId, { actionType });
      toast.success(
        actionType === 'WARNING' ? 'Warning issued.' : `${actionType === 'SUSPENSION' ? 'Suspension' : 'Expulsion'} proposed — awaiting Admin approval.`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not propose this action.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl bg-card p-5 sm:p-6 dark:ring-1 dark:ring-foreground/10">
      <h2 className="text-lg font-semibold text-heading">Propose a Disciplinary Action</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-2 sm:w-64">
          <FormFieldLabel htmlFor="propose-action-type">Action</FormFieldLabel>
          <Select
            value={actionType}
            onValueChange={(v) => v && setActionType(v as DisciplinaryActionType)}
            items={ACTION_OPTIONS}
          >
            <SelectTrigger id="propose-action-type" className="w-full data-[size=default]:h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="button" className="h-10 px-5" disabled={isSaving} onClick={submit}>
          {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Propose Action'}
        </Button>
      </div>
      {helper && <p className="mt-2 text-sm text-muted-foreground">{helper}</p>}
    </section>
  );
}
