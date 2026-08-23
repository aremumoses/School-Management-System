'use client';

import { ChevronDown, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDeleteButton } from '@/components/dashboard/confirm-delete-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { addArm, deleteArm, deleteClass, updateArm, updateClass } from '@/lib/actions/classes';
import type { ClassDto } from '@/lib/types/academic';
import { cn } from '@/lib/utils';
import { ArmFormDialog } from './arm-form-dialog';
import { ClassFormDialog } from './class-form-dialog';

export function ClassList({ classes }: { classes: ClassDto[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(classes[0]?.id ?? null);

  return (
    <div className="space-y-3">
      {classes.map((klass) => {
        const isExpanded = expandedId === klass.id;

        return (
          <Card key={klass.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : klass.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpandedId(isExpanded ? null : klass.id);
                  }
                }}
                className="flex flex-1 cursor-pointer items-center gap-3"
              >
                <ChevronDown
                  className={cn(
                    'size-5 text-muted-foreground transition-transform',
                    isExpanded && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
                <CardTitle className="text-xl">{klass.name}</CardTitle>
                <Badge variant="outline">
                  {klass.arms.length} arm{klass.arms.length === 1 ? '' : 's'}
                </Badge>
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
            </CardHeader>
            {isExpanded && (
              <CardContent className="space-y-3">
                {klass.arms.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No arms yet for {klass.name}.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {klass.arms.map((arm) => (
                      <div
                        key={arm.id}
                        className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 py-1 pl-3 pr-1"
                      >
                        <span className="text-sm font-medium text-foreground">{arm.name}</span>
                        <ArmFormDialog
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon-sm"
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
                      </div>
                    ))}
                  </div>
                )}
                <ArmFormDialog
                  trigger={
                    <Button variant="outline" size="sm">
                      <Plus className="size-4" />
                      Add Arm
                    </Button>
                  }
                  title={`Add Arm to ${klass.name}`}
                  description="e.g. Gold, Silver, Science A."
                  onSubmit={(values) => addArm(klass.id, values)}
                />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
