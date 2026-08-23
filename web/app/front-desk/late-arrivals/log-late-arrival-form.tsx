'use client';

import { Loader2, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { logLateArrival } from '@/lib/actions/front-desk';

export function LogLateArrivalForm({
  studentOptions,
}: {
  studentOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [notify, setNotify] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleLog() {
    if (!studentId) return toast.error('Pick the student.');
    if (!arrivalTime) return toast.error('Enter the arrival time.');
    setIsSaving(true);
    try {
      await logLateArrival({
        studentId,
        arrivalTime: new Date(arrivalTime).toISOString(),
        notifyClassTeacher: notify,
      });
      toast.success(notify ? 'Logged — Class Teacher notified.' : 'Logged.');
      setStudentId('');
      setArrivalTime('');
      setNotify(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log the arrival.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-64 space-y-1">
        <Label>Student</Label>
        <Select
          value={studentId}
          onValueChange={(v) => {
            if (v) setStudentId(v);
          }}
          items={studentOptions.map((s) => ({ value: s.id, label: s.label }))}
        >
          <SelectTrigger className="w-full" aria-label="Choose student">
            <SelectValue placeholder="Choose the student…" />
          </SelectTrigger>
          <SelectContent>
            {studentOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="la-time">Arrival time</Label>
        <Input
          id="la-time"
          type="datetime-local"
          value={arrivalTime}
          onChange={(e) => setArrivalTime(e.target.value)}
          className="w-56"
        />
      </div>
      <div className="flex items-center gap-2 pb-1.5">
        <Switch checked={notify} onCheckedChange={setNotify} aria-label="Notify class teacher" />
        <span className="text-sm text-muted-foreground">Notify Class Teacher</span>
      </div>
      <Button size="sm" onClick={() => void handleLog()} disabled={isSaving}>
        {isSaving ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Plus className="size-3.5" aria-hidden="true" />
        )}
        Log
      </Button>
    </div>
  );
}
