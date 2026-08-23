'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, Clock3, Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { ConfirmDeleteButton } from '@/components/dashboard/confirm-delete-button';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  addTeachingAssignment,
  removeTeachingAssignment,
  updateScoreEntryDeadline,
} from '@/lib/actions/staff';
import type { TeacherAssignmentDto } from '@/lib/types/staff';

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** `datetime-local` inputs want naive local time with no timezone/seconds. */
function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface ClassSubjectOption {
  id: string;
  label: string;
}

export interface TermOption {
  id: string;
  label: string;
  isCurrent: boolean;
}

const assignmentSchema = z.object({
  classSubjectId: z.string().min(1, 'Choose a class + subject'),
  termId: z.string().min(1, 'Choose a term'),
});

type AssignmentValues = z.infer<typeof assignmentSchema>;

export function TeachingAssignmentsSection({
  staffId,
  assignments,
  classSubjectOptions,
  termOptions,
}: {
  staffId: string;
  assignments: TeacherAssignmentDto[];
  classSubjectOptions: ClassSubjectOption[];
  termOptions: TermOption[];
}) {
  const [open, setOpen] = useState(false);
  const {
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AssignmentValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      classSubjectId: '',
      termId: termOptions.find((t) => t.isCurrent)?.id ?? '',
    },
  });

  const classSubjectId = watch('classSubjectId');
  const termId = watch('termId');

  async function onSubmit(values: AssignmentValues) {
    try {
      await addTeachingAssignment(staffId, values);
      toast.success('Teaching assignment added.');
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add teaching assignment.');
    }
  }

  return (
    <div className="space-y-3">
      {assignments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          No teaching assignments yet.
        </p>
      ) : (
        <div className="space-y-2">
          {assignments.map((assignment) => (
            <div
              key={assignment.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {assignment.classSubject?.class.name} — {assignment.classSubject?.subject.name}
                </span>
                <Badge variant="outline">{assignment.term?.name} Term</Badge>
                {assignment.term?.isCurrent && <Badge variant="success">Current</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <DeadlineEditor staffId={staffId} assignment={assignment} />
                <ConfirmDeleteButton
                  itemLabel="this teaching assignment"
                  onConfirm={() => removeTeachingAssignment(staffId, assignment.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {classSubjectOptions.length === 0 || termOptions.length === 0 ? (
        <Tooltip>
          <TooltipTrigger render={<span className="inline-block" />}>
            <Button variant="outline" size="sm" disabled>
              <Plus className="size-4" aria-hidden="true" />
              Add Teaching Assignment
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {classSubjectOptions.length === 0
              ? 'Map at least one subject to a class first.'
              : 'Create an academic session with terms first.'}
          </TooltipContent>
        </Tooltip>
      ) : (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) reset();
          }}
        >
          <DialogTrigger render={<Button variant="outline" size="sm" />}>
            <Plus className="size-4" aria-hidden="true" />
            Add Teaching Assignment
          </DialogTrigger>
          <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Teaching Assignment</DialogTitle>
            <DialogDescription>
              Assign this staff member to teach a class + subject for a specific term.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label>Class + Subject</Label>
              <Select
                value={classSubjectId}
                onValueChange={(value) =>
                  value && setValue('classSubjectId', value, { shouldDirty: true })
                }
                items={classSubjectOptions.map((option) => ({ value: option.id, label: option.label }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a class + subject…" />
                </SelectTrigger>
                <SelectContent>
                  {classSubjectOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.classSubjectId && (
                <p className="flex items-center gap-1 text-sm text-destructive">
                  <AlertCircle className="size-3.5" aria-hidden="true" />
                  {errors.classSubjectId.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Term</Label>
              <Select
                value={termId}
                onValueChange={(value) => value && setValue('termId', value, { shouldDirty: true })}
                items={termOptions.map((option) => ({
                  value: option.id,
                  label: `${option.label}${option.isCurrent ? ' (current)' : ''}`,
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a term…" />
                </SelectTrigger>
                <SelectContent>
                  {termOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                      {option.isCurrent ? ' (current)' : ''}
                    </SelectItem>
                  ))}
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
                {isSubmitting ? 'Adding…' : 'Add Assignment'}
              </Button>
            </DialogFooter>
          </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DeadlineEditor({
  staffId,
  assignment,
}: {
  staffId: string;
  assignment: TeacherAssignmentDto;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(
    assignment.scoreEntryDeadline ? toDatetimeLocalValue(assignment.scoreEntryDeadline) : '',
  );
  const [isSaving, setIsSaving] = useState(false);

  async function save(next: string | null) {
    setIsSaving(true);
    try {
      await updateScoreEntryDeadline(staffId, assignment.id, next);
      toast.success(next ? 'Deadline set.' : 'Deadline cleared.');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update the deadline.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant={assignment.scoreEntryDeadline ? 'outline' : 'ghost'}
            size="sm"
          />
        }
      >
        <Clock3 className="size-3.5" aria-hidden="true" />
        {assignment.scoreEntryDeadline
          ? formatDeadline(assignment.scoreEntryDeadline)
          : 'Set deadline'}
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-2">
          <Label htmlFor={`deadline-${assignment.id}`}>Score-entry deadline</Label>
          <Input
            id={`deadline-${assignment.id}`}
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Teachers see this as a countdown and can&apos;t submit scores after it passes.
          </p>
        </div>
        <div className="flex items-center justify-between gap-2">
          {assignment.scoreEntryDeadline ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isSaving}
              onClick={() => save(null)}
            >
              Clear
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            size="sm"
            disabled={isSaving || !value}
            onClick={() => save(new Date(value).toISOString())}
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
