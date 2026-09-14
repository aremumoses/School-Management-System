import { FolderX, ReceiptText } from 'lucide-react';
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
      <Empty className="rounded-xl bg-card py-12 dark:ring-1 dark:ring-foreground/10">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className="size-12 rounded-full bg-primary/10 text-primary [&_svg:not([class*='size-'])]:size-5"
          >
            <FolderX />
          </EmptyMedia>
          <EmptyTitle className="text-base font-semibold text-heading">
            Set up classes and an academic session first
          </EmptyTitle>
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
            <section className="flex flex-col gap-4 rounded-xl bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 dark:ring-1 dark:ring-foreground/10">
              <div className="flex min-w-0 items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ReceiptText className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg leading-snug font-semibold text-heading">
                    Invoices for {selectedClass.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Bill every actively-enrolled student in this class from this fee structure.
                  </p>
                </div>
              </div>
              <GenerateInvoicesButton classId={selectedClassId} termId={selectedTermId} className={selectedClass.name} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
