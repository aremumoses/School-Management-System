'use client';

import { AlertTriangle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getPromotionSuggestions, promoteStudent } from '@/lib/actions/results';
import type { AcademicSessionDto } from '@/lib/types/academic';
import type { PromotionSuggestionDto } from '@/lib/types/results';

const OUTCOME_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'outline'> = {
  PROMOTED: 'success',
  GRADUATED: 'success',
  REPEATED: 'warning',
};

export function PromotionWizard({
  sessions,
}: {
  sessions: AcademicSessionDto[];
}) {
  const [sessionId, setSessionId] = useState(
    sessions.find((s) => s.terms.some((t) => t.isCurrent))?.id ?? sessions[0]?.id ?? '',
  );
  const [suggestions, setSuggestions] = useState<PromotionSuggestionDto[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [committed, setCommitted] = useState(false);

  async function handlePreview() {
    if (!sessionId) return;
    setIsLoading(true);
    setSuggestions(null);
    try {
      // nextClassIdMap: empty = backend figures out promotion based on class ordering
      const results = await getPromotionSuggestions(sessionId, { threshold: 40 });
      setSuggestions(results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate suggestions.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCommit() {
    if (!suggestions) return;
    setIsCommitting(true);
    try {
      let promoted = 0;
      let failed = 0;
      for (const s of suggestions) {
        if (!s.suggestedOutcome) continue;
        try {
          await promoteStudent(s.studentId, {
            outcome: s.suggestedOutcome,
            currentEnrollmentId: s.currentEnrollmentId,
          });
          promoted++;
        } catch {
          failed++;
        }
      }
      setCommitted(true);
      if (failed > 0) {
        toast.warning(`${promoted} promoted, ${failed} failed.`);
      } else {
        toast.success(`${promoted} student${promoted === 1 ? '' : 's'} promoted successfully.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Promotion failed.');
    } finally {
      setIsCommitting(false);
    }
  }

  if (committed) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-4 py-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-success-soft">
            <CheckCircle2 className="size-6 text-success-soft-foreground" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Promotion complete</h2>
            <p className="text-sm text-muted-foreground">
              Student enrollments have been updated. Report cards and results remain intact.
            </p>
          </div>
          <Button variant="outline" onClick={() => { setSuggestions(null); setCommitted(false); }}>
            Run Another Session
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Pick session */}
      <Card>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="sessionId">
              Academic Session to promote from
            </label>
            <select
              id="sessionId"
              value={sessionId}
              onChange={(e) => { setSessionId(e.target.value); setSuggestions(null); setCommitted(false); }}
              className="w-full max-w-xs rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <Button onClick={() => void handlePreview()} disabled={isLoading || !sessionId}>
            {isLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Generating suggestions…
              </>
            ) : (
              'Preview Promotion Outcomes'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Review suggestions */}
      {suggestions && (
        <div className="space-y-4">
          {suggestions.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              No students found in this session with a deterministic promotion outcome.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {suggestions.length} student{suggestions.length === 1 ? '' : 's'} —{' '}
                  {suggestions.filter((s) => s.suggestedOutcome === 'PROMOTED').length} to promote,{' '}
                  {suggestions.filter((s) => s.suggestedOutcome === 'REPEATED').length} to repeat,{' '}
                  {suggestions.filter((s) => s.suggestedOutcome === 'GRADUATED').length} to graduate
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void handlePreview()}
                  disabled={isLoading}
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  Refresh
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Admission No.</TableHead>
                        <TableHead>Current Class</TableHead>
                        <TableHead>Avg</TableHead>
                        <TableHead>Suggested Outcome</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestions.map((s) => (
                        <TableRow key={s.studentId}>
                          <TableCell className="font-medium">
                            {s.firstName} {s.lastName}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {s.admissionNumber}
                          </TableCell>
                          <TableCell className="text-sm">
                            {s.currentClassName}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {s.overallAverage != null ? `${s.overallAverage.toFixed(1)}%` : '—'}
                          </TableCell>
                          <TableCell>
                            {s.suggestedOutcome ? (
                              <Badge variant={OUTCOME_VARIANT[s.suggestedOutcome] ?? 'outline'}>
                                {s.suggestedOutcome}
                              </Badge>
                            ) : (
                              <Badge variant="outline">No result</Badge>
                            )}
                          </TableCell>
                          <TableCell className="max-w-xs text-xs text-muted-foreground">
                            {s.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-warning-soft bg-warning-soft px-4 py-3 text-sm text-warning-soft-foreground">
                <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  Confirming updates every student&apos;s enrollment status at once. This action
                  cannot be undone automatically — review carefully before confirming.
                </span>
              </div>

              <AlertDialog>
                <AlertDialogTrigger render={<Button />}>
                  Confirm Promotion for All {suggestions.filter((s) => s.suggestedOutcome).length}{' '}
                  Students
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Apply promotion outcomes?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will update the enrollment status of{' '}
                      {suggestions.filter((s) => s.suggestedOutcome).length} students based on the
                      suggested outcomes above. Results and report cards are not affected. This
                      cannot be undone automatically.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction disabled={isCommitting} onClick={() => void handleCommit()}>
                      {isCommitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          Promoting…
                        </>
                      ) : (
                        'Confirm'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      )}
    </div>
  );
}
