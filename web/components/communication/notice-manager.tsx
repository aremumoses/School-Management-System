'use client';

import { Loader2, Megaphone, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDeleteButton } from '@/components/dashboard/confirm-delete-button';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { createNotice, deleteNotice, updateNotice } from '@/lib/actions/communication';
import { formatRelativeTime } from '@/lib/format';
import type { NoticeDto } from '@/lib/types/communication';

export function NoticeManager({ notices }: { notices: NoticeDto[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Posted to the notice board every role can browse.
        </p>
        <NoticeFormPopover trigger={<Button size="sm"><Plus className="size-4" aria-hidden="true" />New Notice</Button>} />
      </div>

      {notices.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Megaphone />
            </EmptyMedia>
            <EmptyTitle>No notices yet</EmptyTitle>
            <EmptyDescription>Post your first announcement.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {notices.map((notice) => (
            <Card key={notice.id}>
              <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium text-foreground">{notice.title}</h3>
                    <Badge variant="info">{notice.category}</Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{notice.body}</p>
                  <p className="text-xs text-muted-foreground/80">{formatRelativeTime(notice.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <NoticeFormPopover
                    notice={notice}
                    trigger={
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${notice.title}`}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                    }
                  />
                  <ConfirmDeleteButton itemLabel={notice.title} onConfirm={() => deleteNotice(notice.id)} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NoticeFormPopover({
  notice,
  trigger,
}: {
  notice?: NoticeDto;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(notice?.title ?? '');
  const [body, setBody] = useState(notice?.body ?? '');
  const [category, setCategory] = useState(notice?.category ?? 'General');
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!title.trim() || !body.trim() || !category.trim()) {
      toast.error('Title, body, and category are all required.');
      return;
    }
    setIsSaving(true);
    try {
      if (notice) {
        await updateNotice(notice.id, { title, body, category });
        toast.success('Notice updated.');
      } else {
        await createNotice({ title, body, category });
        toast.success('Notice posted.');
        setTitle('');
        setBody('');
        setCategory('General');
      }
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the notice.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={trigger} />
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="notice-title">Title</Label>
            <Input id="notice-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notice-category">Category</Label>
            <Input id="notice-category" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notice-body">Body</Label>
            <Textarea id="notice-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <Button type="button" size="sm" className="w-full" disabled={isSaving} onClick={save}>
            {isSaving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : notice ? 'Save' : 'Post'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
