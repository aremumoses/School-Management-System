import { ExternalLink, LibraryBig } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
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
import { listResources } from '@/lib/actions/resources';
import { RESOURCE_TYPE_ICONS, RESOURCE_TYPE_LABELS } from '@/lib/resource-type-labels';
import type { ResourceType } from '@/lib/types/resources';
import { LibraryFilters } from './library-filters';

export default async function StudentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ subjectId?: string; type?: string; search?: string }>;
}) {
  const params = await searchParams;
  const type = ['NOTE', 'SLIDES', 'PAST_QUESTION', 'VIDEO_LINK'].includes(params.type ?? '')
    ? (params.type as ResourceType)
    : undefined;

  // The API scopes this to the student's own class server-side.
  const resources = await listResources({
    subjectId: params.subjectId,
    type,
    search: params.search,
  });

  // Subject filter options come from the catalog itself — only subjects
  // that actually have resources for this class.
  const allForSubjects = params.subjectId || type || params.search
    ? await listResources({})
    : resources;
  const subjectOptions = [
    ...new Map(allForSubjects.map((r) => [r.subject.id, r.subject])).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-Library"
        description="Notes, slides, past questions, and videos your teachers have shared with your class."
      />

      <LibraryFilters
        subjects={subjectOptions}
        selectedSubjectId={params.subjectId}
        selectedType={type}
        search={params.search}
      />

      {resources.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LibraryBig />
            </EmptyMedia>
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyDescription>
              {params.search || params.subjectId || type
                ? 'No resources match your filters — try clearing them.'
                : 'Your teachers haven’t shared any resources with your class yet.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const Icon = RESOURCE_TYPE_ICONS[resource.type];
            const href = resource.externalUrl ?? resource.fileUrl;
            return (
              <Card key={resource.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-3 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="size-5 text-primary" aria-hidden="true" />
                    </div>
                    <Badge variant="outline">{RESOURCE_TYPE_LABELS[resource.type]}</Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{resource.title}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge variant="info" className="text-xs">
                        {resource.subject.name}
                      </Badge>
                      {resource.topic && (
                        <Badge variant="outline" className="text-xs">
                          {resource.topic}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {resource.uploadedBy.firstName} {resource.uploadedBy.lastName}
                    </p>
                  </div>
                  {href && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      render={<a href={href} target="_blank" rel="noreferrer" />}
                    >
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                      {resource.type === 'VIDEO_LINK' ? 'Watch' : 'Open / Download'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
