import { FolderX } from 'lucide-react';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import type { ClassDto } from '@/lib/types/academic';
import type { FeeStructureDto } from '@/lib/types/fees';
import { ClassTermPicker } from './class-term-picker';
import { ExistingStructureEditor } from './existing-structure-editor';
import { GenerateInvoicesButton } from './generate-invoices-button';
import { NewStructureForm } from './new-structure-form';
import type { TermOption } from './page';

export function FeeStructureBuilder({
  classes,
  terms,
  selectedClassId,
  selectedTermId,
  structure,
}: {
  classes: ClassDto[];
  terms: TermOption[];
  selectedClassId?: string;
  selectedTermId?: string;
  structure: FeeStructureDto | null;
}) {
  if (classes.length === 0 || terms.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderX />
          </EmptyMedia>
          <EmptyTitle>Set up classes and an academic session first</EmptyTitle>
          <EmptyDescription>
            A fee structure needs at least one class and one term to attach to.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="space-y-6">
      <ClassTermPicker
        classes={classes}
        terms={terms}
        selectedClassId={selectedClassId}
        selectedTermId={selectedTermId}
      />

      {selectedClassId && selectedTermId && (
        <>
          {structure ? (
            <ExistingStructureEditor key={structure.id} structure={structure} />
          ) : (
            <NewStructureForm key={`${selectedClassId}-${selectedTermId}`} classId={selectedClassId} termId={selectedTermId} />
          )}

          {structure && structure.components.length > 0 && selectedClass && (
            <GenerateInvoicesButton classId={selectedClassId} termId={selectedTermId} className={selectedClass.name} />
          )}
        </>
      )}
    </div>
  );
}
