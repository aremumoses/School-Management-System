'use client';

import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  SALARIES: 'Salaries',
  UTILITIES: 'Utilities',
  MAINTENANCE: 'Maintenance',
  SUPPLIES: 'Supplies',
  OTHER: 'Other',
};

const CATEGORY_OPTIONS = Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export function ExpenseFilters({
  from,
  to,
  category,
}: {
  from?: string;
  to?: string;
  category?: string;
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

  const hasFilter = Boolean(from || to || category);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select
          value={category ?? ''}
          onValueChange={(v) => update('category', v || null)}
          items={[{ value: '', label: 'All categories' }, ...CATEGORY_OPTIONS]}
        >
          <SelectTrigger className="w-44" aria-label="Filter by category">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All categories</SelectItem>
            {CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="from-filter">From</Label>
        <Input
          id="from-filter"
          type="date"
          value={from ?? ''}
          onChange={(e) => update('from', e.target.value || null)}
          className="w-40"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="to-filter">To</Label>
        <Input
          id="to-filter"
          type="date"
          value={to ?? ''}
          onChange={(e) => update('to', e.target.value || null)}
          className="w-40"
        />
      </div>
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <X className="size-4" aria-hidden="true" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
