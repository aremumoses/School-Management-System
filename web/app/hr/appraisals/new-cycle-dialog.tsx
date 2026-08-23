'use client';

import { Plus } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createAppraisalCycle } from '@/lib/actions/appraisal';

export function NewCycleDialog({ hasForm }: { hasForm: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function closeAndReset() {
    setOpen(false);
    setName('');
    setPeriodStart('');
    setPeriodEnd('');
  }

  async function handleCreate() {
    if (!name.trim() || !periodStart || !periodEnd) {
      toast.error('All fields are required.');
      return;
    }
    setIsSaving(true);
    try {
      const cycle = await createAppraisalCycle({ name: name.trim(), periodStart, periodEnd });
      toast.success('Appraisal cycle created.');
      closeAndReset();
      router.push(`/hr/appraisals/${cycle.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create this cycle.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeAndReset())}>
      <DialogTrigger render={<Button disabled={!hasForm} />}>
        <Plus className="size-4" aria-hidden="true" />
        New Cycle
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Appraisal Cycle</DialogTitle>
          <DialogDescription>Uses the current appraisal form definition above.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cycle-name">Name</Label>
            <Input
              id="cycle-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="2026 Mid-Year Review"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="period-start">Period Start</Label>
              <Input
                id="period-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="period-end">Period End</Label>
              <Input
                id="period-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => void handleCreate()} disabled={isSaving}>
            {isSaving ? 'Creating…' : 'Create Cycle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
