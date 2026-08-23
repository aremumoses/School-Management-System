'use client';

import { LogIn, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { clockIn, clockOut } from '@/lib/actions/hr';
import type { StaffAttendanceDto } from '@/lib/types/hr';

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export function ClockWidget({ today }: { today: StaffAttendanceDto | null }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  async function handleClockIn() {
    setIsSaving(true);
    try {
      await clockIn();
      toast.success('Clocked in.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't clock in.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleClockOut() {
    setIsSaving(true);
    try {
      await clockOut();
      toast.success('Clocked out.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't clock out.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Attendance Today</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-6 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Clock-in</p>
            <p className="font-semibold text-foreground">{formatTime(today?.clockIn ?? null)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Clock-out</p>
            <p className="font-semibold text-foreground">{formatTime(today?.clockOut ?? null)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => void handleClockIn()}
            disabled={isSaving || Boolean(today?.clockIn)}
          >
            <LogIn className="size-4" aria-hidden="true" />
            Clock In
          </Button>
          <Button
            variant="outline"
            onClick={() => void handleClockOut()}
            disabled={isSaving || !today?.clockIn || Boolean(today?.clockOut)}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Clock Out
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
