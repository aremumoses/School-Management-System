'use client';

import { UserMinus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
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
import { initiateOffboarding } from '@/lib/actions/hr';
import type { StaffDto } from '@/lib/types/staff';

export function InitiateOffboardingDialog({ staff }: { staff: StaffDto[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleInitiate() {
    if (!staffId) {
      toast.error('Choose a staff member.');
      return;
    }
    setIsSaving(true);
    try {
      await initiateOffboarding({ staffId });
      toast.success('Offboarding initiated.');
      setOpen(false);
      setStaffId('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't initiate offboarding.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <UserMinus className="size-4" aria-hidden="true" />
        Initiate Offboarding
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Initiate Offboarding</DialogTitle>
          <DialogDescription>
            Starts the exit checklist for a departing staff member. Their login stays active
            until every item is completed.
          </DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button onClick={() => void handleInitiate()} disabled={isSaving}>
            {isSaving ? 'Starting…' : 'Initiate Offboarding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
