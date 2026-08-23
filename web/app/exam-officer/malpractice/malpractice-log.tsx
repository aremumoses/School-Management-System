'use client';

import { Loader2, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
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
import { createMalpracticeIncident } from '@/lib/actions/exam-logistics';
import { formatLoggedAt } from '@/lib/format';
import type { ExamSessionDto, MalpracticeIncidentDto } from '@/lib/types/exam-logistics';

function LogForm({
  sessions,
  students,
}: {
  sessions: ExamSessionDto[];
  students: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [examSessionId, setExamSessionId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleLog() {
    if (!studentId || !description.trim() || !actionTaken.trim()) {
      return toast.error('Student, description, and action taken are all required.');
    }
    setIsSaving(true);
    try {
      await createMalpracticeIncident({
        examSessionId: examSessionId || undefined,
        studentId,
        description: description.trim(),
        actionTaken: actionTaken.trim(),
      });
      toast.success('Incident logged.');
      setExamSessionId('');
      setStudentId('');
      setDescription('');
      setActionTaken('');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't log the incident.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Student</Label>
          <Select
            value={studentId}
            onValueChange={(v) => setStudentId(v ?? '')}
            items={students.map((s) => ({ value: s.id, label: s.name }))}
          >
            <SelectTrigger className="w-full">
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
        <div className="space-y-1">
          <Label>Exam session (optional)</Label>
          <Select
            value={examSessionId}
            onValueChange={(v) => setExamSessionId(v ?? '')}
            items={[
              { value: '', label: 'Not tied to a specific session' },
              ...sessions.map((s) => ({
                value: s.id,
                label: `${s.subjectName} — ${s.armLabel} (${new Date(s.date).toLocaleDateString()})`,
              })),
            ]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Not tied to a specific session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Not tied to a specific session</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.subjectName} — {s.armLabel} ({new Date(s.date).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="mp-desc">What happened?</Label>
        <Textarea
          id="mp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the incident in detail."
          className="min-h-20"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="mp-action">Action taken</Label>
        <Input
          id="mp-action"
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          placeholder="e.g. Script confiscated, student issued a warning"
        />
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => void handleLog()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldAlert className="size-3.5" aria-hidden="true" />
          )}
          Log Incident
        </Button>
      </div>
    </div>
  );
}

export function MalpracticeLog({
  incidents,
  sessions,
  students,
}: {
  incidents: MalpracticeIncidentDto[];
  sessions: ExamSessionDto[];
  students: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Log an Incident</CardTitle>
        </CardHeader>
        <CardContent>
          <LogForm sessions={sessions} students={students} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log ({incidents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {incidents.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldAlert />
                </EmptyMedia>
                <EmptyTitle>No incidents logged</EmptyTitle>
                <EmptyDescription>
                  Malpractice observed during internal exams or CBT tests will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {incidents.map((incident) => (
                <li key={incident.id} className="space-y-1 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {incident.student.firstName} {incident.student.lastName}{' '}
                      <span className="font-normal text-xs text-muted-foreground">
                        ({incident.student.admissionNumber})
                      </span>
                    </p>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {formatLoggedAt(incident.loggedAt)}
                    </span>
                  </div>
                  {incident.examSession && (
                    <p className="text-xs text-muted-foreground">
                      {incident.examSession.subject.name} —{' '}
                      {incident.examSession.arm.class.name} {incident.examSession.arm.name}
                    </p>
                  )}
                  <p className="text-sm text-foreground">{incident.description}</p>
                  <p className="text-xs text-muted-foreground">Action: {incident.actionTaken}</p>
                  <p className="text-xs text-muted-foreground">
                    Logged by {incident.loggedByStaff.firstName} {incident.loggedByStaff.lastName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
