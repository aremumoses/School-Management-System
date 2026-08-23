'use client';

import { ExternalLink, FolderOpen, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { deleteResource } from '@/lib/actions/resources';
import { RESOURCE_TYPE_ICONS, RESOURCE_TYPE_LABELS } from '@/lib/resource-type-labels';
import type { ResourceDto } from '@/lib/types/resources';

function ResourceRow({ resource }: { resource: ResourceDto }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const Icon = RESOURCE_TYPE_ICONS[resource.type];
  const href = resource.externalUrl ?? resource.fileUrl;

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteResource(resource.id);
      toast.success('Resource removed.');
      router.refresh();
    } catch {
      toast.error("Couldn't remove the resource.");
      setIsDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="size-4 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{resource.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {resource.subject.name} · {resource.class.name}
              {resource.topic ? ` · ${resource.topic}` : ''}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline">{RESOURCE_TYPE_LABELS[resource.type]}</Badge>
          {href && (
            <Button
              size="sm"
              variant="ghost"
              render={<a href={href} target="_blank" rel="noreferrer" />}
              aria-label={`Open ${resource.title}`}
            >
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            aria-label={`Delete ${resource.title}`}
          >
            {isDeleting ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-3.5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ResourcesList({ resources }: { resources: ResourceDto[] }) {
  if (resources.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen />
          </EmptyMedia>
          <EmptyTitle>Nothing shared yet</EmptyTitle>
          <EmptyDescription>
            Share notes, slides, past questions, or a video link with one of your classes.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-2">
      {resources.map((resource) => (
        <ResourceRow key={resource.id} resource={resource} />
      ))}
    </div>
  );
}
