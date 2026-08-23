'use client';

import { Award, ExternalLink, GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getStaffTrainingHistory } from '@/lib/actions/training';
import type { TrainingRecordDto } from '@/lib/types/training';
import type { StaffDto } from '@/lib/types/staff';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function StaffTrainingHistory({
  staff,
  staffId,
  onStaffIdChange,
}: {
  staff: StaffDto[];
  staffId: string;
  onStaffIdChange: (id: string) => void;
}) {
  const [records, setRecords] = useState<TrainingRecordDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!staffId) {
        if (!cancelled) setRecords([]);
        return;
      }
      if (!cancelled) setIsLoading(true);
      void getStaffTrainingHistory(staffId).then((rows) => {
        if (!cancelled) {
          setRecords(rows);
          setIsLoading(false);
        }
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [staffId]);

  const options = staff.map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName}` }));

  return (
    <div className="space-y-4">
      <Select value={staffId} onValueChange={(v) => v && onStaffIdChange(v)} items={options}>
        <SelectTrigger className="w-full sm:w-80">
          <SelectValue placeholder="Select a staff member to view their history" />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!staffId ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <GraduationCap />
            </EmptyMedia>
            <EmptyTitle>Select a staff member</EmptyTitle>
            <EmptyDescription>Their training history will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : records.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Award />
            </EmptyMedia>
            <EmptyTitle>No training records yet</EmptyTitle>
            <EmptyDescription>Log one above.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {records.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <p className="text-sm font-medium text-foreground">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.provider} · {formatDate(r.completedDate)}
                  {r.hoursOrCredits != null && ` · ${r.hoursOrCredits} hrs/credits`}
                </p>
              </div>
              {r.certificateUrl && (
                <a
                  href={r.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  Certificate
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
