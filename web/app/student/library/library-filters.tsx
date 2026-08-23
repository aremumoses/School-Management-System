'use client';

import { Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RESOURCE_TYPE_LABELS } from '@/lib/resource-type-labels';
import type { ResourceType } from '@/lib/types/resources';

const TYPE_OPTIONS = (Object.keys(RESOURCE_TYPE_LABELS) as ResourceType[]).map((value) => ({
  value,
  label: RESOURCE_TYPE_LABELS[value],
}));

export function LibraryFilters({
  subjects,
  selectedSubjectId,
  selectedType,
  search,
}: {
  subjects: { id: string; name: string }[];
  selectedSubjectId?: string;
  selectedType?: ResourceType;
  search?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState(search ?? '');

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilter = Boolean(selectedSubjectId || selectedType || search);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update('search', searchText.trim() || null);
        }}
        className="flex min-w-48 flex-1 items-center gap-2 sm:max-w-xs"
      >
        <Input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search title or topic…"
          aria-label="Search resources"
        />
        <Button type="submit" size="icon" variant="outline" aria-label="Search">
          <Search className="size-4" aria-hidden="true" />
        </Button>
      </form>

      <Select
        value={selectedSubjectId ?? ''}
        onValueChange={(v) => update('subjectId', v || null)}
        items={[{ value: '', label: 'All subjects' }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
      >
        <SelectTrigger className="w-44" aria-label="Filter by subject">
          <SelectValue placeholder="All subjects" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All subjects</SelectItem>
          {subjects.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedType ?? ''}
        onValueChange={(v) => update('type', v || null)}
        items={[{ value: '', label: 'All types' }, ...TYPE_OPTIONS]}
      >
        <SelectTrigger className="w-40" aria-label="Filter by type">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">All types</SelectItem>
          {TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <X className="size-4" aria-hidden="true" />
          Clear
        </Button>
      )}
    </div>
  );
}
