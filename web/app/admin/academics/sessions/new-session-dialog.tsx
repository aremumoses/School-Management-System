'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Plus } from 'lucide-react';
import { useState } from 'react';
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
import { createSession } from '@/lib/actions/sessions';

const TERM_NAMES = ['First', 'Second', 'Third'] as const;

const newSessionSchema = z
  .object({
    name: z.string().min(1, 'Session name is required').max(50),
    terms: z
      .array(
        z
          .object({
            name: z.enum(TERM_NAMES),
            startDate: z.string().min(1, 'Required'),
            endDate: z.string().min(1, 'Required'),
          })
          .refine((t) => t.startDate < t.endDate, {
            message: 'Start date must be before end date',
            path: ['endDate'],
          }),
      )
      .length(3),
  })
  .refine(
    (data) =>
      data.terms[0].endDate < data.terms[1].startDate &&
      data.terms[1].endDate < data.terms[2].startDate,
    { message: 'Terms must run in chronological order with no overlap', path: ['terms'] },
  );

type NewSessionValues = z.infer<typeof newSessionSchema>;

export function NewSessionDialog() {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewSessionValues>({
    resolver: zodResolver(newSessionSchema),
    defaultValues: {
      name: '',
      terms: TERM_NAMES.map((name) => ({ name, startDate: '', endDate: '' })),
    },
  });

  async function onSubmit(values: NewSessionValues) {
    try {
      await createSession(values);
      toast.success(`Academic session "${values.name}" created.`);
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create session.');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        New Session
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Academic Session</DialogTitle>
          <DialogDescription>
            Scaffold all 3 terms for the session in one step. You can mark one as current
            afterward.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              placeholder="2026/2027"
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

          <div className="space-y-3">
            {TERM_NAMES.map((name, index) => (
              <div key={name} className="space-y-1.5">
                <Label className="text-sm font-medium">{name} Term</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    aria-label={`${name} term start date`}
                    aria-invalid={Boolean(errors.terms?.[index]?.startDate)}
                    {...register(`terms.${index}.startDate`)}
                  />
                  <Input
                    type="date"
                    aria-label={`${name} term end date`}
                    aria-invalid={Boolean(errors.terms?.[index]?.endDate)}
                    {...register(`terms.${index}.endDate`)}
                  />
                </div>
                {(errors.terms?.[index]?.startDate || errors.terms?.[index]?.endDate) && (
                  <p className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="size-3.5" aria-hidden="true" />
                    {errors.terms[index]?.startDate?.message ??
                      errors.terms[index]?.endDate?.message}
                  </p>
                )}
              </div>
            ))}
            {errors.terms?.root?.message && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {errors.terms.root.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating…' : 'Create Session'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
