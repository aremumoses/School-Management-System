'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { updateStaff } from '@/lib/actions/staff';
import type { StaffDto } from '@/lib/types/staff';

const bioDataSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().max(20).optional(),
  employmentDate: z.string().optional(),
});

type BioDataValues = z.infer<typeof bioDataSchema>;

export function BioDataCard({ staff, isSelf }: { staff: StaffDto; isSelf: boolean }) {
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const [isActive, setIsActive] = useState(staff.isActive);
  const [isTogglePending, setIsTogglePending] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<BioDataValues>({
    resolver: zodResolver(bioDataSchema),
    defaultValues: {
      firstName: staff.firstName,
      lastName: staff.lastName,
      email: staff.email,
      phone: staff.phone ?? '',
      employmentDate: staff.employmentDate ? staff.employmentDate.slice(0, 10) : '',
    },
  });

  async function onSubmit(values: BioDataValues) {
    try {
      await updateStaff(staff.id, {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.employmentDate ? { employmentDate: values.employmentDate } : {}),
      });
      toast.success('Staff details saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save staff details.');
    }
  }

  async function setActive(next: boolean) {
    setIsTogglePending(true);
    try {
      await updateStaff(staff.id, { isActive: next });
      setIsActive(next);
      toast.success(next ? 'Staff member reactivated.' : 'Staff member deactivated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status.');
    } finally {
      setIsTogglePending(false);
      setConfirmingDeactivate(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Bio-data</CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor="active-toggle" className="text-sm text-muted-foreground">
            {isActive ? 'Active' : 'Inactive'}
          </Label>
          {isSelf ? (
            <Tooltip>
              <TooltipTrigger render={<span className="inline-block" />}>
                <Switch id="active-toggle" checked={isActive} disabled />
              </TooltipTrigger>
              <TooltipContent>
                You can&apos;t deactivate your own account — ask another admin to do this.
              </TooltipContent>
            </Tooltip>
          ) : (
            <Switch
              id="active-toggle"
              checked={isActive}
              disabled={isTogglePending}
              onCheckedChange={(checked) => {
                if (checked) {
                  void setActive(true);
                } else {
                  setConfirmingDeactivate(true);
                }
              }}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                aria-invalid={Boolean(errors.firstName)}
                {...register('firstName')}
              />
              {errors.firstName && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                aria-invalid={Boolean(errors.lastName)}
                {...register('lastName')}
              />
              {errors.lastName && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.lastName.message}
                </p>
              )}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employmentDate">Employment Date</Label>
              <Input id="employmentDate" type="date" {...register('employmentDate')} />
            </div>
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? 'Saving…' : 'Save Changes'}
          </Button>
        </form>
      </CardContent>

      <AlertDialog open={confirmingDeactivate} onOpenChange={setConfirmingDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {staff.firstName} {staff.lastName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This immediately signs them out of every device by revoking their active sessions.
              They can be reactivated at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isTogglePending}
              onClick={() => setActive(false)}
            >
              {isTogglePending ? 'Deactivating…' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
