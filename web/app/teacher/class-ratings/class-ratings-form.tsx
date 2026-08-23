'use client';

import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { RatingControl } from '@/components/dashboard/rating-control';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { submitConduct, suggestComment } from '@/lib/actions/results';
import { AFFECTIVE_CATEGORIES, CONDUCT_SCORE_LABELS, PSYCHOMOTOR_CATEGORIES } from '@/lib/conduct-categories';
import { cn } from '@/lib/utils';
import type { ConductDomain, StudentConductRowDto } from '@/lib/types/results';

export function ClassRatingsForm({
  armId,
  termId,
  students,
}: {
  armId: string;
  termId: string;
  students: StudentConductRowDto[];
}) {
  const [selectedId, setSelectedId] = useState(students[0]?.studentId ?? '');
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(students.filter((s) => s.ratings.length > 0).map((s) => s.studentId)),
  );

  const selected = students.find((s) => s.studentId === selectedId);

  if (students.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No students are actively enrolled in this class yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Ratings &amp; Form Comment</CardTitle>
        <p className="text-sm text-muted-foreground">
          {savedIds.size} of {students.length} students rated
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-sm space-y-1.5">
          <Label>Student</Label>
          <Select
            value={selectedId}
            onValueChange={(value) => value && setSelectedId(value)}
            items={students.map((s) => ({
              value: s.studentId,
              label: `${savedIds.has(s.studentId) ? '✓ ' : ''}${s.firstName} ${s.lastName}`,
            }))}
          >
            <SelectTrigger className="w-full" aria-label="Student">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {students.map((s) => (
                <SelectItem key={s.studentId} value={s.studentId}>
                  {savedIds.has(s.studentId) && (
                    <CheckCircle2 className="size-3.5 text-success" aria-hidden="true" />
                  )}
                  {s.firstName} {s.lastName}
                  <span className="font-mono text-xs text-muted-foreground">{s.admissionNumber}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <StudentRatingPanel
            key={selected.studentId}
            armId={armId}
            termId={termId}
            student={selected}
            onSaved={() => setSavedIds((current) => new Set(current).add(selected.studentId))}
          />
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Keyed by `student.studentId` from the parent — switching students fully
 * remounts this, so its local edit state always seeds from the newly
 * selected student's existing ratings without a useEffect-driven resync.
 */
function StudentRatingPanel({
  armId,
  termId,
  student,
  onSaved,
}: {
  armId: string;
  termId: string;
  student: StudentConductRowDto;
  onSaved: () => void;
}) {
  const [affective, setAffective] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const rating of student.ratings) {
      if (rating.domain === 'AFFECTIVE') initial[rating.category] = rating.score;
    }
    return initial;
  });
  const [psychomotor, setPsychomotor] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const rating of student.ratings) {
      if (rating.domain === 'PSYCHOMOTOR') initial[rating.category] = rating.score;
    }
    return initial;
  });
  // savedComment tracks the last value actually persisted (seeded from the
  // student's existing comment) — comment !== savedComment is what drives
  // the "Draft — not yet saved" indicator, whether the difference came
  // from an AI suggestion or a manual edit. Never written anywhere until
  // handleSave succeeds.
  const [savedComment, setSavedComment] = useState(student.formTeacherComment ?? '');
  const [comment, setComment] = useState(student.formTeacherComment ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const hasUnsavedDraft = comment !== savedComment;

  function setRating(domain: ConductDomain, category: string, score: number) {
    if (domain === 'AFFECTIVE') {
      setAffective((current) => ({ ...current, [category]: score }));
    } else {
      setPsychomotor((current) => ({ ...current, [category]: score }));
    }
  }

  async function handleSave() {
    const ratings = [
      ...AFFECTIVE_CATEGORIES.filter((c) => affective[c] != null).map((c) => ({
        domain: 'AFFECTIVE' as const,
        category: c,
        score: affective[c],
      })),
      ...PSYCHOMOTOR_CATEGORIES.filter((c) => psychomotor[c] != null).map((c) => ({
        domain: 'PSYCHOMOTOR' as const,
        category: c,
        score: psychomotor[c],
      })),
    ];
    if (ratings.length === 0) {
      toast.error('Rate at least one trait before saving.');
      return;
    }
    setIsSaving(true);
    try {
      await submitConduct(armId, termId, student.studentId, {
        ratings,
        formTeacherComment: comment || undefined,
      });
      setSavedComment(comment);
      onSaved();
      toast.success(`Saved ratings for ${student.firstName} ${student.lastName}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save ratings.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSuggest() {
    setIsSuggesting(true);
    // suggestComment returns a result object rather than throwing —
    // assistive feature, fail quietly back to manual entry (a toast, not
    // a blocking error) per the frontend prompt's own instruction.
    const result = await suggestComment(armId, termId, student.studentId, {
      commentType: 'FORM_TEACHER',
    });
    if (result.success) {
      setComment(result.suggestion);
    } else {
      toast.error(result.error);
    }
    setIsSuggesting(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Affective Domain</h4>
          {AFFECTIVE_CATEGORIES.map((category) => (
            <div key={category} className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">{category}</span>
              <RatingControl
                ariaLabel={category}
                value={affective[category] ?? null}
                onChange={(score) => setRating('AFFECTIVE', category, score)}
              />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Psychomotor Domain</h4>
          {PSYCHOMOTOR_CATEGORIES.map((category) => (
            <div key={category} className="flex items-center justify-between gap-3">
              <span className="text-sm text-foreground">{category}</span>
              <RatingControl
                ariaLabel={category}
                value={psychomotor[category] ?? null}
                onChange={(score) => setRating('PSYCHOMOTOR', category, score)}
              />
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        1 = {CONDUCT_SCORE_LABELS[1]}, 2 = {CONDUCT_SCORE_LABELS[2]}, 3 = {CONDUCT_SCORE_LABELS[3]},
        4 = {CONDUCT_SCORE_LABELS[4]}, 5 = {CONDUCT_SCORE_LABELS[5]}
      </p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="form-comment">Form Teacher&apos;s Comment</Label>
            {hasUnsavedDraft && (
              <Badge variant="warning" className="font-normal">
                Draft — not yet saved
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleSuggest()}
            disabled={isSuggesting}
          >
            {isSuggesting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                Thinking…
              </>
            ) : (
              <>
                <Sparkles className="size-3.5" aria-hidden="true" />
                Suggest a comment
              </>
            )}
          </Button>
        </div>
        <Textarea
          id="form-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="An overall comment on this student's term — effort, conduct, areas to work on…"
          className={cn('min-h-24', hasUnsavedDraft && 'border-warning ring-1 ring-warning/30')}
        />
      </div>

      <Button onClick={handleSave} disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          'Save Ratings & Comment'
        )}
      </Button>
    </div>
  );
}
