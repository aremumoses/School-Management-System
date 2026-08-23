'use client';

import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { searchStudents, type StudentSearchRow } from '@/lib/actions/hostel-transport';

const DEBOUNCE_MS = 250;

/** Search-as-you-type for a student — same debounce/dropdown shape as library/member-search-box.tsx. */
export function StudentSearchBox({
  onSelect,
  placeholder = 'Search by name or admission number…',
}: {
  onSelect: (student: StudentSearchRow) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentSearchRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    const trimmed = query.trim();
    const timer = setTimeout(() => {
      if (trimmed.length < 2) {
        if (!cancelled) setResults([]);
        return;
      }
      void searchStudents(trimmed).then((rows) => {
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
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect(s);
                  setQuery('');
                  setResults([]);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50"
              >
                {s.firstName} {s.lastName}{' '}
                <span className="text-xs text-muted-foreground">({s.admissionNumber})</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
