'use client';

import { ClipboardList, Loader2, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import { createTest } from '@/lib/actions/cbt';
import { TEST_STATUS_BADGE } from '@/lib/cbt-labels';
import type { CBTTestDto } from '@/lib/types/cbt';

function NewTestDialog({
  classSubjectOptions,
}: {
  classSubjectOptions: { classSubjectId: string; label: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [classSubjectId, setClassSubjectId] = useState('');
  const [timeLimit, setTimeLimit] = useState('30');
  const [attempts, setAttempts] = useState('1');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [passMark, setPassMark] = useState('50');
  const [instantRelease, setInstantRelease] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return toast.error('A title is required.');
    if (!classSubjectId) return toast.error('Choose the class/subject.');
    if (!from || !to) return toast.error('Set the availability window.');
    setIsSaving(true);
    try {
      const test = await createTest({
        title: title.trim(),
        classSubjectId,
        timeLimitMinutes: Number(timeLimit) || 30,
        attemptsAllowed: Number(attempts) || 1,
        availableFrom: new Date(from).toISOString(),
        availableTo: new Date(to).toISOString(),
        passMark: Number(passMark) || 50,
        instantRelease,
        showCorrectAnswersAfter: showAnswers,
        isMockPractice: isMock,
      });
      toast.success('Test created — now add questions.');
      setOpen(false);
      router.push(`/teacher/cbt/tests/${test.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't create the test.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" aria-hidden="true" />
        New Test
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New CBT test</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Class / Subject</Label>
            <Select
              value={classSubjectId}
              onValueChange={(v) => {
                if (v) setClassSubjectId(v);
              }}
              items={classSubjectOptions.map((o) => ({
                value: o.classSubjectId,
                label: o.label,
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose…" />
              </SelectTrigger>
              <SelectContent>
                {classSubjectOptions.map((o) => (
                  <SelectItem key={o.classSubjectId} value={o.classSubjectId}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-limit">Time limit (min)</Label>
              <Input id="t-limit" type="number" min="1" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-attempts">Attempts</Label>
              <Input id="t-attempts" type="number" min="1" value={attempts} onChange={(e) => setAttempts(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-pass">Pass mark (%)</Label>
              <Input id="t-pass" type="number" min="0" max="100" value={passMark} onChange={(e) => setPassMark(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="t-from">Opens</Label>
              <Input id="t-from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-to">Closes</Label>
              <Input id="t-to" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Instant score release</span>
              <Switch checked={instantRelease} onCheckedChange={setInstantRelease} aria-label="Instant release" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Show correct answers after</span>
              <Switch checked={showAnswers} onCheckedChange={setShowAnswers} aria-label="Show answers after" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground">JAMB mock practice</p>
                <p className="text-xs text-muted-foreground">
                  Practice only — never feeds report cards.
                </p>
              </div>
              <Switch checked={isMock} onCheckedChange={setIsMock} aria-label="Mock practice" />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Creating…
                </>
              ) : (
                'Create Test'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TestsPanel({
  tests,
  classSubjectOptions,
}: {
  tests: CBTTestDto[];
  classSubjectOptions: { classSubjectId: string; label: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewTestDialog classSubjectOptions={classSubjectOptions} />
      </div>

      {tests.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList />
            </EmptyMedia>
            <EmptyTitle>No tests yet</EmptyTitle>
            <EmptyDescription>
              Create a test, add questions from the approved bank, and it opens automatically in
              its availability window.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {tests.map((test) => (
            <Link key={test.id} href={`/teacher/cbt/tests/${test.id}`} className="block">
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{test.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {test.classSubject.class.name} — {test.classSubject.subject.name} ·{' '}
                      {test._count.questions} questions · {test.timeLimitMinutes} min ·{' '}
                      {test._count.attempts} attempt{test._count.attempts === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {test.isMockPractice && <Badge variant="info">Mock</Badge>}
                    <Badge variant={TEST_STATUS_BADGE[test.status]}>{test.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
