'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Check, Copy, Plus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { createStaff } from '@/lib/actions/staff';
import { ROLE_LABELS } from '@/lib/role-labels';
import type { StaffRoleName } from '@/lib/types/staff';

const STAFF_ROLES: StaffRoleName[] = [
  'ADMIN',
  'VICE_PRINCIPAL',
  'HOD',
  'CLASS_TEACHER',
  'SUBJECT_TEACHER',
  'EXAM_OFFICER',
  'BURSAR',
  'LIBRARIAN',
  'HOSTEL_WARDEN',
  'TRANSPORT_OFFICER',
  'HR_OFFICER',
  'FRONT_DESK',
];

const newStaffSchema = z.object({
  firstName: z.string().min(1, 'Required').max(100),
  lastName: z.string().min(1, 'Required').max(100),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().max(20).optional(),
  employmentDate: z.string().optional(),
  roles: z.array(z.enum(STAFF_ROLES)),
});

type NewStaffValues = z.infer<typeof newStaffSchema>;

export function NewStaffDialog() {
  const [open, setOpen] = useState(false);
  const [createdName, setCreatedName] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewStaffValues>({
    resolver: zodResolver(newStaffSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', employmentDate: '', roles: [] },
  });

  const selectedRoles = watch('roles');

  function toggleRole(role: StaffRoleName, checked: boolean) {
    setValue(
      'roles',
      checked ? [...selectedRoles, role] : selectedRoles.filter((r) => r !== role),
      { shouldDirty: true },
    );
  }

  async function onSubmit(values: NewStaffValues) {
    try {
      const staff = await createStaff({
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        ...(values.phone ? { phone: values.phone } : {}),
        ...(values.employmentDate ? { employmentDate: values.employmentDate } : {}),
        roles: values.roles,
      });
      setCreatedName(`${staff.firstName} ${staff.lastName}`);
      setTemporaryPassword(staff.temporaryPassword ?? null);
      if (!staff.temporaryPassword) {
        toast.success('Staff member created.');
        closeAndReset();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create staff member.');
    }
  }

  function closeAndReset() {
    setOpen(false);
    setCreatedName(null);
    setTemporaryPassword(null);
    setCopied(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) closeAndReset();
        else setOpen(next);
      }}
    >
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        Add Staff
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        {temporaryPassword ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-heading">
                <UserPlus className="size-4" aria-hidden="true" />
                {createdName} was created
              </DialogTitle>
              <DialogDescription>
                Share this temporary password with them now — it won&apos;t be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <code className="flex-1 font-mono text-sm text-foreground">{temporaryPassword}</code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void navigator.clipboard.writeText(temporaryPassword);
                  setCopied(true);
                  toast.success('Copied to clipboard.');
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={closeAndReset}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-heading">Add Staff Member</DialogTitle>
              <DialogDescription>
                A temporary password is generated automatically — you&apos;ll see it once, right
                after creating.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <FormFieldLabel htmlFor="firstName" required>
                    First Name
                  </FormFieldLabel>
                  <Input
                    id="firstName"
                    className="h-10"
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
                  <FormFieldLabel htmlFor="lastName" required>
                    Last Name
                  </FormFieldLabel>
                  <Input
                    id="lastName"
                    className="h-10"
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
                  <FormFieldLabel htmlFor="email" required>
                    Email
                  </FormFieldLabel>
                  <Input
                    id="email"
                    type="email"
                    className="h-10"
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
                  <FormFieldLabel htmlFor="phone">Phone (optional)</FormFieldLabel>
                  <Input id="phone" className="h-10" placeholder="+2348012345678" {...register('phone')} />
                </div>
                <div className="space-y-2">
                  <FormFieldLabel htmlFor="employmentDate">Employment Date</FormFieldLabel>
                  <Input id="employmentDate" type="date" className="h-10" {...register('employmentDate')} />
                </div>
              </div>

              <div className="space-y-2">
                <FormFieldLabel>Roles</FormFieldLabel>
                <div className="grid max-h-48 grid-cols-2 gap-2.5 overflow-y-auto rounded-xl border border-border bg-muted/30 p-4">
                  {STAFF_ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm text-heading">
                      <Checkbox
                        checked={selectedRoles.includes(role)}
                        onCheckedChange={(checked) => toggleRole(role, checked === true)}
                      />
                      {ROLE_LABELS[role]}
                    </label>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create Staff Member'}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
