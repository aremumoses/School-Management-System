'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createFeeStructure } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';

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
    <Card>
      <CardContent className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Build the fee structure</h2>
          <p className="text-sm text-muted-foreground">
            No fee structure exists for this class and term yet — add its components below.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-3">
            {fields.fields.map((field, index) => (
              <div key={field.id} className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
                <div className="min-w-0 flex-1 space-y-1">
                  {index === 0 && <Label htmlFor={`components.${index}.name`}>Component</Label>}
                  <Input
                    id={`components.${index}.name`}
                    placeholder="e.g. Tuition"
                    {...register(`components.${index}.name`)}
                  />
                  {errors.components?.[index]?.name && (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      {errors.components[index]?.name?.message}
                    </p>
                  )}
                </div>
                <div className="w-36 space-y-1">
                  {index === 0 && <Label htmlFor={`components.${index}.amount`}>Amount (₦)</Label>}
                  <Input
                    id={`components.${index}.amount`}
                    type="number"
                    step="0.01"
                    min="0"
                    className="tabular-nums"
                    {...register(`components.${index}.amount`, { valueAsNumber: true })}
                  />
                  {errors.components?.[index]?.amount && (
                    <p className="flex items-center gap-1 text-sm text-destructive">
                      <AlertCircle className="size-3.5" aria-hidden="true" />
                      {errors.components[index]?.amount?.message}
                    </p>
                  )}
                </div>
                <div className="w-40 space-y-1">
                  {index === 0 && <Label>Type</Label>}
                  <Select
                    value={rows[index]?.type}
                    onValueChange={(value) =>
                      value &&
                      setValue(`components.${index}.type`, value as FormValues['components'][number]['type'])
                    }
                    items={TYPE_OPTIONS}
                  >
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
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={index === 0 ? 'mt-6' : ''}
                  aria-label="Remove component"
                  disabled={fields.fields.length === 1}
                  onClick={() => fields.remove(index)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
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
            size="sm"
            onClick={() => fields.append({ name: '', amount: undefined as unknown as number, type: 'RECURRING' })}
          >
            <Plus className="size-4" aria-hidden="true" />
            Add Component
          </Button>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3">
            <span className="text-sm font-medium text-foreground">Running total</span>
            <span className="text-lg font-bold tabular-nums text-foreground">{formatNaira(total)}</span>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create Fee Structure'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
