'use client';

import { CalendarDays, CalendarRange, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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

/** "1 Sept 2025 – 24 Jul 2026", from the earliest start to the latest end. */
function sessionSpan(session: AcademicSessionDto): string | null {
  if (session.terms.length === 0) return null;
  const start = session.terms.reduce((min, t) => (t.startDate < min ? t.startDate : min), session.terms[0].startDate);
  const end = session.terms.reduce((max, t) => (t.endDate > max ? t.endDate : max), session.terms[0].endDate);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function SessionList({ sessions }: { sessions: AcademicSessionDto[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(sessions[0]?.id ?? null);

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const isExpanded = expandedId === session.id;
        const currentTerm = session.terms.find((t) => t.isCurrent);
        const span = sessionSpan(session);
        const panelId = `session-${session.id}-terms`;

        return (
          <Card key={session.id} className="gap-0 overflow-hidden rounded-xl py-0 ring-0 dark:ring-1">
            <div
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-controls={isExpanded ? panelId : undefined}
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setExpandedId(isExpanded ? null : session.id);
                }
              }}
              className="flex cursor-pointer items-center gap-4 px-6 py-5 transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CalendarRange className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-lg font-semibold text-heading">{session.name}</p>
                  {currentTerm && (
                    <Badge variant="success">{currentTerm.name} term is current</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {session.terms.length} term{session.terms.length === 1 ? '' : 's'}
                  {span ? ` · ${span}` : ''}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  'size-5 shrink-0 text-muted-foreground transition-transform',
                  isExpanded && 'rotate-180',
                )}
                aria-hidden="true"
              />
            </div>

            {isExpanded && (
              <ul id={panelId} className="divide-y divide-border border-t border-border">
                {session.terms.map((term) => (
                  <li
                    key={term.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-full',
                          term.isCurrent
                            ? 'bg-success-soft text-success-soft-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <CalendarDays className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-heading">{term.name} Term</p>
                          {term.isCurrent && <Badge variant="success">Current</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(term.startDate)} – {formatDate(term.endDate)}
                        </p>
                      </div>
                    </div>
                    <SetCurrentTermButton term={term} sessionName={session.name} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
