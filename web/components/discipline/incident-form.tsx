'use client';

import { Loader2, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { createIncident } from '@/lib/actions/discipline';
import { todayInSchoolTimezone } from '@/lib/school-date';
import type { IncidentSeverity } from '@/lib/types/discipline';

const SEVERITY_OPTIONS: { value: IncidentSeverity; label: string }[] = [
  { value: 'MINOR', label: 'Minor' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'SEVERE', label: 'Severe' },
];

export function IncidentForm({
  students,
}: {
  students: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [severity, setSeverity] = useState<IncidentSeverity>('MINOR');
  const [date, setDate] = useState(todayInSchoolTimezone);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function reset() {
    setStudentId('');
    setSeverity('MINOR');
    setDate(todayInSchoolTimezone());
    setDescription('');
  }

  async function submit() {
    if (!studentId || !description.trim()) {
      toast.error('Pick a student and describe what happened.');
      return;
    }
    setIsSaving(true);
    try {
      await createIncident({ studentId, severity, date, description: description.trim() });
      toast.success('Incident logged.');
      reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log the incident.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="size-4" aria-hidden="true" />
            Log Incident
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log a Disciplinary Incident</DialogTitle>
          <DialogDescription>
            Record what happened. Proposing a disciplinary action comes after, on the incident&apos;s
            detail page.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="incident-student">Student</Label>
            <Select
              value={studentId}
              onValueChange={(v) => v && setStudentId(v)}
              items={students.map((s) => ({ value: s.id, label: s.name }))}
            >
              <SelectTrigger id="incident-student" className="w-full">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="incident-severity">Severity</Label>
              <Select
                value={severity}
                onValueChange={(v) => v && setSeverity(v as IncidentSeverity)}
                items={SEVERITY_OPTIONS}
              >
                <SelectTrigger id="incident-severity" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="incident-date">Date</Label>
              <Input
                id="incident-date"
                type="date"
                value={date}
                max={todayInSchoolTimezone()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="incident-description">What happened?</Label>
            <Textarea
              id="incident-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the incident in detail."
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
          <Button type="button" disabled={isSaving} onClick={submit}>
            {isSaving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : 'Log Incident'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
