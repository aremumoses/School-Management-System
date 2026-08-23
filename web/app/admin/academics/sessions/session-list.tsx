'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AcademicSessionDto } from '@/lib/types/academic';
import { cn } from '@/lib/utils';
import { SetCurrentTermButton } from './set-current-term-button';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function SessionList({ sessions }: { sessions: AcademicSessionDto[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(sessions[0]?.id ?? null);

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const isExpanded = expandedId === session.id;
        const currentTerm = session.terms.find((t) => t.isCurrent);

        return (
          <Card key={session.id}>
            <CardHeader
              role="button"
              tabIndex={0}
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedId(isExpanded ? null : session.id);
                }
              }}
              className="cursor-pointer flex-row items-center justify-between space-y-0"
            >
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">{session.name}</CardTitle>
                {currentTerm && (
                  <Badge variant="success">{currentTerm.name} term is current</Badge>
                )}
              </div>
              <ChevronDown
                className={cn('size-5 text-muted-foreground transition-transform', isExpanded && 'rotate-180')}
                aria-hidden="true"
              />
            </CardHeader>
            {isExpanded && (
              <CardContent className="space-y-2">
                {session.terms.map((term) => (
                  <div
                    key={term.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-foreground">{term.name} Term</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(term.startDate)} – {formatDate(term.endDate)}
                      </p>
                      {term.isCurrent && <Badge variant="success">Current</Badge>}
                    </div>
                    <SetCurrentTermButton term={term} sessionName={session.name} />
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
