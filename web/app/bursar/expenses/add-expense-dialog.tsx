'use client';

import { Loader2, Plus } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createExpense, uploadExpenseReceipt } from '@/lib/actions/fees';
import { EXPENSE_CATEGORY_LABELS } from './expense-filters';

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function AddExpenseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('OTHER');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setCategory('OTHER');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setDescription('');
    setReceiptFile(null);
  }

  async function handleSubmit() {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Enter a valid amount.');
      return;
    }
    if (!date) {
      toast.error('Pick a date.');
      return;
    }
    if (description.trim().length < 3) {
      toast.error('Describe the expense (at least 3 characters).');
      return;
    }
    setIsSubmitting(true);
    try {
      const expense = await createExpense({
        category,
        amount: numericAmount,
        date,
        description: description.trim(),
      });
      if (receiptFile) {
        const formData = new FormData();
        formData.set('file', receiptFile);
        try {
          await uploadExpenseReceipt(expense.id, formData);
        } catch {
          toast.warning('Expense saved, but the receipt upload failed — attach it again later.');
        }
      }
      toast.success('Expense recorded.');
      setOpen(false);
      reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't record the expense.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        Record Expense
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record an expense</DialogTitle>
          <DialogDescription>
            Logged with your name in the audit trail. Attach a receipt photo or PDF if you have
            one.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => {
                  if (v) setCategory(v);
                }}
                items={CATEGORY_OPTIONS}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expense-amount">Amount (₦)</Label>
              <Input
                id="expense-amount"
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 45000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expense-date">Date</Label>
            <Input
              id="expense-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expense-description">Description</Label>
            <Textarea
              id="expense-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Generator fuel — July"
              className="min-h-16"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="expense-receipt">Receipt (optional)</Label>
            <Input
              id="expense-receipt"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : (
              'Record Expense'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
