'use client';

import { Loader2, Pencil, Plus, Wallet } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDeleteButton } from '@/components/dashboard/confirm-delete-button';
import { Input } from '@/components/ui/input';
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
  const count = structure.components.length;

  return (
    <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Wallet className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-heading">Fee Components</h2>
            <p className="text-sm text-muted-foreground">
              {count} component{count === 1 ? '' : 's'} on this structure
            </p>
          </div>
        </div>
        <AddComponentButton
          structureId={structure.id}
          existingNames={structure.components.map((c) => c.name)}
        />
      </div>

      {count === 0 ? (
        <div className="p-5 sm:p-6">
          <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No components yet — add at least one before generating invoices.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {structure.components.map((component) => (
            // Phone: name and badge, then the amount underneath, with the
            // actions beside both. Wider: one row, actions last.
            <li
              key={component.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-5 py-3.5 transition-colors hover:bg-primary/5 sm:flex sm:gap-4 sm:px-6"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-1">
                <span className="font-semibold text-heading">{component.name}</span>
                <Badge variant={TYPE_BADGE_VARIANT[component.type]}>
                  {TYPE_OPTIONS.find((t) => t.value === component.type)?.label}
                </Badge>
              </div>
              <div className="row-span-2 flex items-center gap-1 sm:order-last">
                <ComponentEditor component={component} />
                <ConfirmDeleteButton
                  itemLabel={component.name}
                  onConfirm={() => deleteFeeComponent(component.id)}
                />
              </div>
              <span className="text-sm font-semibold text-heading tabular-nums sm:text-base">
                {formatNaira(component.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border bg-primary/5 px-5 py-4 sm:px-6">
        <span className="font-semibold text-heading">Running total</span>
        <span className="text-xl font-bold text-heading tabular-nums">{formatNaira(total)}</span>
      </div>
    </section>
  );
}

function ComponentFields({
  idPrefix,
  name,
  onNameChange,
  amount,
  onAmountChange,
  type,
  onTypeChange,
  namePlaceholder,
}: {
  idPrefix: string;
  name: string;
  onNameChange: (value: string) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  type: FeeComponentType;
  onTypeChange: (value: FeeComponentType) => void;
  namePlaceholder?: string;
}) {
  return (
    <>
      <div className="space-y-2">
        <FormFieldLabel htmlFor={`${idPrefix}-name`} required>
          Name
        </FormFieldLabel>
        <Input
          id={`${idPrefix}-name`}
          placeholder={namePlaceholder}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <FormFieldLabel htmlFor={`${idPrefix}-amount`} required>
          Amount (₦)
        </FormFieldLabel>
        <Input
          id={`${idPrefix}-amount`}
          type="number"
          step="0.01"
          min="0"
          className="h-10 tabular-nums"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <FormFieldLabel>Type</FormFieldLabel>
        <Select value={type} onValueChange={(v) => v && onTypeChange(v as FeeComponentType)} items={TYPE_OPTIONS}>
          <SelectTrigger className="w-full data-[size=default]:h-10" aria-label="Component type">
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
    </>
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
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-heading">Edit {component.name}</p>
          <ComponentFields
            idPrefix={`edit-${component.id}`}
            name={name}
            onNameChange={setName}
            amount={amount}
            onAmountChange={setAmount}
            type={type}
            onTypeChange={setType}
          />
          <Button type="button" className="h-10 w-full" disabled={isSaving} onClick={save}>
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Save'}
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
      <PopoverTrigger render={<Button type="button" variant="outline" />}>
        <Plus className="size-4" aria-hidden="true" />
        Add Component
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <p className="text-sm font-semibold text-heading">New component</p>
          <ComponentFields
            idPrefix="new-component"
            name={name}
            onNameChange={setName}
            amount={amount}
            onAmountChange={setAmount}
            type={type}
            onTypeChange={setType}
            namePlaceholder="e.g. Sports Levy"
          />
          <Button type="button" className="h-10 w-full" disabled={isSaving} onClick={save}>
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Add'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
