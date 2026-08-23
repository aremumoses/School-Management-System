'use client';

import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 space-y-1.5">
          <Label>Add student</Label>
          <Select
            value={studentId}
            onValueChange={(v) => {
              if (v) setStudentId(v);
            }}
            items={studentOptions.map((s) => ({ value: s.id, label: s.label }))}
          >
            <SelectTrigger className="w-full" aria-label="Choose student to add">
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
        <Button size="sm" onClick={() => void handleAdd()} disabled={isAdding || !studentId}>
          {isAdding ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-3.5" aria-hidden="true" />
          )}
          Add
        </Button>
      </div>

      {memberships.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No members yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {memberships.map((membership) => (
            <li key={membership.id} className="flex items-center justify-between px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {membership.student.firstName} {membership.student.lastName}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {membership.student.admissionNumber}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => void handleRemove(membership.student.id)}
                disabled={removingId === membership.student.id}
                aria-label={`Remove ${membership.student.firstName}`}
              >
                {removingId === membership.student.id ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-3.5" aria-hidden="true" />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
