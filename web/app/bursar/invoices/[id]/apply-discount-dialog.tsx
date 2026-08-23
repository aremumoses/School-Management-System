'use client';

import { Loader2, Percent } from 'lucide-react';
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
import { applyDiscount } from '@/lib/actions/fees';
import { formatNaira } from '@/lib/format';
import type { DiscountType } from '@/lib/types/fees';

export function ApplyDiscountDialog({
  invoiceId,
  subtotal,
}: {
  invoiceId: string;
  subtotal: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DiscountType>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const numericValue = Number(value);
  const computedAmount =
    !value || isNaN(numericValue)
      ? null
      : type === 'PERCENTAGE'
        ? (numericValue / 100) * subtotal
        : numericValue;

  async function handleSubmit() {
    if (!value || isNaN(numericValue) || numericValue <= 0) {
      toast.error('Enter a valid discount value.');
      return;
    }
    if (type === 'PERCENTAGE' && numericValue > 100) {
      toast.error('A percentage discount cannot exceed 100%.');
      return;
    }
    if (!reason.trim()) {
      toast.error('A reason is required — it appears in the audit trail.');
      return;
    }
    setIsSubmitting(true);
    try {
      await applyDiscount(invoiceId, { type, value: numericValue, reason: reason.trim() });
      toast.success('Discount applied.');
      setOpen(false);
      setValue('');
      setReason('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't apply the discount.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Percent className="size-3.5" aria-hidden="true" />
        Apply Discount
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply a discount</DialogTitle>
          <DialogDescription>
            Recorded against the invoice with your name and reason — never silently changes the
            total.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  if (v) setType(v as DiscountType);
                }}
                items={[
                  { value: 'PERCENTAGE', label: 'Percentage (%)' },
                  { value: 'FLAT', label: 'Flat amount (₦)' },
                ]}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                  <SelectItem value="FLAT">Flat amount (₦)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="discount-value">
                {type === 'PERCENTAGE' ? 'Percentage (0–100)' : 'Amount (₦)'}
              </Label>
              <Input
                id="discount-value"
                type="number"
                min="0"
                max={type === 'PERCENTAGE' ? 100 : undefined}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 15000'}
              />
            </div>
          </div>

          {computedAmount !== null && computedAmount > 0 && (
            <p className="text-sm text-muted-foreground">
              This reduces the invoice by{' '}
              <strong className="text-foreground">{formatNaira(computedAmount)}</strong>.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="discount-reason">Reason (required)</Label>
            <Textarea
              id="discount-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Sibling discount — 2nd child"
              className="min-h-16"
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
                Applying…
              </>
            ) : (
              'Apply Discount'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
