'use client';

import { Check, Loader2, Pencil, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SelectOption {
  value: string;
  label: string;
}

/**
 * Click-to-edit field per prompts/00-DESIGN-SYSTEM.md §6's form patterns —
 * used throughout the Student Profile's Bio-data tab instead of one big
 * edit-mode toggle for the whole form. Displays the value as plain text;
 * clicking the pencil swaps in an input with Save/Cancel, and reverts to
 * the original value on cancel or on a failed save.
 */
export function InlineEditField({
  label,
  value,
  onSave,
  type = 'text',
  options,
  formatDisplay,
}: {
  label: string;
  value: string;
  onSave: (next: string) => Promise<void>;
  type?: 'text' | 'date' | 'select';
  options?: SelectOption[];
  formatDisplay?: (value: string) => string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = useId();

  function startEditing() {
    setDraft(value);
    setIsEditing(true);
  }

  function cancel() {
    setDraft(value);
    setIsEditing(false);
  }

  async function save() {
    if (draft === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to save ${label}.`);
    } finally {
      setIsSaving(false);
    }
  }

  const displayValue = value ? (formatDisplay ? formatDisplay(value) : value) : '—';
  const optionLabel = options?.find((o) => o.value === value)?.label;

  if (!isEditing) {
    return (
      <div className="space-y-1">
        <Label className="text-sm text-muted-foreground">{label}</Label>
        <button
          type="button"
          onClick={startEditing}
          className="group flex w-full items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1.5 text-left text-sm hover:border-border hover:bg-muted/40"
        >
          <span className="text-foreground">{optionLabel ?? displayValue}</span>
          <Pencil
            className="size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
            aria-hidden="true"
          />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label htmlFor={fieldId} className="text-sm text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-1.5">
        {type === 'select' && options ? (
          <Select value={draft} onValueChange={(v) => v && setDraft(v)} items={options}>
            <SelectTrigger id={fieldId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={fieldId}
            ref={inputRef}
            type={type === 'date' ? 'date' : 'text'}
            value={draft}
            autoFocus
            disabled={isSaving}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
              if (e.key === 'Escape') cancel();
            }}
          />
        )}
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`Save ${label}`}
          disabled={isSaving}
          onClick={() => void save()}
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`Cancel editing ${label}`}
          disabled={isSaving}
          onClick={cancel}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
