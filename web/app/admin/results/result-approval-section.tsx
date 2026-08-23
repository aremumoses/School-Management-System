'use client';

import { Download, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BroadsheetTable } from '@/components/results/broadsheet-table';
import { Textarea } from '@/components/ui/textarea';
import { approveAndPublishResults, returnResults, setPrincipalComment, suggestComment } from '@/lib/actions/results';
import { smartPrincipalComment } from '@/lib/principal-comment';
import { RESULT_STAGE_BADGE, RESULT_STAGE_LABELS } from '@/lib/result-stage-labels';
import { cn } from '@/lib/utils';
import type { ResultStatusDto, StudentBroadsheetRowDto } from '@/lib/types/results';

export function ResultApprovalSection({
  armId,
  termId,
  status,
  rows,
}: {
  armId: string;
  termId: string;
  status: ResultStatusDto;
  rows: StudentBroadsheetRowDto[];
}) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);

  const canAct = status.stage === 'PENDING_APPROVAL';

  async function handleApproveAndPublish() {
    setIsPublishing(true);
    try {
      await approveAndPublishResults(armId, termId);
      toast.success('Results approved and published.');
      setPublishDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't approve and publish.");
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleReturn() {
    if (!returnReason.trim()) {
      toast.error('A reason is required.');
      return;
    }
    setIsReturning(true);
    try {
      await returnResults(armId, termId, { reason: returnReason });
      toast.success('Returned for correction.');
      setReturnDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't return for correction.");
    } finally {
      setIsReturning(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>Broadsheet</CardTitle>
          <Badge variant={RESULT_STAGE_BADGE[status.stage]}>{RESULT_STAGE_LABELS[status.stage]}</Badge>
        </div>
        <CardAction className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={
              <a href={`/api/results/${armId}/${termId}/broadsheet/export`} download />
            }
          >
            <Download className="size-4" aria-hidden="true" />
            Export Excel
          </Button>
        {canAct && (<>
            <AlertDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
              <AlertDialogTrigger render={<Button variant="outline" />}>
                Return for Correction
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Return for correction?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Explain what needs fixing — this is shown to the Exam Officer and class
                    teacher.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <Textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Please double-check Mathematics scores for JSS1 Gold."
                  className="min-h-20"
                />
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" disabled={isReturning} onClick={handleReturn}>
                    {isReturning ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Returning…
                      </>
                    ) : (
                      'Return'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
              <AlertDialogTrigger render={<Button />}>Approve &amp; Publish</AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Approve and publish results?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This makes report cards visible to students and parents immediately, and
                    generates a PDF report card for every student in the class.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction disabled={isPublishing} onClick={handleApproveAndPublish}>
                    {isPublishing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                        Publishing…
                      </>
                    ) : (
                      'Approve & Publish'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>)}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.stage === 'RETURNED' && status.returnReason && (
          <div className="rounded-lg border border-error-soft bg-error-soft px-4 py-3 text-sm text-error-soft-foreground">
            <strong>Returned for correction:</strong> {status.returnReason}
          </div>
        )}
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scores have been submitted for this class yet.
          </p>
        ) : (
          <BroadsheetTable
            rows={rows}
            extraColumnHeader="Principal's Comment"
            renderExtraColumn={(row) => (
              <PrincipalCommentCell
                key={row.studentId}
                armId={armId}
                termId={termId}
                studentId={row.studentId}
                initialComment={row.principalComment}
                overallAverage={row.overallAverage}
              />
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}

function PrincipalCommentCell({
  armId,
  termId,
  studentId,
  initialComment,
  overallAverage,
}: {
  armId: string;
  termId: string;
  studentId: string;
  initialComment: string | null;
  overallAverage: number;
}) {
  const [value, setValue] = useState(initialComment ?? '');
  const [lastSaved, setLastSaved] = useState(initialComment ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const isDirty = value !== lastSaved;

  async function handleSave() {
    setIsSaving(true);
    try {
      await setPrincipalComment(armId, termId, studentId, { principalComment: value });
      setLastSaved(value);
      toast.success('Comment saved.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save comment.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSuggest() {
    setIsSuggesting(true);
    // suggestComment returns a result object rather than throwing —
    // assistive feature, fail quietly back to manual entry (Smart Default
    // below still works), never a blocking error.
    const result = await suggestComment(armId, termId, studentId, {
      commentType: 'PRINCIPAL',
    });
    if (result.success) {
      setValue(result.suggestion);
    } else {
      toast.error(result.error);
    }
    setIsSuggesting(false);
  }

  return (
    <div className="flex w-64 flex-col gap-1.5">
      {isDirty && (
        <Badge variant="warning" className="w-fit font-normal">
          Draft — not yet saved
        </Badge>
      )}
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cn('min-h-16 text-xs', isDirty && 'border-warning ring-1 ring-warning/30')}
        placeholder="Principal's comment…"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setValue(smartPrincipalComment(overallAverage))}
          >
            Smart Default
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleSuggest()}
            disabled={isSuggesting}
          >
            {isSuggesting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <>
                <Sparkles className="size-3.5" aria-hidden="true" />
                Suggest
              </>
            )}
          </Button>
        </div>
        <Button type="button" size="sm" disabled={!isDirty || isSaving} onClick={handleSave}>
          {isSaving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : 'Save'}
        </Button>
      </div>
    </div>
  );
}
