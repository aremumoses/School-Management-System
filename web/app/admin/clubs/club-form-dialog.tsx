'use client';

import { Loader2, Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { FormFieldLabel } from '@/components/dashboard/form-field-label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createClub, updateClub } from '@/lib/actions/clubs';
import type { ClubDto } from '@/lib/types/clubs';

export function ClubFormDialog({
  staffOptions,
  club,
}: {
  staffOptions: { id: string; name: string }[];
  /** Present when editing. */
  club?: ClubDto;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(club?.name ?? '');
  const [description, setDescription] = useState(club?.description ?? '');
  const [schedule, setSchedule] = useState(club?.meetingSchedule ?? '');
  const [patronId, setPatronId] = useState(club?.patronStaffId ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return toast.error('A club name is required.');
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        meetingSchedule: schedule.trim() || undefined,
        patronStaffId: patronId || undefined,
      };
      if (club) {
        await updateClub(club.id, payload);
        toast.success('Club updated.');
      } else {
        await createClub(payload);
        toast.success('Club created.');
      }
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the club.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={club ? <Button variant="outline" /> : <Button />}>
        {club ? (
          <>
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </>
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            New Club
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-heading">
            {club ? 'Edit club' : 'New club'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <FormFieldLabel htmlFor="club-name" required>
              Name
            </FormFieldLabel>
            <Input
              id="club-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Debate Club"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <FormFieldLabel htmlFor="club-desc">Description (optional)</FormFieldLabel>
            <Textarea
              id="club-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
            />
          </div>
          <div className="space-y-2">
            <FormFieldLabel htmlFor="club-sched">Meeting schedule (optional)</FormFieldLabel>
            <Input
              id="club-sched"
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="e.g. Wednesdays, 4–5pm, Hall B"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <FormFieldLabel>Patron (supervising teacher)</FormFieldLabel>
            <Select
              value={patronId}
              onValueChange={(v) => setPatronId(v ?? '')}
              items={staffOptions.map((s) => ({ value: s.id, label: s.name }))}
            >
              <SelectTrigger className="w-full data-[size=default]:h-10" aria-label="Patron">
                <SelectValue placeholder="Choose a teacher…" />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : club ? (
              'Save Changes'
            ) : (
              'Create Club'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
