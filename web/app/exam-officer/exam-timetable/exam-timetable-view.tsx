'use client';

import { AlertTriangle, CalendarPlus, Loader2, Trash2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import {
  createExamSession,
  deleteExamSession,
} from '@/lib/actions/exam-logistics';
import type { SubjectDto } from '@/lib/types/academic';
import type { ExamHallDto, ExamSessionDto } from '@/lib/types/exam-logistics';
import { SeatAllocationDialog } from './seat-allocation-dialog';

function NewSessionDialog({
  termId,
  armOptions,
  subjects,
}: {
  termId: string;
  armOptions: { id: string; classId: string; label: string }[];
  subjects: SubjectDto[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [armId, setArmId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const selectedArm = armOptions.find((a) => a.id === armId);
  const subjectOptions = selectedArm
    ? subjects
        .filter((s) => s.classSubjects.some((cs) => cs.classId === selectedArm.classId))
        .map((s) => ({ id: s.id, name: s.name }))
    : [];

  function reset() {
    setArmId('');
    setSubjectId('');
    setDate('');
    setStartTime('09:00');
    setDurationMinutes('60');
    setError(null);
  }

  async function handleCreate() {
    if (!armId || !subjectId || !date) {
      setError('Choose an arm, subject, and date.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await createExamSession({
        armId,
        subjectId,
        date,
        startTime,
        durationMinutes: Number(durationMinutes) || 60,
        termId,
      });
      toast.success('Exam session scheduled.');
      reset();
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't schedule this session.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button />}>
        <CalendarPlus className="size-4" aria-hidden="true" />
        New Exam Session
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule an exam session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Class / Arm</Label>
            <Select
              value={armId}
              onValueChange={(v) => {
                setArmId(v ?? '');
                setSubjectId('');
              }}
              items={armOptions.map((a) => ({ value: a.id, label: a.label }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {armOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={subjectId}
              onValueChange={(v) => {
                if (v) setSubjectId(v);
              }}
              items={subjectOptions.map((s) => ({ value: s.id, label: s.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={armId ? 'Choose…' : 'Pick an arm first'} />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="es-date">Date</Label>
            <Input id="es-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="es-start">Start time</Label>
              <Input
                id="es-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="es-duration">Duration (min)</Label>
              <Input
                id="es-duration"
                type="number"
                min="1"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-error-soft bg-error-soft px-3 py-2.5 text-sm text-error-soft-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreate()} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Scheduling…
              </>
            ) : (
              'Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ExamTimetableView({
  termId,
  sessions,
  armOptions,
  subjects,
  halls,
}: {
  termId: string;
  sessions: ExamSessionDto[];
  armOptions: { id: string; classId: string; label: string }[];
  subjects: SubjectDto[];
  halls: ExamHallDto[];
}) {
  const router = useRouter();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [seatSession, setSeatSession] = useState<ExamSessionDto | null>(null);

  const sorted = useMemo(
    () =>
      [...sessions].sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
      ),
    [sessions],
  );

  async function handleDelete(id: string) {
    setRemovingId(id);
    try {
      await deleteExamSession(id);
      toast.success('Session removed.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't remove the session.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewSessionDialog termId={termId} armOptions={armOptions} subjects={subjects} />
      </div>

      {sorted.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
          No exam sessions scheduled yet.
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((session) => (
            <Card key={session.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {session.subjectName} — {session.armLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(session.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {session.startTime} · {session.durationMinutes} min
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline">
                    {session.seatAllocationCount} seated
                  </Badge>
                  <Badge variant="outline">
                    <Users className="size-3" aria-hidden="true" />
                    {session.invigilatorCount}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={() => setSeatSession(session)}>
                    Seating
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleDelete(session.id)}
                    disabled={removingId === session.id}
                    aria-label="Delete session"
                  >
                    {removingId === session.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {seatSession && (
        <SeatAllocationDialog
          session={seatSession}
          halls={halls}
          onClose={() => setSeatSession(null)}
        />
      )}
    </div>
  );
}
