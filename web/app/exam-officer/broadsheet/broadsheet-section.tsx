'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { BroadsheetTable } from '@/components/results/broadsheet-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { collateResults } from '@/lib/actions/results';
import { RESULT_STAGE_BADGE, RESULT_STAGE_LABELS } from '@/lib/result-stage-labels';
import type { ResultStatusDto, StudentBroadsheetRowDto } from '@/lib/types/results';

const COLLATABLE_STAGES = new Set(['SCORES_IN_PROGRESS', 'RETURNED']);

export function BroadsheetSection({
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
  const [isCollating, setIsCollating] = useState(false);

  async function handleSendForApproval() {
    setIsCollating(true);
    try {
      await collateResults(armId, termId);
      toast.success('Sent for approval.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send for approval.");
    } finally {
      setIsCollating(false);
    }
  }

  const canCollate = COLLATABLE_STAGES.has(status.stage);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CardTitle>Broadsheet</CardTitle>
          <Badge variant={RESULT_STAGE_BADGE[status.stage]}>{RESULT_STAGE_LABELS[status.stage]}</Badge>
        </div>
        {canCollate && (
          <CardAction>
            <Button
              onClick={handleSendForApproval}
              disabled={!status.allSubjectsLocked || isCollating}
              title={
                !status.allSubjectsLocked
                  ? 'Every subject must be submitted and locked first'
                  : undefined
              }
            >
              {isCollating ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Sending…
                </>
              ) : (
                'Send for Approval'
              )}
            </Button>
          </CardAction>
        )}
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
          <BroadsheetTable rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}
