'use client';

import { CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import type { BookDto, ReservationDto, ReservationStatus } from '@/lib/types/library';
import { NewReservationDialog } from './new-reservation-dialog';

const STATUS_BADGE: Record<ReservationStatus, 'warning' | 'success' | 'outline' | 'error'> = {
  WAITING: 'warning',
  AVAILABLE: 'success',
  FULFILLED: 'outline',
  CANCELLED: 'error',
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  WAITING: 'Waiting',
  AVAILABLE: 'Available',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
};

export function ReservationsView({
  reservations,
  books,
}: {
  reservations: ReservationDto[];
  books: BookDto[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewReservationDialog books={books} />
      </div>

      {reservations.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarClock />
            </EmptyMedia>
            <EmptyTitle>No reservations</EmptyTitle>
            <EmptyDescription>
              Reserve a currently-checked-out title for a member — they&apos;re notified the moment
              it&apos;s returned.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {reservations.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-foreground">{r.bookTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.borrowerName} ({r.borrowerType === 'STUDENT' ? 'Student' : 'Staff'}) ·
                    reserved {new Date(r.reservedAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
