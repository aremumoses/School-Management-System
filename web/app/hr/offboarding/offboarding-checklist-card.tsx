'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateOffboarding } from '@/lib/actions/hr';
import type { OffboardingChecklistDto } from '@/lib/types/hr';
import { CompleteOffboardingDialog } from './complete-offboarding-dialog';

export function OffboardingChecklistCard({ checklist }: { checklist: OffboardingChecklistDto }) {
  const router = useRouter();
  const [finalPayAmount, setFinalPayAmount] = useState(
    checklist.finalPayAmount != null ? String(checklist.finalPayAmount) : '',
  );
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [isSavingPay, setIsSavingPay] = useState(false);

  const staffName = `${checklist.staff?.firstName ?? ''} ${checklist.staff?.lastName ?? ''}`;
  const isComplete = Boolean(checklist.completedAt);
  const allItemsDone = checklist.items.every((i) => i.completed);

  async function toggleItem(key: string, completed: boolean) {
    setBusyKey(key);
    try {
      await updateOffboarding(checklist.id, { item: { key, completed } });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update this item.");
    } finally {
      setBusyKey(null);
    }
  }

  async function saveFinalPay() {
    if (!finalPayAmount) {
      toast.error('Enter a final pay amount.');
      return;
    }
    setIsSavingPay(true);
    try {
      await updateOffboarding(checklist.id, { finalPayAmount: Number(finalPayAmount) });
      toast.success('Final pay amount saved.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the final pay amount.");
    } finally {
      setIsSavingPay(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{staffName}</CardTitle>
        {isComplete ? (
          <Badge variant="secondary">Completed</Badge>
        ) : (
          <Badge variant="warning">In progress</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {checklist.items.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <Checkbox
                id={`item-${checklist.id}-${item.key}`}
                checked={item.completed}
                disabled={isComplete || busyKey === item.key}
                onCheckedChange={(checked) => void toggleItem(item.key, checked === true)}
              />
              <Label
                htmlFor={`item-${checklist.id}-${item.key}`}
                className="text-sm font-normal text-foreground"
              >
                {item.label}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor={`final-pay-${checklist.id}`}>Final Pay Amount (₦)</Label>
            <Input
              id={`final-pay-${checklist.id}`}
              type="number"
              min="0"
              value={finalPayAmount}
              disabled={isComplete}
              onChange={(e) => setFinalPayAmount(e.target.value)}
              className="w-40"
            />
          </div>
          {!isComplete && (
            <Button variant="outline" onClick={() => void saveFinalPay()} disabled={isSavingPay}>
              {isSavingPay ? 'Saving…' : 'Save'}
            </Button>
          )}
        </div>

        {!isComplete && (
          <div className="flex flex-col items-end gap-1">
            {(!allItemsDone || !checklist.finalPayAmount) && (
              <p className="text-xs text-muted-foreground">
                Complete every item and set the final pay amount to enable this.
              </p>
            )}
            <CompleteOffboardingDialog
              checklistId={checklist.id}
              staffName={staffName}
              disabled={!allItemsDone || !checklist.finalPayAmount}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
