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

const armSchema = z.object({
  name: z.string().min(1, 'Arm name is required').max(50),
});

type ArmFormValues = z.infer<typeof armSchema>;

export function ArmFormDialog({
  trigger,
  title,
  description,
  defaultValues,
  onSubmit,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  defaultValues?: ArmFormValues;
  onSubmit: (values: ArmFormValues) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ArmFormValues>({
    resolver: zodResolver(armSchema),
    defaultValues: defaultValues ?? { name: '' },
  });

  async function handleFormSubmit(values: ArmFormValues) {
    try {
      await onSubmit(values);
      setOpen(false);
      reset(values);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save arm.');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset(defaultValues ?? { name: '' });
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
            <Label htmlFor="arm-name">Arm Name</Label>
            <Input
              id="arm-name"
              placeholder="Gold"
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
