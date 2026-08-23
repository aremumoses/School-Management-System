'use client';

import { Download, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { submitAssignment, submitAssignmentFile } from '@/lib/actions/assignments';
import type { SubmissionDto } from '@/lib/types/assignments';

export function SubmissionForm({
  assignmentId,
  submission,
  canSubmit,
}: {
  assignmentId: string;
  submission: SubmissionDto | null;
  canSubmit: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState(submission?.textResponse ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit() {
    if (!text.trim() && !file) {
      toast.error('Write a response or attach a file.');
      return;
    }
    setIsSaving(true);
    try {
      if (text.trim()) {
        await submitAssignment(assignmentId, { textResponse: text.trim() });
      }
      if (file) {
        const formData = new FormData();
        formData.set('file', file);
        await submitAssignmentFile(assignmentId, formData);
      }
      toast.success('Submitted.');
      setFile(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't submit.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!canSubmit) {
    return (
      <div className="space-y-3">
        {submission ? (
          <>
            {submission.textResponse && (
              <p className="whitespace-pre-wrap rounded-md bg-muted/50 px-3 py-2 text-sm text-foreground">
                {submission.textResponse}
              </p>
            )}
            {submission.fileUrl && (
              <Button
                size="sm"
                variant="outline"
                render={<a href={submission.fileUrl} target="_blank" rel="noreferrer" />}
              >
                <Download className="size-3.5" aria-hidden="true" />
                Your file
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              {submission.gradedAt
                ? 'This submission has been graded and can no longer be changed.'
                : 'Submitted — awaiting grading.'}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Submissions are closed for this assignment.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="s-text">Text response</Label>
        <Textarea
          id="s-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your answers here…"
          className="min-h-28"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="s-file">File (optional)</Label>
        {submission?.fileUrl && (
          <p className="text-xs">
            <a
              href={submission.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              Current file
            </a>{' '}
            <span className="text-muted-foreground">— uploading a new one replaces it.</span>
          </p>
        )}
        <Input id="s-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => void handleSubmit()} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Submitting…
            </>
          ) : submission ? (
            'Update Submission'
          ) : (
            'Submit'
          )}
        </Button>
      </div>
    </div>
  );
}
