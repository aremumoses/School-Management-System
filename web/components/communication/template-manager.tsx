'use client';

import { FileText, Loader2, Lock, Pencil, Plus } from 'lucide-react';
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
import {
  createMessageTemplate,
  deleteMessageTemplate,
  updateMessageTemplate,
} from '@/lib/actions/communication';
import type { MessageTemplateDto } from '@/lib/types/communication';

export function TemplateManager({ templates }: { templates: MessageTemplateDto[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Reusable wording with placeholders like <code>{'{{student_name}}'}</code>,{' '}
          <code>{'{{balance}}'}</code>, <code>{'{{due_date}}'}</code>.
        </p>
        <TemplateFormPopover
          trigger={
            <Button size="sm">
              <Plus className="size-4" aria-hidden="true" />
              New Template
            </Button>
          }
        />
      </div>

      {templates.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No templates yet</EmptyTitle>
            <EmptyDescription>Create one to reuse wording across broadcasts.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium text-foreground">{template.name}</h3>
                    {template.key && (
                      <Badge variant="outline" className="gap-1">
                        <Lock className="size-3" aria-hidden="true" />
                        System
                      </Badge>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{template.body}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <TemplateFormPopover
                    template={template}
                    trigger={
                      <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${template.name}`}>
                        <Pencil className="size-4" aria-hidden="true" />
                      </Button>
                    }
                  />
                  {!template.key && (
                    <ConfirmDeleteButton
                      itemLabel={template.name}
                      onConfirm={() => deleteMessageTemplate(template.id)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateFormPopover({
  template,
  trigger,
}: {
  template?: MessageTemplateDto;
  trigger: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(template?.name ?? '');
  const [body, setBody] = useState(template?.body ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (!name.trim() || !body.trim()) {
      toast.error('Name and body are both required.');
      return;
    }
    setIsSaving(true);
    try {
      if (template) {
        await updateMessageTemplate(template.id, { name, body });
        toast.success('Template updated.');
      } else {
        await createMessageTemplate({ name, body });
        toast.success('Template created.');
        setName('');
        setBody('');
      }
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the template.");
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
            <Label htmlFor="template-name">Name</Label>
            <Input id="template-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="template-body">Body</Label>
            <Textarea id="template-body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <Button type="button" size="sm" className="w-full" disabled={isSaving} onClick={save}>
            {isSaving ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : 'Save'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
