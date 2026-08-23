'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { createAssignment, uploadAssignmentAttachment } from '@/lib/actions/assignments';

export function NewAssignmentForm({
  options,
}: {
  options: { classSubjectId: string; label: string }[];
}) {
  const router = useRouter();
  const [classSubjectId, setClassSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [allowLate, setAllowLate] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    if (!classSubjectId) return toast.error('Choose the class/subject.');
    if (!title.trim()) return toast.error('A title is required.');
    if (!instructions.trim()) return toast.error('Instructions are required.');
    if (!dueDate) return toast.error('Pick a due date.');

    setIsSaving(true);
    try {
      const assignment = await createAssignment({
        classSubjectId,
        title: title.trim(),
        instructions: instructions.trim(),
        dueDate: new Date(dueDate).toISOString(),
        allowLateSubmission: allowLate,
      });
      if (attachment) {
        const formData = new FormData();
        formData.set('file', attachment);
        try {
          await uploadAssignmentAttachment(assignment.id, formData);
        } catch {
          toast.warning('Posted, but the attachment upload failed — attach it from the detail page.');
        }
      }
      toast.success('Assignment posted — students have been notified.');
      router.push(`/teacher/assignments/${assignment.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't post the assignment.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="mx-auto max-w-2xl">
      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <Label>Class / Subject</Label>
          <Select
            value={classSubjectId}
            onValueChange={(v) => {
              if (v) setClassSubjectId(v);
            }}
            items={options.map((o) => ({ value: o.classSubjectId, label: o.label }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose one of your classes…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((o) => (
                <SelectItem key={o.classSubjectId} value={o.classSubjectId}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="a-title">Title</Label>
          <Input
            id="a-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 4 exercises"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="a-instructions">Instructions</Label>
          <Textarea
            id="a-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="What exactly should students do?"
            className="min-h-28"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="a-due">Due date &amp; time</Label>
            <Input
              id="a-due"
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="a-file">Attachment (optional)</Label>
            <Input
              id="a-file"
              type="file"
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Allow late submission</p>
            <p className="text-xs text-muted-foreground">
              Off: submissions are rejected after the deadline. On: students can still submit
              after it.
            </p>
          </div>
          <Switch checked={allowLate} onCheckedChange={setAllowLate} aria-label="Allow late submission" />
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => router.push('/teacher/assignments')}>
            Cancel
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Posting…
              </>
            ) : (
              'Post Assignment'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
