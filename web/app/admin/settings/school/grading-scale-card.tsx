'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { updateGradingScale } from '@/lib/actions/school';
import type { SchoolDto } from '@/lib/types/academic';
import { cn } from '@/lib/utils';

const gradingScaleEntrySchema = z
  .object({
    min: z.number().int().min(0).max(100),
    max: z.number().int().min(0).max(100),
    grade: z.string().min(1, 'Required').max(10),
    remark: z.string().min(1, 'Required').max(50),
  })
  .refine((data) => data.min <= data.max, {
    message: 'Min must be ≤ max',
    path: ['min'],
  });

const caWeightingEntrySchema = z.object({
  name: z.string().min(1, 'Required').max(50),
  weight: z.number().min(0).max(100),
});

const gradingScaleFormSchema = z.object({
  gradingScale: z.array(gradingScaleEntrySchema).min(1, 'Add at least one grade range'),
  caWeighting: z.array(caWeightingEntrySchema).min(1, 'Add at least one assessment component'),
});

type GradingScaleFormValues = z.infer<typeof gradingScaleFormSchema>;

export function GradingScaleCard({ school }: { school: SchoolDto }) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GradingScaleFormValues>({
    resolver: zodResolver(gradingScaleFormSchema),
    defaultValues: {
      gradingScale: school.gradingScale ?? [],
      caWeighting: school.caWeighting ?? [{ name: 'CA1', weight: 10 }, { name: 'Exam', weight: 90 }],
    },
  });

  const gradeRows = useFieldArray({ control, name: 'gradingScale' });
  const weightRows = useFieldArray({ control, name: 'caWeighting' });

  const caWeighting = watch('caWeighting');
  const total = caWeighting.reduce((sum, entry) => sum + (Number(entry.weight) || 0), 0);
  const totalIsValid = Math.abs(total - 100) < 0.01;

  async function onSubmit(values: GradingScaleFormValues) {
    if (!totalIsValid) {
      toast.error(`CA/exam weighting must sum to 100% — currently ${total}%.`);
      return;
    }
    try {
      await updateGradingScale(values);
      toast.success('Grading scale saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save grading scale.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grading Scale</CardTitle>
        <CardDescription>
          Score ranges map to a grade and remark on report cards, and CA/exam weighting sets
          how a student&apos;s final score is computed each term.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Score Ranges</h3>
            {gradeRows.fields.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No grade ranges yet — add your school&apos;s first one below.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Min</TableHead>
                    <TableHead className="w-24">Max</TableHead>
                    <TableHead className="w-28">Grade</TableHead>
                    <TableHead>Remark</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gradeRows.fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Input
                          type="number"
                          className="tabular-nums"
                          {...register(`gradingScale.${index}.min`, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="tabular-nums"
                          {...register(`gradingScale.${index}.max`, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input {...register(`gradingScale.${index}.grade`)} />
                      </TableCell>
                      <TableCell>
                        <Input {...register(`gradingScale.${index}.remark`)} />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove grade range"
                          onClick={() => gradeRows.remove(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {errors.gradingScale?.root?.message && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {errors.gradingScale.root.message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => gradeRows.append({ min: 0, max: 0, grade: '', remark: '' })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add Grade Range
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">CA / Exam Weighting</h3>
            {weightRows.fields.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                No assessment components yet — add your school&apos;s first one below.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead className="w-32">Weight (%)</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weightRows.fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Input {...register(`caWeighting.${index}.name`)} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="tabular-nums"
                          {...register(`caWeighting.${index}.weight`, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Remove assessment component"
                          onClick={() => weightRows.remove(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => weightRows.append({ name: '', weight: 0 })}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add Component
              </Button>
              <p
                className={cn(
                  'font-mono text-sm font-semibold tabular-nums',
                  totalIsValid ? 'text-success' : 'text-destructive',
                )}
              >
                Total: {total}%
              </p>
            </div>
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save Grading Scale'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
