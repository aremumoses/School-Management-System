'use client';

import { Loader2, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDeleteButton } from '@/components/dashboard/confirm-delete-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addFeeComponent, deleteFeeComponent, updateFeeComponent } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';
import type { FeeComponentDto, FeeComponentType, FeeStructureDto } from '@/lib/types/fees';

const TYPE_OPTIONS = [
  { value: 'RECURRING', label: 'Recurring' },
  { value: 'ONE_OFF', label: 'One-off' },
  { value: 'CONDITIONAL', label: 'Conditional' },
] as const;

const TYPE_BADGE_VARIANT: Record<FeeComponentType, 'default' | 'info' | 'warning'> = {
  RECURRING: 'default',
  ONE_OFF: 'info',
  CONDITIONAL: 'warning',
};

export function ExistingStructureEditor({ structure }: { structure: FeeStructureDto }) {
  const total = structure.components.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Fee components</h2>
          <AddComponentButton
            structureId={structure.id}
            existingNames={structure.components.map((c) => c.name)}
          />
        </div>

        {structure.components.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            No components yet — add at least one before generating invoices.
          </p>
        ) : (
          <div className="space-y-2">
            {structure.components.map((component) => (
              <div
                key={component.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">{component.name}</span>
                  <Badge variant={TYPE_BADGE_VARIANT[component.type]}>
                    {TYPE_OPTIONS.find((t) => t.value === component.type)?.label}
                  </Badge>
                  <span className="tabular-nums text-muted-foreground">
                    {formatNaira(component.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <ComponentEditor component={component} />
                  <ConfirmDeleteButton
                    itemLabel={component.name}
                    onConfirm={() => deleteFeeComponent(component.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium text-foreground">Running total</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{formatNaira(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ComponentEditor({ component }: { component: FeeComponentDto }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(component.name);
  const [amount, setAmount] = useState(String(component.amount));
  const [type, setType] = useState<FeeComponentType>(component.type);
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const parsedAmount = Number(amount);
    if (!name.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a name and an amount greater than 0.');
      return;
    }
    setIsSaving(true);
    try {
      await updateFeeComponent(component.id, { name, amount: parsedAmount, type });
      toast.success('Component updated.');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update component.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${component.name}`} />}>
        <Pencil className="size-4" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={`edit-name-${component.id}`}>Name</Label>
            <Input id={`edit-name-${component.id}`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`edit-amount-${component.id}`}>Amount (₦)</Label>
            <Input
              id={`edit-amount-${component.id}`}
              type="number"
              step="0.01"
              min="0"
              className="tabular-nums"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as FeeComponentType)} items={TYPE_OPTIONS}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" className="w-full" disabled={isSaving} onClick={save}>
            {isSaving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddComponentButton({
  structureId,
  existingNames,
}: {
  structureId: string;
  existingNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<FeeComponentType>('RECURRING');
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const parsedAmount = Number(amount);
    if (!name.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a name and an amount greater than 0.');
      return;
    }
    if (existingNames.some((existing) => existing.toLowerCase() === name.trim().toLowerCase())) {
      toast.error(`"${name.trim()}" already exists on this structure — edit it instead.`);
      return;
    }
    setIsSaving(true);
    try {
      await addFeeComponent(structureId, { name, amount: parsedAmount, type });
      toast.success('Component added.');
      setName('');
      setAmount('');
      setType('RECURRING');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add component.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Plus className="size-4" aria-hidden="true" />
        Add Component
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-component-name">Name</Label>
            <Input
              id="new-component-name"
              placeholder="e.g. Sports Levy"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-component-amount">Amount (₦)</Label>
            <Input
              id="new-component-amount"
              type="number"
              step="0.01"
              min="0"
              className="tabular-nums"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => v && setType(v as FeeComponentType)} items={TYPE_OPTIONS}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" size="sm" className="w-full" disabled={isSaving} onClick={save}>
            {isSaving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : 'Add'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
