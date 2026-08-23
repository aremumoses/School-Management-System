'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RatingScale } from '@/components/hr/rating-scale';
import { saveAppraisalResponses } from '@/lib/actions/appraisal';
import type { AppraisalSubmissionDto } from '@/lib/types/appraisal';

export function AppraisalFormFill({ submission }: { submission: AppraisalSubmissionDto }) {
  const router = useRouter();
  const form = submission.cycle!.form;
  const [ratings, setRatings] = useState<Record<string, number>>(submission.responses.ratings ?? {});
  const [freeText, setFreeText] = useState<Record<string, string>>(
    submission.responses.freeText ?? {},
  );
  const [isSaving, setIsSaving] = useState<'draft' | 'submit' | null>(null);

  const readOnly = submission.status !== 'DRAFT';

  async function handleSave(submit: boolean) {
    if (submit) {
      const missing = form.sections.ratedCategories.filter((c) => !(c.key in ratings));
      if (missing.length > 0) {
        toast.error(`Rate every category before submitting: ${missing.map((c) => c.label).join(', ')}`);
        return;
      }
    }
    setIsSaving(submit ? 'submit' : 'draft');
    try {
      await saveAppraisalResponses(submission.id, { ratings, freeText, submit });
      toast.success(submit ? 'Appraisal submitted.' : 'Draft saved.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save this appraisal.");
    } finally {
      setIsSaving(null);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ratings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.sections.ratedCategories.map((c) => (
            <div key={c.key} className="space-y-1.5">
              <Label>{c.label}</Label>
              <RatingScale
                value={ratings[c.key] ?? null}
                max={c.maxScore}
                disabled={readOnly}
                ariaLabel={c.label}
                onChange={(v) => setRatings((r) => ({ ...r, [c.key]: v }))}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {form.sections.freeTextSections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {form.sections.freeTextSections.map((s) => (
              <div key={s.key} className="space-y-1.5">
                <Label htmlFor={`section-${s.key}`}>{s.label}</Label>
                <Textarea
                  id={`section-${s.key}`}
                  rows={3}
                  disabled={readOnly}
                  value={freeText[s.key] ?? ''}
                  onChange={(e) => setFreeText((f) => ({ ...f, [s.key]: e.target.value }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => void handleSave(false)} disabled={isSaving !== null}>
            {isSaving === 'draft' ? 'Saving…' : 'Save Draft'}
          </Button>
          <Button onClick={() => void handleSave(true)} disabled={isSaving !== null}>
            {isSaving === 'submit' ? 'Submitting…' : 'Submit Appraisal'}
          </Button>
        </div>
      )}
    </div>
  );
}
