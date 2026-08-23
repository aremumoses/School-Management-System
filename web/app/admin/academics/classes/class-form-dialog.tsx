'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { type ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const classSchema = z.object({
  name: z.string().min(1, 'Class name is required').max(50),
  level: z.number().int().min(1, 'Level must be at least 1').max(20),
});

type ClassFormValues = z.infer<typeof classSchema>;

export function ClassFormDialog({
  trigger,
  title,
  description,
  defaultValues,
  onSubmit,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  defaultValues?: ClassFormValues;
  onSubmit: (values: ClassFormValues) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClassFormValues>({
    resolver: zodResolver(classSchema),
    defaultValues: defaultValues ?? { name: '', level: 1 },
  });

  async function handleFormSubmit(values: ClassFormValues) {
    try {
      await onSubmit(values);
      setOpen(false);
      reset(values);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save class.');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset(defaultValues ?? { name: '', level: 1 });
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="class-name">Class Name</Label>
            <Input
              id="class-name"
              placeholder="JSS1"
              aria-invalid={Boolean(errors.name)}
              {...register('name')}
            />
            {errors.name && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="class-level">Level</Label>
            <Input
              id="class-level"
              type="number"
              aria-invalid={Boolean(errors.level)}
              {...register('level', { valueAsNumber: true })}
            />
            <p className="text-sm text-muted-foreground">
              Determines ordering, e.g. JSS1=1 … SSS3=6.
            </p>
            {errors.level && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {errors.level.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
