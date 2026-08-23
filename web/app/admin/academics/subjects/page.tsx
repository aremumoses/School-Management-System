import { BookOpen, Plus } from 'lucide-react';
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
import { createSubject } from '@/lib/actions/subjects';
import { apiFetch } from '@/lib/api';
import type { ClassDto, SubjectDto } from '@/lib/types/academic';
import { SubjectFormDialog } from './subject-form-dialog';
import { SubjectsTable } from './subjects-table';

export default async function SubjectsPage() {
  const [subjects, classes] = await Promise.all([
    apiFetch<SubjectDto[]>('/subjects'),
    apiFetch<ClassDto[]>('/classes'),
  ]);

  const newSubjectTrigger = (
    <SubjectFormDialog
      trigger={
        <Button>
          <Plus className="size-4" aria-hidden="true" />
          New Subject
        </Button>
      }
      title="New Subject"
      description="Add a subject — map it to class levels afterward."
      onSubmit={createSubject}
    />
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects & Curriculum"
        description="Manage subjects and which class levels each one is offered at."
        action={newSubjectTrigger}
      />

      {subjects.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>No subjects yet</EmptyTitle>
            <EmptyDescription>
              Add your school&apos;s first subject to get started.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>{newSubjectTrigger}</EmptyContent>
        </Empty>
      ) : (
        <SubjectsTable subjects={subjects} classes={classes} />
      )}
    </div>
  );
}
