'use client';

import { UserPlus } from 'lucide-react';
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
import { createAppraisalSubmission } from '@/lib/actions/appraisal';
import type { StaffDto } from '@/lib/types/staff';

export function AssignSubmissionDialog({
  cycleId,
  staff,
}: {
  cycleId: string;
  staff: StaffDto[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function closeAndReset() {
    setOpen(false);
    setStaffId('');
    setReviewerId('');
  }

  async function handleAssign() {
    if (!staffId || !reviewerId) {
      toast.error('Choose both a staff member and a reviewer.');
      return;
    }
    if (staffId === reviewerId) {
      toast.error('The reviewer must be a different staff member.');
      return;
    }
    setIsSaving(true);
    try {
      await createAppraisalSubmission(cycleId, { staffId, reviewerId });
      toast.success('Reviewer assigned.');
      closeAndReset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't assign this reviewer.");
    } finally {
      setIsSaving(false);
    }
  }

  const options = staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }));

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger render={<Button variant="outline" />}>
        <UserPlus className="size-4" aria-hidden="true" />
        Assign Reviewer
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a Reviewer</DialogTitle>
          <DialogDescription>
            Only the assigned reviewer (or HR) can fill in this staff member&apos;s appraisal.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Staff Member Being Appraised</Label>
            <Select value={staffId} onValueChange={(v) => v && setStaffId(v)} items={options}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reviewer</Label>
            <Select value={reviewerId} onValueChange={(v) => v && setReviewerId(v)} items={options}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select reviewer" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void handleAssign()} disabled={isSaving}>
            {isSaving ? 'Assigning…' : 'Assign Reviewer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
