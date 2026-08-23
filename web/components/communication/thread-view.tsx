'use client';

import { ArrowLeft, Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { addMessage, getConversation } from '@/lib/actions/communication';
import { formatRelativeTime } from '@/lib/format';
import type { ConversationDetailDto, SenderType } from '@/lib/types/communication';
import { cn } from '@/lib/utils';

const POLL_INTERVAL_MS = 10_000;

export function ThreadView({
  conversationId,
  myType,
  onBack,
  onRead,
}: {
  conversationId: string;
  myType: SenderType;
  onBack: () => void;
  onRead: () => void;
}) {
  const [conversation, setConversation] = useState<ConversationDetailDto | null>(null);
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  async function refresh() {
    try {
      const result = await getConversation(conversationId);
      setConversation(result);
      onRead();
    } catch {
      // Transient — next poll tick retries.
    }
  }

  useEffect(() => {
    // No need to reset `conversation` to null here — the parent renders
    // this component with `key={selectedId}` (see messaging-shell.tsx),
    // so switching conversations remounts this component entirely rather
    // than reusing it with a stale `conversation` value.
    const initial = setTimeout(() => void refresh(), 0);
    pollRef.current = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh closes over conversationId via the outer scope; re-running on conversationId change is exactly what's wanted, and including `refresh` itself would re-create the interval every render.
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages.length]);

  async function handleSend() {
    if (!body.trim()) return;
    setIsSending(true);
    try {
      await addMessage(conversationId, { body });
      setBody('');
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't send your message.");
    } finally {
      setIsSending(false);
    }
  }

  // The other party: staff for guardian/student viewers; for a staff
  // viewer, the guardian on a guardian thread, else the student on a
  // direct (guardianName-null) thread.
  const otherPartyName = conversation
    ? myType === 'GUARDIAN' || myType === 'STUDENT'
      ? conversation.staffName
      : (conversation.guardianName ?? conversation.studentName)
    : '';
  const subLabel = conversation
    ? myType === 'STUDENT'
      ? 'Direct message'
      : conversation.guardianName === null
        ? 'Direct student thread'
        : `Re: ${conversation.studentName}`
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Back to conversations" onClick={onBack}>
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{otherPartyName || '…'}</p>
          {subLabel && (
            <p className="truncate text-xs text-muted-foreground">{subLabel}</p>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-2 p-3">
          {conversation?.messages.map((message) => {
            const mine = message.senderType === myType;
            return (
              <div
                key={message.id}
                className={cn('flex flex-col', mine ? 'items-end self-end' : 'items-start self-start')}
              >
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap',
                    mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
                  )}
                >
                  {message.body}
                </div>
                <span className="mt-0.5 text-xs text-muted-foreground/80">
                  {formatRelativeTime(message.createdAt)}
                </span>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <div className="flex items-end gap-2 border-t border-border p-3">
        <Textarea
          rows={1}
          placeholder="Type a message…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          className="min-h-10"
        />
        <Button size="icon" disabled={isSending || !body.trim()} onClick={handleSend} aria-label="Send message">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
}
