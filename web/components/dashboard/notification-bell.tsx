'use client';

import { Bell, CheckCheck, Megaphone, MessageSquare, Settings2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getNotificationSummary, markAllNotificationsRead } from '@/lib/actions/communication';
import { formatRelativeTime } from '@/lib/format';
import type { NotificationItemDto } from '@/lib/types/communication';
import { cn } from '@/lib/utils';

const POLL_INTERVAL_MS = 30_000;

/**
 * Notification centre — design system §13 / new-design §25.
 *
 * Shared across every dashboard's top bar. Polls a small summary endpoint
 * rather than opening a socket — there's no WebSocket/SSE infra anywhere in
 * this app (see pay-now-button.tsx's identical polling pattern, the only
 * other realtime-ish mechanism here).
 *
 * Marking read is an explicit action, not a side effect of opening the
 * panel. The previous version cleared everything the moment the popover
 * opened, which made the read/unread state it rendered meaningless — you
 * could never come back to something you glanced at. new-design §25 wants both
 * visible plus a deliberate "Mark all read".
 */
export function NotificationBell() {
  const [summary, setSummary] = useState<{ unreadCount: number; items: NotificationItemDto[] }>({
    unreadCount: 0,
    items: [],
  });
  const [open, setOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pathname = usePathname();
  const segment = pathname.split('/')[1] ?? '';

  async function refresh() {
    try {
      const result = await getNotificationSummary();
      setSummary(result);
    } catch {
      // Transient — the next poll tick retries. A failed background refresh
      // shouldn't surface an error toast for something this ambient.
    }
  }

  useEffect(() => {
    // setTimeout(0), not a direct call — the immediate refresh still needs
    // to happen on mount, but deferring it out of the effect's own
    // synchronous execution avoids the cascading-render pattern the
    // react-hooks/set-state-in-effect rule flags a same-tick call as.
    const initial = setTimeout(() => void refresh(), 0);
    pollRef.current = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleMarkAllRead() {
    // Optimistic: the panel is open and the user just clicked, so waiting on
    // a round-trip to grey out the dots would feel broken.
    setSummary((prev) => ({
      unreadCount: 0,
      items: prev.items.map((item) => ({ ...item, read: true })),
    }));
    try {
      await markAllNotificationsRead();
    } catch {
      void refresh();
    }
  }

  const { today, earlier } = splitByDay(summary.items);
  const unread = summary.unreadCount;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="relative text-muted-foreground hover:text-foreground"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          />
        }
      >
        <Bell className="size-[18px]" />
        {unread > 0 && (
          // A count, not a bare dot: "how many" is the first thing anyone
          // wants from this control, and it also gives the indicator a
          // non-colour cue per §14.
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground tabular-nums ring-2 ring-card"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[22rem] p-0 shadow-lg">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {unread > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">{unread} unread</span>
            )}
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={() => void handleMarkAllRead()}
              className="text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {summary.items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
              <Bell className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              New messages and announcements will land here.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[26rem]">
            <div className="flex flex-col pb-1">
              {today.length > 0 && <SectionLabel>Today</SectionLabel>}
              {today.map((item) => (
                <NotificationRow
                  key={`${item.type}-${item.id}`}
                  item={item}
                  messagesHref={`/${segment}/messages`}
                  onNavigate={() => setOpen(false)}
                />
              ))}
              {earlier.length > 0 && <SectionLabel>Earlier</SectionLabel>}
              {earlier.map((item) => (
                <NotificationRow
                  key={`${item.type}-${item.id}`}
                  item={item}
                  messagesHref={`/${segment}/messages`}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="border-t border-border px-3 py-2">
          <Link
            href={`/${segment}/notices`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Settings2 className="size-3.5" aria-hidden="true" />
            All notices &amp; preferences
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="sticky top-0 z-10 bg-popover px-3 pt-2.5 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/** Design system §13 groups the panel into Today / Earlier, not one undated list. */
function splitByDay(items: NotificationItemDto[]) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today: NotificationItemDto[] = [];
  const earlier: NotificationItemDto[] = [];
  for (const item of items) {
    (new Date(item.createdAt) >= startOfToday ? today : earlier).push(item);
  }
  return { today, earlier };
}

function NotificationRow({
  item,
  messagesHref,
  onNavigate,
}: {
  item: NotificationItemDto;
  messagesHref: string;
  onNavigate: () => void;
}) {
  const Icon = item.type === 'MESSAGE' ? MessageSquare : Megaphone;
  const content = (
    <div
      className={cn(
        'flex items-start gap-2.5 px-3 py-2.5 transition-colors duration-[--duration-fast]',
        !item.read && 'bg-primary/[0.06]',
        item.type === 'MESSAGE' && 'hover:bg-accent',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full',
          item.read ? 'bg-muted text-muted-foreground' : 'bg-stat-violet text-stat-violet-foreground',
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              'truncate text-sm text-foreground',
              item.read ? 'font-normal' : 'font-semibold',
            )}
          >
            {item.title}
          </p>
          {!item.read && (
            // --accent is a neutral structural slot, so the old bg-accent dot
            // rendered as invisible grey-on-grey. The unread marker has to be
            // the brand colour to read as a state at all.
            <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true">
              <span className="sr-only">Unread</span>
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-xs text-muted-foreground">{item.preview}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground/80">
          {formatRelativeTime(item.createdAt)}
        </p>
      </div>
    </div>
  );

  if (item.type === 'MESSAGE' && item.conversationId) {
    return (
      <Link href={`${messagesHref}?conversation=${item.conversationId}`} onClick={onNavigate}>
        {content}
      </Link>
    );
  }
  return content;
}
