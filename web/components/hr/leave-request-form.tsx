'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { createLeaveRequest } from '@/lib/actions/hr';
import { todayInSchoolTimezone } from '@/lib/school-date';
import type { LeaveBalanceDto, LeaveTypeDto } from '@/lib/types/hr';

/** Shared by /teacher/leave and /hr/leave — any staff role submits leave the same way. */
export function LeaveRequestForm({
  leaveTypes,
  balances,
}: {
  leaveTypes: LeaveTypeDto[];
  balances: LeaveBalanceDto[];
}) {
  const router = useRouter();
  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id ?? '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const balance = balances.find((b) => b.leaveTypeId === leaveTypeId);
  const remaining = balance ? balance.allocatedDays - balance.usedDays : null;

  async function handleSubmit() {
    if (!leaveTypeId || !fromDate || !toDate || !reason.trim()) {
      toast.error('All fields are required.');
      return;
    }
    setIsSaving(true);
    try {
      const request = await createLeaveRequest({
        leaveTypeId,
        fromDate,
        toDate,
        reason: reason.trim(),
      });
      if (request.exceedsBalance) {
        toast.warning('Submitted — but this exceeds your remaining balance for this leave type.');
      } else {
        toast.success('Leave request submitted.');
      }
      setFromDate('');
      setToDate('');
      setReason('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't submit this request.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>New Leave Request</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Leave Type</Label>
          <Select
            value={leaveTypeId}
            onValueChange={(v) => v && setLeaveTypeId(v)}
            items={leaveTypes.map((t) => ({ value: t.id, label: t.name }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {leaveTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {remaining !== null && (
            <p className="text-xs text-muted-foreground">
              {remaining} day(s) remaining this year
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="leave-from">From</Label>
            <Input
              id="leave-from"
              type="date"
              min={todayInSchoolTimezone()}
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-to">To</Label>
            <Input
              id="leave-to"
              type="date"
              min={fromDate || todayInSchoolTimezone()}
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="leave-reason">Reason</Label>
          <Textarea
            id="leave-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Family event, medical appointment…"
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? 'Submitting…' : 'Submit Request'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
