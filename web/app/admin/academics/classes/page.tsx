import { LayoutGrid, Plus } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { apiFetch } from '@/lib/api';
import { createClass } from '@/lib/actions/classes';
import type { ClassDto } from '@/lib/types/academic';
import { ClassFormDialog } from './class-form-dialog';
import { ClassList } from './class-list';

export default async function ClassesPage() {
  const classes = await apiFetch<ClassDto[]>('/classes');

  const newClassTrigger = (
    <ClassFormDialog
      trigger={
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          New Class
        </Button>
      }
      title="New Class"
      description="Add a class level, e.g. JSS1 or SSS2."
      onSubmit={createClass}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & Arms"
        description="Each class level (JSS1, SSS2, etc.) can have multiple arms (Gold, Science A, …)."
        action={newClassTrigger}
      />

      {classes.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutGrid />
            </EmptyMedia>
            <EmptyTitle>No classes yet</EmptyTitle>
            <EmptyDescription>
              Add your school&apos;s first class level to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newClassTrigger}</EmptyContent>
        </Empty>
      ) : (
        <ClassList classes={classes} />
      )}
    </div>
  );
}
