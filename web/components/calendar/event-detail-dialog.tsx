'use client';

import { Loader2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDeleteButton } from '@/components/dashboard/confirm-delete-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteEvent, getEvent, getEventRsvps, rsvpToEvent } from '@/lib/actions/calendar';
import type { EventRsvpRespondentDto, EventRsvpResponse, EventWithTallyDto } from '@/lib/types/calendar';

const RESPONSE_LABELS: Record<EventRsvpResponse, string> = {
  YES: 'Going',
  NO: "Can't go",
  MAYBE: 'Maybe',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EventDetailDialog({
  eventId,
  open,
  onOpenChange,
  canRsvp,
  canManage,
  isStaff,
  isUnscopedRsvpViewer,
  viewerStaffId,
  onDeleted,
}: {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canRsvp: boolean;
  /** ADMIN/VICE_PRINCIPAL — same role gate as event creation, so whoever can create can also delete. */
  canManage: boolean;
  /** Only staff can view the named respondent list at all — guardians can RSVP but never see who else responded. */
  isStaff: boolean;
  /** ADMIN/VICE_PRINCIPAL can view any event's respondents, not just ones they organized. */
  isUnscopedRsvpViewer: boolean;
  viewerStaffId?: string;
  onDeleted?: () => void;
}) {
  const [event, setEvent] = useState<EventWithTallyDto | null>(null);
  const [respondents, setRespondents] = useState<EventRsvpRespondentDto[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResponding, setIsResponding] = useState(false);
  const [isLoadingRespondents, setIsLoadingRespondents] = useState(false);

  // The parent (DayPanel) only mounts this component once an event is
  // selected and unmounts it on close, so a fresh fetch per `eventId`
  // mount is exactly "load once when opened" without needing to gate on
  // `open` here too.
  useEffect(() => {
    getEvent(eventId)
      .then(setEvent)
      .catch(() => toast.error("Couldn't load this event."))
      .finally(() => setIsLoading(false));
  }, [eventId]);

  async function respond(response: EventRsvpResponse) {
    setIsResponding(true);
    try {
      await rsvpToEvent(eventId, { response });
      const updated = await getEvent(eventId);
      setEvent(updated);
      toast.success('Response recorded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not record your response.');
    } finally {
      setIsResponding(false);
    }
  }

  async function loadRespondents() {
    setIsLoadingRespondents(true);
    try {
      setRespondents(await getEventRsvps(eventId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't load respondents.");
    } finally {
      setIsLoadingRespondents(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {isLoading || !event ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
              <DialogDescription>
                <Badge variant="info" className="mr-2">
                  {event.category}
                </Badge>
                {formatDateTime(event.startDate)}
                {event.endDate ? ` — ${formatDateTime(event.endDate)}` : ''}
              </DialogDescription>
            </DialogHeader>

            {event.description && <p className="text-sm text-foreground">{event.description}</p>}

            {event.rsvpEnabled && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">RSVP</p>
                  <p className="text-xs text-muted-foreground">
                    {event.rsvpTally.yes} going &middot; {event.rsvpTally.maybe} maybe &middot;{' '}
                    {event.rsvpTally.no} can&apos;t go
                  </p>
                </div>
                {canRsvp && (
                  <div className="flex flex-wrap gap-2">
                    {(['YES', 'MAYBE', 'NO'] as EventRsvpResponse[]).map((r) => (
                      <Button
                        key={r}
                        type="button"
                        size="sm"
                        variant={event.myResponse === r ? 'default' : 'outline'}
                        disabled={isResponding}
                        onClick={() => respond(r)}
                      >
                        {RESPONSE_LABELS[r]}
                      </Button>
                    ))}
                  </div>
                )}
                {isStaff && (isUnscopedRsvpViewer || event.createdByStaffId === viewerStaffId) && (
                  <div className="space-y-2 border-t border-border pt-2">
                    {respondents === null ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isLoadingRespondents}
                        onClick={loadRespondents}
                      >
                        {isLoadingRespondents ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Users className="size-3.5" aria-hidden="true" />
                        )}
                        View respondents
                      </Button>
                    ) : respondents.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No responses yet.</p>
                    ) : (
                      <ul className="max-h-40 space-y-1 overflow-y-auto text-sm">
                        {respondents.map((r) => (
                          <li key={r.id} className="flex items-center justify-between">
                            <span>{r.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {RESPONSE_LABELS[r.response]}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {canManage && (
              <div className="border-t border-border pt-3">
                <ConfirmDeleteButton
                  itemLabel={event.title}
                  description="This removes the event from everyone's calendar. This can't be undone."
                  onConfirm={async () => {
                    await deleteEvent(eventId);
                    onOpenChange(false);
                    onDeleted?.();
                  }}
                  triggerRender={
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      Delete event
                    </Button>
                  }
                />
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
