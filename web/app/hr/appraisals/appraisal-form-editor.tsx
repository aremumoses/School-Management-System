'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { upsertAppraisalForm } from '@/lib/actions/appraisal';
import type { AppraisalFormDto, FreeTextSection, RatedCategory } from '@/lib/types/appraisal';

function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

export function AppraisalFormEditor({ currentForm }: { currentForm: AppraisalFormDto | null }) {
  const router = useRouter();
  const [name, setName] = useState(currentForm?.name ?? 'Staff Appraisal Form');
  const [ratedCategories, setRatedCategories] = useState<RatedCategory[]>(
    currentForm?.sections.ratedCategories ?? [],
  );
  const [freeTextSections, setFreeTextSections] = useState<FreeTextSection[]>(
    currentForm?.sections.freeTextSections ?? [],
  );
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newSectionLabel, setNewSectionLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  function addCategory() {
    if (!newCategoryLabel.trim()) return;
    setRatedCategories((c) => [
      ...c,
      { key: slugify(newCategoryLabel), label: newCategoryLabel.trim(), maxScore: 5 },
    ]);
    setNewCategoryLabel('');
  }

  function addSection() {
    if (!newSectionLabel.trim()) return;
    setFreeTextSections((s) => [
      ...s,
      { key: slugify(newSectionLabel), label: newSectionLabel.trim() },
    ]);
    setNewSectionLabel('');
  }

  async function handleSave() {
    if (ratedCategories.length === 0) {
      toast.error('Add at least one rated category.');
      return;
    }
    setIsSaving(true);
    try {
      await upsertAppraisalForm({ name, ratedCategories, freeTextSections });
      toast.success('Appraisal form saved — new cycles will use this version.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the appraisal form.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appraisal Form</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="form-name">Form Name</Label>
          <Input id="form-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-2">
          <Label>Rated Categories (1–10 scale)</Label>
          {ratedCategories.map((c, i) => (
            <div key={c.key} className="flex items-center gap-2">
              <span className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm">
                {c.label}
              </span>
              <Input
                type="number"
                min="2"
                max="10"
                value={c.maxScore}
                onChange={(e) =>
                  setRatedCategories((cats) =>
                    cats.map((cat, idx) =>
                      idx === i ? { ...cat, maxScore: Number(e.target.value) } : cat,
                    ),
                  )
                }
                className="w-20"
                aria-label={`Max score for ${c.label}`}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRatedCategories((cats) => cats.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${c.label}`}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newCategoryLabel}
              onChange={(e) => setNewCategoryLabel(e.target.value)}
              placeholder="e.g. Punctuality, Subject Knowledge…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCategory();
                }
              }}
            />
            <Button variant="outline" onClick={addCategory}>
              <Plus className="size-4" aria-hidden="true" />
              Add
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Free-Text Sections</Label>
          {freeTextSections.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm">
                {s.label}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFreeTextSections((secs) => secs.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${s.label}`}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newSectionLabel}
              onChange={(e) => setNewSectionLabel(e.target.value)}
              placeholder="e.g. Strengths, Areas for Growth…"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSection();
                }
              }}
            />
            <Button variant="outline" onClick={addSection}>
              <Plus className="size-4" aria-hidden="true" />
              Add
            </Button>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Form'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
