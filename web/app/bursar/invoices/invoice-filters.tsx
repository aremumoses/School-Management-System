'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_OPTIONS = [
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
  { value: 'PAID', label: 'Paid' },
];

export interface TermFilterOption {
  id: string;
  label: string;
  isCurrent: boolean;
}

export function InvoiceFilters({
  terms,
  selectedTermId,
  selectedStatus,
}: {
  terms: TermFilterOption[];
  selectedTermId?: string;
  selectedStatus?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label>Term</Label>
        <Select
          value={selectedTermId}
          onValueChange={(v) => update('termId', v)}
          items={terms.map((t) => ({ value: t.id, label: t.label }))}
        >
          <SelectTrigger className="w-56" aria-label="Filter by term">
            <SelectValue placeholder="Choose a term" />
          </SelectTrigger>
          <SelectContent>
            {terms.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.label}
                {t.isCurrent ? ' (current)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select
          value={selectedStatus ?? ''}
          onValueChange={(v) => update('status', v || null)}
          items={[{ value: '', label: 'All statuses' }, ...STATUS_OPTIONS]}
        >
          <SelectTrigger className="w-44" aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
