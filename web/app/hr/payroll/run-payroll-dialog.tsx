'use client';

import { Play } from 'lucide-react';
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
import { createPayrollRun } from '@/lib/actions/hr';

export function RunPayrollDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
  );
  const [isSaving, setIsSaving] = useState(false);

  async function handleRun() {
    const [yearStr, monthStr] = month.split('-');
    setIsSaving(true);
    try {
      const run = await createPayrollRun({ month: Number(monthStr), year: Number(yearStr) });
      toast.success('Payroll computed — review it below.');
      setOpen(false);
      router.push(`/hr/payroll/${run.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't run payroll for this month.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Play className="size-4" aria-hidden="true" />
        Run Payroll
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run Payroll</DialogTitle>
          <DialogDescription>
            Computes gross pay, PAYE, and pension for every active staff member with a salary
            grade assigned. You&apos;ll review the numbers before approving.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="payroll-month">Month</Label>
          <Input
            id="payroll-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => void handleRun()} disabled={isSaving}>
            {isSaving ? 'Computing…' : 'Run Payroll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
