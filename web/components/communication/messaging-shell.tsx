'use client';

import { MessageSquare } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ConversationList } from '@/components/communication/conversation-list';
import { NewConversationButton } from '@/components/communication/new-conversation-button';
import { NewTeacherConversationButton } from '@/components/communication/new-teacher-conversation-button';
import { ThreadView } from '@/components/communication/thread-view';
import { listConversations } from '@/lib/actions/communication';
import type {
  ConversationListItemDto,
  MyTeacherDto,
  SenderType,
} from '@/lib/types/communication';
import { cn } from '@/lib/utils';

const LIST_POLL_INTERVAL_MS = 15_000;

/**
 * Two-pane thread UI shared by /teacher/messages and /parent/messages —
 * frontend prompt §4: mobile-first, full-screen thread + back button below
 * `md`, two-pane side-by-side above it. Selection lives in the URL
 * (`?conversation=`) so the notification bell can deep-link into a
 * specific thread.
 */
export function MessagingShell({
  initialConversations,
  myType,
  studentOptions,
  teacherOptions,
}: {
  initialConversations: ConversationListItemDto[];
  myType: SenderType;
  /** Teacher-side new-thread picker (staff viewers). */
  studentOptions?: { id: string; name: string }[];
  /** Student-side new-thread picker (Stage 15 — their own teachers). */
  teacherOptions?: MyTeacherDto[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('conversation');
  const [conversations, setConversations] = useState(initialConversations);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function refreshList() {
    try {
      setConversations(await listConversations());
    } catch {
      // Transient — next poll tick retries.
    }
  }

  useEffect(() => {
    const initial = setTimeout(() => void refreshList(), 0);
    pollRef.current = setInterval(() => void refreshList(), LIST_POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function select(id: string) {
    router.push(`?conversation=${id}`, { scroll: false });
  }

  function back() {
    router.push('?', { scroll: false });
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[28rem] gap-4">
      <div
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-lg border border-border md:w-80 md:shrink-0',
          selectedId ? 'hidden md:flex' : 'flex',
        )}
      >
        {(studentOptions || teacherOptions) && (
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <span className="text-sm font-semibold text-foreground">Conversations</span>
            {studentOptions && (
              <NewConversationButton studentOptions={studentOptions} onCreated={select} />
            )}
            {teacherOptions && (
              <NewTeacherConversationButton teacherOptions={teacherOptions} onCreated={select} />
            )}
          </div>
        )}
        <ConversationList
          conversations={conversations}
          myType={myType}
          selectedId={selectedId}
          onSelect={select}
        />
      </div>

      <div
        className={cn(
          'w-full overflow-hidden rounded-lg border border-border',
          selectedId ? 'flex' : 'hidden md:flex',
        )}
      >
        {selectedId ? (
          <ThreadView
            key={selectedId}
            conversationId={selectedId}
            myType={myType}
            onBack={back}
            onRead={() => void refreshList()}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-muted-foreground">
            <MessageSquare className="size-8" aria-hidden="true" />
            <p className="text-sm">Select a conversation to view it here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
