'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { addClubMember, removeClubMember } from '@/lib/actions/clubs';
import type { ClubDetailDto } from '@/lib/types/clubs';

export function RosterManager({
  clubId,
  memberships,
  studentOptions,
}: {
  clubId: string;
  memberships: ClubDetailDto['memberships'];
  studentOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!studentId) return toast.error('Choose a student.');
    setIsAdding(true);
    try {
      await addClubMember(clubId, studentId);
      toast.success('Member added.');
      setStudentId('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add the member.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemove(memberStudentId: string) {
    setRemovingId(memberStudentId);
    try {
      await removeClubMember(clubId, memberStudentId);
      toast.success('Member removed.');
      router.refresh();
    } catch {
      toast.error("Couldn't remove the member.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-end sm:px-6">
        <div className="space-y-2 sm:w-80">
          <FormFieldLabel>Add student</FormFieldLabel>
          <Select
            value={studentId}
            onValueChange={(v) => {
              if (v) setStudentId(v);
            }}
            items={studentOptions.map((s) => ({ value: s.id, label: s.label }))}
          >
            <SelectTrigger className="w-full data-[size=default]:h-10" aria-label="Choose student to add">
              <SelectValue placeholder="Choose a student…" />
            </SelectTrigger>
            <SelectContent>
              {studentOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="h-10 px-4" onClick={() => void handleAdd()} disabled={isAdding || !studentId}>
          {isAdding ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Add
        </Button>
      </div>

      {memberships.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted-foreground sm:px-6">No members yet.</p>
      ) : (
        <ul className="divide-y divide-border">
          {memberships.map((membership) => {
            const { student } = membership;
            return (
              <li
                key={membership.id}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-primary/5 sm:px-6"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary dark:text-heading"
                >
                  {`${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-heading">
                    {student.firstName} {student.lastName}
                  </p>
                  <p className="font-mono text-xs text-primary dark:text-muted-foreground">
                    {student.admissionNumber}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void handleRemove(student.id)}
                  disabled={removingId === student.id}
                  aria-label={`Remove ${student.firstName}`}
                >
                  {removingId === student.id ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="size-4 text-destructive" aria-hidden="true" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
