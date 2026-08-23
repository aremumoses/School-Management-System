'use client';

import { Loader2, Pencil } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ConfirmDeleteButton } from '@/components/dashboard/confirm-delete-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  deleteSubject,
  mapSubjectToClass,
  unmapSubjectFromClass,
  updateSubject,
} from '@/lib/actions/subjects';
import type { ClassDto, SubjectDto } from '@/lib/types/academic';
import { SubjectFormDialog } from './subject-form-dialog';

export function SubjectDetailSheet({
  subject,
  classes,
}: {
  subject: SubjectDto;
  classes: ClassDto[];
}) {
  const [open, setOpen] = useState(false);
  const [pendingClassId, setPendingClassId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const mappedByClassId = new Map(subject.classSubjects.map((cs) => [cs.classId, cs.id]));

  function toggleClass(classId: string, checked: boolean) {
    setPendingClassId(classId);
    startTransition(async () => {
      try {
        if (checked) {
          await mapSubjectToClass(subject.id, classId);
        } else {
          const mappingId = mappedByClassId.get(classId);
          if (mappingId) await unmapSubjectFromClass(mappingId);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to update mapping.');
      } finally {
        setPendingClassId(null);
      }
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={`Manage ${subject.name}`}>
            <Pencil className="size-4" />
          </Button>
        }
      />
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{subject.name}</SheetTitle>
          <SheetDescription>
            {subject.code ? `Code: ${subject.code}` : 'No code set'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4">
          <div className="flex items-center gap-2">
            <SubjectFormDialog
              trigger={
                <Button variant="outline" size="sm">
                  Edit Name / Code
                </Button>
              }
              title={`Edit ${subject.name}`}
              description="Update this subject's name or code."
              defaultValues={{ name: subject.name, code: subject.code ?? '' }}
              onSubmit={(values) => updateSubject(subject.id, values)}
            />
            <ConfirmDeleteButton
              itemLabel={subject.name}
              description="This fails if the subject is mapped to a class or has scores linked to it."
              onConfirm={async () => {
                await deleteSubject(subject.id);
                setOpen(false);
              }}
              triggerRender={<Button variant="outline" size="sm" />}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Offered at these class levels
            </Label>
            <div className="space-y-2">
              {classes.map((klass) => {
                const isMapped = mappedByClassId.has(klass.id);
                const isPending = pendingClassId === klass.id;
                return (
                  <label
                    key={klass.id}
                    htmlFor={`class-${klass.id}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm hover:bg-muted/40"
                  >
                    <Checkbox
                      id={`class-${klass.id}`}
                      checked={isMapped}
                      disabled={isPending}
                      onCheckedChange={(checked) => toggleClass(klass.id, checked === true)}
                    />
                    <span className="flex-1 font-medium text-foreground">{klass.name}</span>
                    {isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {isMapped && !isPending && <Badge variant="success">Offered</Badge>}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
