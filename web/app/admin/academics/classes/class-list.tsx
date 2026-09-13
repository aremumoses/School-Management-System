'use client';

import { ChevronDown, Pencil, Plus, School } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDeleteButton } from '@/components/dashboard/confirm-delete-button';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { addArm, deleteArm, deleteClass, updateArm, updateClass } from '@/lib/actions/classes';
import type { ClassDto } from '@/lib/types/academic';
import { cn } from '@/lib/utils';
import { ArmFormDialog } from './arm-form-dialog';
import { ClassFormDialog } from './class-form-dialog';

export function ClassList({ classes }: { classes: ClassDto[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(classes[0]?.id ?? null);

  return (
    <div className="space-y-4">
      {classes.map((klass) => {
        const isExpanded = expandedId === klass.id;
        const panelId = `class-${klass.id}-arms`;

        return (
          <Card key={klass.id} className="gap-0 overflow-hidden rounded-xl py-0 ring-0 dark:ring-1">
            <div className="flex items-center gap-2 px-4 py-3 sm:px-6">
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-controls={isExpanded ? panelId : undefined}
                onClick={() => setExpandedId(isExpanded ? null : klass.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : klass.id);
                  }
                }}
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-lg py-2 transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none sm:-ml-2 sm:px-2"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <School className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-heading">{klass.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Level {klass.level} · {klass.arms.length} arm{klass.arms.length === 1 ? '' : 's'}
                  </p>
                </div>
                <ChevronDown
                  className={cn(
                    'size-5 shrink-0 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </div>
              <div className="flex items-center gap-1">
                <ClassFormDialog
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Edit ${klass.name}`}>
                      <Pencil className="size-4" />
                    </Button>
                  }
                  title={`Edit ${klass.name}`}
                  description="Update this class's name or level."
                  defaultValues={{ name: klass.name, level: klass.level }}
                  onSubmit={(values) => updateClass(klass.id, values)}
                />
                <ConfirmDeleteButton
                  itemLabel={klass.name}
                  description="Deleting a class also removes its arms. This fails if students, subjects, or enrollments are still linked to it."
                  onConfirm={() => deleteClass(klass.id)}
                />
              </div>
            </div>

            {isExpanded && (
              <div id={panelId} className="space-y-4 border-t border-border px-4 py-5 sm:px-6">
                {klass.arms.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No arms yet for {klass.name}.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {klass.arms.map((arm) => (
                      <li
                        key={arm.id}
                        className="flex items-center gap-0.5 rounded-full bg-primary/10 py-0.5 pr-1 pl-4"
                      >
                        <span className="text-sm font-semibold text-primary dark:text-foreground">
                          {arm.name}
                        </span>
                        <ArmFormDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="rounded-full hover:bg-primary/15"
                              aria-label={`Edit ${arm.name}`}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          }
                          title={`Edit ${arm.name}`}
                          description={`Update this arm's name within ${klass.name}.`}
                          defaultValues={{ name: arm.name }}
                          onSubmit={(values) => updateArm(arm.id, values)}
                        />
                        <ConfirmDeleteButton
                          itemLabel={`${klass.name} ${arm.name}`}
                          description="This fails if students are still enrolled in this arm."
                          onConfirm={() => deleteArm(arm.id)}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <ArmFormDialog
                  trigger={
                    <Button variant="outline">
                      <Plus className="size-4" />
                      Add Arm
                    </Button>
                  }
                  title={`Add Arm to ${klass.name}`}
                  description="e.g. Gold, Silver, Science A."
                  onSubmit={(values) => addArm(klass.id, values)}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
