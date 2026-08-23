'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateCandidateStage } from '@/lib/actions/hr';
import type { CandidateDto, CandidateStage } from '@/lib/types/hr';
import { CandidateStageBadge } from './candidate-stage-badge';
import { ConvertCandidateDialog } from './convert-candidate-dialog';

const STAGES: CandidateStage[] = [
  'APPLIED',
  'SHORTLISTED',
  'INTERVIEWED',
  'OFFERED',
  'HIRED',
  'REJECTED',
];

const STAGE_LABELS: Record<CandidateStage, string> = {
  APPLIED: 'Applied',
  SHORTLISTED: 'Shortlisted',
  INTERVIEWED: 'Interviewed',
  OFFERED: 'Offered',
  HIRED: 'Hired',
  REJECTED: 'Rejected',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function CandidatePipeline({ candidates }: { candidates: CandidateDto[] }) {
  const router = useRouter();

  async function handleStageChange(id: string, stage: CandidateStage) {
    try {
      await updateCandidateStage(id, { stage });
      toast.success('Stage updated.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update stage.");
    }
  }

  if (candidates.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No applications yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {candidates.map((c) => (
        <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="font-medium text-foreground">{c.name}</p>
            <p className="text-xs text-muted-foreground">
              {c.email} · Applied {formatDate(c.appliedAt)}
            </p>
            {c.resumeUrl && (
              <a
                href={c.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                View resume
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            {c.convertedStaffId ? (
              <CandidateStageBadge stage={c.stage} />
            ) : (
              <Select
                value={c.stage}
                onValueChange={(v) => v && handleStageChange(c.id, v as CandidateStage)}
                items={STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] }))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {c.stage === 'HIRED' &&
              (c.convertedStaffId ? (
                <span className="text-xs text-success-soft-foreground">Converted to staff</span>
              ) : (
                <ConvertCandidateDialog candidateId={c.id} candidateName={c.name} />
              ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
