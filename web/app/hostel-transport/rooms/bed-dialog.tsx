'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { StudentSearchBox } from '@/components/hostel-transport/student-search-box';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { allocateBed, vacateBed } from '@/lib/actions/hostel-transport';
import type { StudentSearchRow } from '@/lib/actions/hostel-transport';
import type { BedAllocationDto } from '@/lib/types/hostel-transport';

export function BedDialog({
  roomId,
  bedNumber,
  allocation,
  onClose,
}: {
  roomId: string;
  bedNumber: number;
  allocation: BedAllocationDto | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [student, setStudent] = useState<StudentSearchRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleAllocate() {
    if (!student) return toast.error('Choose a student first.');
    setIsSaving(true);
    try {
      await allocateBed(roomId, { studentId: student.id, bedNumber });
      toast.success(`${student.firstName} ${student.lastName} assigned to bed ${bedNumber}.`);
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't allocate this bed.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleVacate() {
    if (!allocation) return;
    setIsSaving(true);
    try {
      await vacateBed(allocation.id);
      toast.success('Bed vacated.');
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't vacate this bed.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bed {bedNumber}</DialogTitle>
        </DialogHeader>
        {allocation ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground">
              Occupied by{' '}
              <span className="font-medium">
                {allocation.student.firstName} {allocation.student.lastName}
              </span>{' '}
              <span className="text-xs text-muted-foreground">
                ({allocation.student.admissionNumber})
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Allocated {new Date(allocation.allocatedAt).toLocaleDateString()}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <StudentSearchBox onSelect={setStudent} />
            {student && (
              <p className="text-sm text-foreground">
                Assigning: <span className="font-medium">{student.firstName} {student.lastName}</span>
              </p>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          {allocation ? (
            <Button variant="destructive" onClick={() => void handleVacate()} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Vacate Bed'}
            </Button>
          ) : (
            <Button onClick={() => void handleAllocate()} disabled={isSaving || !student}>
              {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Assign'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
