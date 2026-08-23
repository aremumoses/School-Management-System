'use client';

import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { entryKind, ENTRY_BADGE_VARIANT, ENTRY_KIND_LABEL } from '@/components/calendar/entry-style';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { CalendarEntryDto } from '@/lib/types/calendar';
import { EventDetailDialog } from './event-detail-dialog';

function formatDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function DayPanel({
  selectedDate,
  entries,
  canRsvp,
  canManage,
  isStaff,
  isUnscopedRsvpViewer,
  viewerStaffId,
  onEventDeleted,
}: {
  selectedDate: string;
  entries: CalendarEntryDto[];
  canRsvp: boolean;
  canManage: boolean;
  isStaff: boolean;
  isUnscopedRsvpViewer: boolean;
  viewerStaffId?: string;
  onEventDeleted?: () => void;
}) {
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatDay(selectedDate)}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <Empty className="border-0 p-0">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays />
              </EmptyMedia>
              <EmptyTitle>Nothing on this day</EmptyTitle>
              <EmptyDescription>No term dates, holidays, or events.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => {
              const kind = entryKind(entry);
              const clickable = entry.type === 'EVENT';
              return (
                <li key={`${entry.type}-${entry.id}`}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && setOpenEventId(entry.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-border p-3 text-left disabled:cursor-default enabled:hover:bg-accent/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{entry.title}</p>
                      {entry.type === 'EVENT' && entry.rsvpEnabled && (
                        <p className="text-xs text-muted-foreground">RSVP enabled</p>
                      )}
                    </div>
                    <Badge variant={ENTRY_BADGE_VARIANT[kind]}>{ENTRY_KIND_LABEL[kind]}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      {openEventId && (
        <EventDetailDialog
          eventId={openEventId}
          open={openEventId !== null}
          onOpenChange={(open) => !open && setOpenEventId(null)}
          canRsvp={canRsvp}
          canManage={canManage}
          isStaff={isStaff}
          isUnscopedRsvpViewer={isUnscopedRsvpViewer}
          viewerStaffId={viewerStaffId}
          onDeleted={onEventDeleted}
        />
      )}
    </Card>
  );
}
