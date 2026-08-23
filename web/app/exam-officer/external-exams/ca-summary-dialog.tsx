'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getCaSummary } from '@/lib/actions/exam-logistics';
import type { CaSummaryDto } from '@/lib/types/exam-logistics';

export function CaSummaryDialog({
  studentId,
  studentLabel,
  onClose,
}: {
  studentId: string;
  studentLabel: string;
  onClose: () => void;
}) {
  const [summary, setSummary] = useState<CaSummaryDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setTimeout(() => {
      void getCaSummary(studentId)
        .then((data) => {
          if (!cancelled) setSummary(data);
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Couldn't load the CA summary.");
          }
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, 0);
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>CA Summary — {studentLabel}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="py-8 text-center text-sm text-error-soft-foreground">{error}</p>
        ) : summary ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{summary.termName} term</p>
            {summary.subjects.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No scores recorded yet.
              </p>
            ) : (
              summary.subjects.map((subject) => (
                <div key={subject.subjectName} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">{subject.subjectName}</p>
                    <Badge variant="outline">
                      {subject.total.toFixed(1)}% ({subject.grade})
                    </Badge>
                  </div>
                  <ul className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
                    {subject.components.map((c) => (
                      <li key={c.name}>
                        {c.name}: {c.score ?? '—'} / {c.maxScore} ({c.weight}% weight)
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
