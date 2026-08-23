'use client';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { searchMembers } from '@/lib/actions/library';
import type { MemberSearchRow } from '@/lib/types/library';

const DEBOUNCE_MS = 250;

/** Search-as-you-type for a student or staff borrower — a phone camera or USB barcode scanner that types into this focused input works too, no camera-access code needed (see Stage 24's frontend prompt). */
export function MemberSearchBox({
  onSelect,
  placeholder = 'Search by name or ID…',
}: {
  onSelect: (member: MemberSearchRow) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberSearchRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();
    const timer = setTimeout(() => {
      if (trimmed.length < 2) {
        if (!cancelled) setResults([]);
        return;
      }
      void searchMembers(trimmed).then((rows) => {
        if (!cancelled) setResults(rows);
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-8"
          aria-label={placeholder}
        />
      </div>
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-card shadow-md">
          {results.map((r) => (
            <li key={`${r.borrowerType}-${r.borrowerId}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setQuery('');
                  setResults([]);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                {r.name}{' '}
                <span className="text-xs text-muted-foreground">
                  ({r.borrowerType === 'STUDENT' ? 'Student' : 'Staff'} · {r.identifier})
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
