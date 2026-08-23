'use client';

import { CalendarOff, Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
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
import { createLeaveRequest } from '@/lib/actions/hostel-transport';
import { todayInSchoolTimezone } from '@/lib/school-date';
import type { LeaveOutingRequestDto, LeaveRequestStatus } from '@/lib/types/hostel-transport';

const STATUS_BADGE: Record<LeaveRequestStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

function RequestForm({ wards }: { wards: { id: string; name: string }[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(wards[0]?.id ?? '');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    if (!studentId || !fromDate || !toDate || !reason.trim()) {
      return toast.error('All fields are required.');
    }
    setIsSaving(true);
    try {
      await createLeaveRequest({ studentId, fromDate, toDate, reason: reason.trim() });
      toast.success('Request submitted — the warden will review it.');
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
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Ward</Label>
        <Select
          value={studentId}
          onValueChange={(v) => v && setStudentId(v)}
          items={wards.map((c) => ({ value: c.id, label: c.name }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {wards.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Family event this weekend"
        />
      </div>
      <div className="flex justify-end">
        <Button onClick={() => void handleSubmit()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Submit Request
        </Button>
      </div>
    </div>
  );
}

export function LeaveRequestsView({
  wards,
  requests,
}: {
  wards: { id: string; name: string }[];
  requests: LeaveOutingRequestDto[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>New Request</CardTitle>
        </CardHeader>
        <CardContent>
          <RequestForm wards={wards} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarOff />
                </EmptyMedia>
                <EmptyTitle>No requests yet</EmptyTitle>
                <EmptyDescription>Submit a request above.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {requests.map((r) => (
                <li key={r.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {r.student.firstName} {r.student.lastName}
                    </p>
                    <Badge variant={STATUS_BADGE[r.status]}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.fromDate).toLocaleDateString()} –{' '}
                    {new Date(r.toDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-foreground">{r.reason}</p>
                  {r.status === 'REJECTED' && r.decisionNotes && (
                    <p className="text-xs text-error-soft-foreground">
                      Reason: {r.decisionNotes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
