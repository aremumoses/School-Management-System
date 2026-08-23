'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Plus } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { createEnrollment, updateEnrollmentStatus } from '@/lib/actions/students';
import { ENROLLMENT_STATUS_BADGE, ENROLLMENT_STATUS_LABELS } from '@/lib/enrollment-status-labels';
import type { AcademicSessionDto, ClassDto } from '@/lib/types/academic';
import type { EnrollmentDto, EnrollmentStatus } from '@/lib/types/students';

const STATUS_OPTIONS: EnrollmentStatus[] = [
  'ACTIVE',
  'PROMOTED',
  'REPEATED',
  'TRANSFERRED',
  'WITHDRAWN',
  'GRADUATED',
];

const enrollmentSchema = z.object({
  classId: z.string().min(1, 'Choose a class'),
  armId: z.string().min(1, 'Choose an arm'),
  termId: z.string().min(1, 'Choose a term'),
});

function NewEnrollmentDialog({
  studentId,
  classes,
  sessions,
}: {
  studentId: string;
  classes: ClassDto[];
  sessions: AcademicSessionDto[];
}) {
  const [open, setOpen] = useState(false);
  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof enrollmentSchema>>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: { classId: '', armId: '', termId: '' },
  });

  const classId = watch('classId');
  const armId = watch('armId');
  const termId = watch('termId');
  const armsForClass = classes.find((c) => c.id === classId)?.arms ?? [];

  async function onSubmit(values: z.infer<typeof enrollmentSchema>) {
    try {
      await createEnrollment(studentId, { ...values, status: 'ACTIVE' });
      toast.success('Enrollment created.');
      setOpen(false);
      reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create enrollment.');
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
        New Enrollment
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Enrollment</DialogTitle>
          <DialogDescription>
            Enroll this student into a class+arm for a term. If they already have an active
            enrollment, update its status first.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>Class</Label>
            <Select
              value={classId}
              onValueChange={(v) => {
                if (v) {
                  setValue('classId', v);
                  setValue('armId', '');
                }
              }}
              items={classes.map((klass) => ({ value: klass.id, label: klass.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a class…" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((klass) => (
                  <SelectItem key={klass.id} value={klass.id}>
                    {klass.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.classId && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {errors.classId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Arm</Label>
            <Select
              value={armId}
              disabled={!classId}
              onValueChange={(v) => v && setValue('armId', v)}
              items={armsForClass.map((arm) => ({ value: arm.id, label: arm.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose an arm…" />
              </SelectTrigger>
              <SelectContent>
                {armsForClass.map((arm) => (
                  <SelectItem key={arm.id} value={arm.id}>
                    {arm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.armId && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {errors.armId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select
              value={termId}
              onValueChange={(v) => v && setValue('termId', v)}
              items={sessions.flatMap((session) =>
                session.terms.map((term) => ({
                  value: term.id,
                  label: `${session.name} — ${term.name} Term${term.isCurrent ? ' (current)' : ''}`,
                })),
              )}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a term…" />
              </SelectTrigger>
              <SelectContent>
                {sessions.map((session) =>
                  session.terms.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {session.name} — {term.name} Term{term.isCurrent ? ' (current)' : ''}
                    </SelectItem>
                  )),
                )}
              </SelectContent>
            </Select>
            {errors.termId && (
              <p className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="size-3.5" aria-hidden="true" />
                {errors.termId.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enrolling…' : 'Create Enrollment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StatusCell({
  studentId,
  enrollmentId,
  status,
}: {
  studentId: string;
  enrollmentId: string;
  status: EnrollmentStatus;
}) {
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  function handleChange(next: string | null) {
    if (!next || next === status) return;
    setPending(true);
    startTransition(async () => {
      try {
        await updateEnrollmentStatus(studentId, enrollmentId, { status: next as EnrollmentStatus });
        toast.success('Enrollment status updated.');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update status.');
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <Select value={status} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="w-36" disabled={pending}>
        <Badge variant={ENROLLMENT_STATUS_BADGE[status]}>{ENROLLMENT_STATUS_LABELS[status]}</Badge>
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {ENROLLMENT_STATUS_LABELS[option]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AcademicHistoryTab({
  studentId,
  enrollments,
  classes,
  sessions,
}: {
  studentId: string;
  enrollments: EnrollmentDto[];
  classes: ClassDto[];
  sessions: AcademicSessionDto[];
}) {

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewEnrollmentDialog studentId={studentId} classes={classes} sessions={sessions} />
      </div>

      {enrollments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No enrollment history yet.
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Arm</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell>{enrollment.term.session.name}</TableCell>
                  <TableCell>{enrollment.term.name} Term</TableCell>
                  <TableCell>{enrollment.class.name}</TableCell>
                  <TableCell>{enrollment.arm.name}</TableCell>
                  <TableCell>
                    <StatusCell
                      studentId={studentId}
                      enrollmentId={enrollment.id}
                      status={enrollment.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
