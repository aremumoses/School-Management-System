'use client';

import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatRelativeTime } from '@/lib/format';
import type { ConversationListItemDto, SenderType } from '@/lib/types/communication';
import { cn } from '@/lib/utils';

export function ConversationList({
  conversations,
  myType,
  selectedId,
  onSelect,
}: {
  conversations: ConversationListItemDto[];
  myType: SenderType;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageSquare />
          </EmptyMedia>
          <EmptyTitle>No conversations yet</EmptyTitle>
          <EmptyDescription>
            {myType === 'GUARDIAN'
              ? "When a teacher messages you, it'll show up here."
              : myType === 'STUDENT'
                ? 'Start a thread with one of your teachers to see it here.'
                : 'Start a thread with a parent to see it here.'}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {conversations.map((c) => {
          // The other party: staff for guardian/student viewers; for a
          // staff viewer, the guardian on a guardian thread, else the
          // student on a direct (guardianName-null) thread.
          const otherName =
            myType === 'GUARDIAN' || myType === 'STUDENT'
              ? c.staffName
              : (c.guardianName ?? c.studentName);
          const active = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                'flex flex-col gap-0.5 border-b border-border px-3 py-3 text-left transition-colors hover:bg-muted/60',
                active && 'bg-primary/10',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-foreground">{otherName}</span>
                {c.lastMessage && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatRelativeTime(c.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <span className="truncate text-xs text-muted-foreground">
                {myType === 'STUDENT'
                  ? 'Direct message'
                  : c.guardianName === null
                    ? 'Direct student thread'
                    : `Re: ${c.studentName}`}
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">
                  {c.lastMessage?.body ?? 'No messages yet'}
                </span>
                {c.unreadCount > 0 && (
                  <Badge variant="default" className="shrink-0 rounded-full px-1.5">
                    {c.unreadCount}
                  </Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
