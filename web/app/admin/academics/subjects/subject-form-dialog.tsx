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

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(100),
  code: z.string().max(20).optional(),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;

export function SubjectFormDialog({
  trigger,
  title,
  description,
  defaultValues,
  onSubmit,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  defaultValues?: SubjectFormValues;
  onSubmit: (values: SubjectFormValues) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: defaultValues ?? { name: '', code: '' },
  });

  async function handleFormSubmit(values: SubjectFormValues) {
    try {
      await onSubmit({ ...values, code: values.code || undefined });
      setOpen(false);
      reset(values);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save subject.');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset(defaultValues ?? { name: '', code: '' });
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
            <Label htmlFor="subject-name">Subject Name</Label>
            <Input
              id="subject-name"
              placeholder="Mathematics"
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
            <Label htmlFor="subject-code">Code (optional)</Label>
            <Input id="subject-code" placeholder="MTH" {...register('code')} />
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
