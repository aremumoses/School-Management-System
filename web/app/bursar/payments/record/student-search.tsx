'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { StudentDto } from '@/lib/types/students';

export function StudentSearch({
  results,
  search,
  selectedStudentId,
}: {
  results: StudentDto[] | null;
  search?: string;
  selectedStudentId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search ?? '');

  useEffect(() => {
    const handle = setTimeout(() => {
      if (searchInput !== (search ?? '')) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchInput) params.set('search', searchInput);
        else params.delete('search');
        params.delete('studentId');
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 400);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function selectStudent(studentId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('studentId', studentId);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or admission number…"
          className="pl-8"
          autoFocus
          aria-label="Search students"
        />
      </div>

      {results && !selectedStudentId && (
        <Card className="divide-y divide-border p-0">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No students match that search.</p>
          ) : (
            results.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => selectStudent(student.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 focus-visible:outline-none"
              >
                <span className="font-medium text-foreground">
                  {student.firstName} {student.lastName}
                </span>
                <span className="font-mono text-xs text-muted-foreground">{student.admissionNumber}</span>
              </button>
            ))
          )}
        </Card>
      )}
    </div>
  );
}
