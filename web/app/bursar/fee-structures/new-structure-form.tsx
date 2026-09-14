'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Plus, Trash2, Wallet } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createFeeStructure } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';
import { cn } from '@/lib/utils';

const TYPE_OPTIONS = [
  { value: 'RECURRING', label: 'Recurring' },
  { value: 'ONE_OFF', label: 'One-off' },
  { value: 'CONDITIONAL', label: 'Conditional' },
] as const;

const componentSchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  amount: z.number({ message: 'Required' }).min(0.01, 'Must be greater than 0'),
  type: z.enum(['RECURRING', 'ONE_OFF', 'CONDITIONAL']),
});

const formSchema = z.object({
  components: z
    .array(componentSchema)
    .min(1, 'Add at least one component')
    .refine(
      (components) => {
        const names = components.map((c) => c.name.trim().toLowerCase()).filter(Boolean);
        return names.length === new Set(names).size;
      },
      { message: 'Component names must be unique' },
    ),
});

type FormValues = z.infer<typeof formSchema>;

export function NewStructureForm({ classId, termId }: { classId: string; termId: string }) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      components: [{ name: 'Tuition', amount: undefined, type: 'RECURRING' }],
    },
  });
  const fields = useFieldArray({ control, name: 'components' });
  const rows = watch('components');
  const total = rows.reduce((sum, row) => sum + (Number.isFinite(row.amount) ? row.amount : 0), 0);

  async function onSubmit(values: FormValues) {
    try {
      await createFeeStructure({ classId, termId, components: values.components });
      toast.success('Fee structure created.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create fee structure.');
    }
  }

  return (
    <section className="overflow-hidden rounded-xl bg-card dark:ring-1 dark:ring-foreground/10">
      <div className="flex items-center gap-4 border-b border-border px-5 py-4 sm:px-6 sm:py-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Wallet className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-heading">Build the Fee Structure</h2>
          <p className="text-sm text-muted-foreground">
            No fee structure exists for this class and term yet — add its components below.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-5 py-5 sm:px-6" noValidate>
        <div className="space-y-3">
          {fields.fields.map((field, index) => (
            // Phone: each component is its own bordered block. Wider: plain
            // rows, with the labels shown on the first row only.
            <div
              key={field.id}
              className="grid grid-cols-2 gap-3 rounded-xl border border-border p-3 sm:grid-cols-[minmax(0,1fr)_10rem_11rem_2.5rem] sm:items-start sm:rounded-none sm:border-0 sm:p-0"
            >
              <div className="col-span-2 space-y-2 sm:col-span-1">
                <div className={cn(index > 0 && 'sm:sr-only')}>
                  <FormFieldLabel htmlFor={`components.${index}.name`} required>
                    Component
                  </FormFieldLabel>
                </div>
                <Input
                  id={`components.${index}.name`}
                  placeholder="e.g. Tuition"
                  className="h-10"
                  {...register(`components.${index}.name`)}
                />
                {errors.components?.[index]?.name && (
                  <p className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    {errors.components[index]?.name?.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className={cn(index > 0 && 'sm:sr-only')}>
                  <FormFieldLabel htmlFor={`components.${index}.amount`} required>
                    Amount (₦)
                  </FormFieldLabel>
                </div>
                <Input
                  id={`components.${index}.amount`}
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10 tabular-nums"
                  {...register(`components.${index}.amount`, { valueAsNumber: true })}
                />
                {errors.components?.[index]?.amount && (
                  <p className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    {errors.components[index]?.amount?.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className={cn(index > 0 && 'sm:sr-only')}>
                  <FormFieldLabel>Type</FormFieldLabel>
                </div>
                <Select
                  value={rows[index]?.type}
                  onValueChange={(value) =>
                    value &&
                    setValue(`components.${index}.type`, value as FormValues['components'][number]['type'])
                  }
                  items={TYPE_OPTIONS}
                >
                  <SelectTrigger className="w-full data-[size=default]:h-10" aria-label={`Component ${index + 1} type`}>
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'col-span-2 justify-self-end sm:col-span-1 sm:justify-self-auto',
                  index === 0 && 'sm:mt-7',
                )}
                aria-label="Remove component"
                disabled={fields.fields.length === 1}
                onClick={() => fields.remove(index)}
              >
                <Trash2 className="size-4 text-destructive" aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
        {errors.components?.root && (
          <p className="flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            {errors.components.root.message}
          </p>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => fields.append({ name: '', amount: undefined as unknown as number, type: 'RECURRING' })}
        >
          <Plus className="size-4" aria-hidden="true" />
          Add Component
        </Button>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-primary/5 px-4 py-3">
          <span className="font-semibold text-heading">Running total</span>
          <span className="text-xl font-bold text-heading tabular-nums">{formatNaira(total)}</span>
        </div>

        <div className="flex justify-end border-t border-border pt-5">
          <Button type="submit" className="h-10 px-5" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Fee Structure'}
          </Button>
        </div>
      </form>
    </section>
  );
}
