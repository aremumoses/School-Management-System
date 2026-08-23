'use client';

import { Megaphone } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatRelativeTime } from '@/lib/format';
import type { NoticeDto } from '@/lib/types/communication';

/** docs/16-module-communication.md §9 — the persistent, browsable notice board, shared across every role's `/[role]/notices` page. */
export function NoticeBoard({ notices }: { notices: NoticeDto[] }) {
  const [category, setCategory] = useState<string>('all');
  const [selected, setSelected] = useState<NoticeDto | null>(null);

  const categories = useMemo(
    () => [...new Set(notices.map((n) => n.category))].sort(),
    [notices],
  );
  const filtered =
    category === 'all' ? notices : notices.filter((n) => n.category === category);

  if (notices.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Megaphone />
          </EmptyMedia>
          <EmptyTitle>No notices yet</EmptyTitle>
          <EmptyDescription>Check back later for school announcements.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {categories.length > 1 && (
        <Select
          value={category}
          onValueChange={(v) => v && setCategory(v)}
          items={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="space-y-3">
        {filtered.map((notice) => (
          <Card
            key={notice.id}
            className="cursor-pointer transition-colors hover:bg-muted/40"
            onClick={() => setSelected(notice)}
          >
            <CardContent className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-foreground">{notice.title}</h3>
                <Badge variant="info" className="shrink-0">
                  {notice.category}
                </Badge>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{notice.body}</p>
              <p className="text-xs text-muted-foreground/80">
                {formatRelativeTime(notice.createdAt)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{selected.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeTime(selected.createdAt)}
                  </span>
                </div>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription className="sr-only">Notice detail</DialogDescription>
              </DialogHeader>
              <p className="whitespace-pre-wrap text-sm text-foreground">{selected.body}</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
