'use client';

import { Loader2, UserX } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { createDisciplinaryRecord } from '@/lib/actions/hr';
import type { StaffDto } from '@/lib/types/staff';

export function LogDisciplinaryForm({ staff }: { staff: StaffDto[] }) {
  const router = useRouter();
  const [staffId, setStaffId] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    if (!staffId || !description.trim() || !actionTaken.trim()) {
      toast.error('Staff member, description, and action taken are all required.');
      return;
    }
    setIsSaving(true);
    try {
      await createDisciplinaryRecord({
        staffId,
        description: description.trim(),
        actionTaken: actionTaken.trim(),
      });
      toast.success('Disciplinary record logged.');
      setStaffId('');
      setDescription('');
      setActionTaken('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log this record.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Staff Member</Label>
        <Select
          value={staffId}
          onValueChange={(v) => v && setStaffId(v)}
          items={staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a staff member" />
          </SelectTrigger>
          <SelectContent>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="disc-description">Description</Label>
        <Textarea
          id="disc-description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened…"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="disc-action">Action Taken</Label>
        <Textarea
          id="disc-action"
          rows={2}
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          placeholder="Verbal warning, written warning, referred to Admin…"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={() => void handleSubmit()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <UserX className="size-3.5" aria-hidden="true" />
          )}
          Log Record
        </Button>
      </div>
    </div>
  );
}
