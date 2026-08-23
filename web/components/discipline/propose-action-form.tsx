'use client';

import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card>
      <CardHeader>
        <CardTitle>Propose a Disciplinary Action</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          value={actionType}
          onValueChange={(v) => v && setActionType(v as DisciplinaryActionType)}
          items={ACTION_OPTIONS}
        >
          <SelectTrigger className="w-full sm:w-64">
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
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
        <Button type="button" size="sm" disabled={isSaving} onClick={submit}>
          {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Propose Action'}
        </Button>
      </CardContent>
    </Card>
  );
}
