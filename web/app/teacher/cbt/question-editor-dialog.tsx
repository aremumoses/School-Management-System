'use client';

import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  createQuestion,
  updateQuestion,
  uploadQuestionImage,
} from '@/lib/actions/cbt';
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS } from '@/lib/cbt-labels';
import type {
  McqOption,
  QuestionDifficulty,
  QuestionDto,
  QuestionType,
} from '@/lib/types/cbt';

const OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f'];

export function QuestionEditorDialog({
  subjectOptions,
  question,
}: {
  subjectOptions: { id: string; name: string }[];
  question?: QuestionDto;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(question?.subjectId ?? '');
  const [topic, setTopic] = useState(question?.topic ?? '');
  const [classLevel, setClassLevel] = useState(String(question?.classLevel ?? 1));
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>(
    question?.difficulty ?? 'MEDIUM',
  );
  const [type, setType] = useState<QuestionType>(question?.type ?? 'MCQ_SINGLE');
  const [prompt, setPrompt] = useState(question?.prompt ?? '');
  const [options, setOptions] = useState<McqOption[]>(
    (question?.options as McqOption[] | null) ?? [
      { id: 'a', text: '' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
      { id: 'd', text: '' },
    ],
  );
  const [correctSingle, setCorrectSingle] = useState(
    typeof question?.correctAnswer === 'string' ? question.correctAnswer : 'a',
  );
  const [correctMultiple, setCorrectMultiple] = useState<string[]>(
    Array.isArray(question?.correctAnswer)
      ? (question!.correctAnswer as string[])
      : [],
  );
  const [correctBool, setCorrectBool] = useState(
    question?.correctAnswer === false ? 'false' : 'true',
  );
  const [fillAnswers, setFillAnswers] = useState(
    Array.isArray(question?.correctAnswer)
      ? (question!.correctAnswer as string[]).join(', ')
      : '',
  );
  const [image, setImage] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const isMcq = type === 'MCQ_SINGLE' || type === 'MCQ_MULTIPLE';

  function buildPayload() {
    let payloadOptions: unknown;
    let correctAnswer: unknown;
    if (isMcq) {
      payloadOptions = options.filter((o) => o.text.trim());
      correctAnswer =
        type === 'MCQ_SINGLE' ? correctSingle : correctMultiple;
    } else if (type === 'TRUE_FALSE') {
      correctAnswer = correctBool === 'true';
    } else if (type === 'FILL_BLANK') {
      correctAnswer = fillAnswers
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      correctAnswer = undefined; // ESSAY (MATCHING kept out of the editor MVP — bank API supports it)
    }
    return {
      subjectId,
      topic: topic.trim(),
      classLevel: Number(classLevel),
      difficulty,
      type,
      prompt: prompt.trim(),
      options: payloadOptions,
      correctAnswer,
    };
  }

  async function handleSave() {
    if (!subjectId) return toast.error('Choose a subject.');
    if (!topic.trim()) return toast.error('A topic is required.');
    if (!prompt.trim()) return toast.error('The question prompt is required.');
    if (isMcq && options.filter((o) => o.text.trim()).length < 2) {
      return toast.error('MCQ questions need at least two options.');
    }
    if (type === 'MCQ_MULTIPLE' && correctMultiple.length === 0) {
      return toast.error('Tick at least one correct option.');
    }
    if (type === 'FILL_BLANK' && !fillAnswers.trim()) {
      return toast.error('List at least one accepted answer.');
    }

    setIsSaving(true);
    try {
      const payload = buildPayload();
      const saved = question
        ? await updateQuestion(question.id, payload)
        : await createQuestion(payload);
      if (image) {
        const formData = new FormData();
        formData.set('file', image);
        try {
          await uploadQuestionImage(saved.id, formData);
        } catch {
          toast.warning('Question saved, but the image upload failed.');
        }
      }
      toast.success(question ? 'Question updated.' : 'Question submitted.');
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't save the question.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={question ? <Button variant="ghost" size="sm" /> : <Button />}>
        {question ? (
          <Pencil className="size-3.5" aria-hidden="true" />
        ) : (
          <>
            <Plus className="size-4" aria-hidden="true" />
            New Question
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{question ? 'Edit question' : 'New bank question'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select
                value={subjectId}
                onValueChange={(v) => {
                  if (v) setSubjectId(v);
                }}
                items={subjectOptions.map((s) => ({ value: s.id, label: s.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {subjectOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-topic">Topic (NERDC ref)</Label>
              <Input id="q-topic" value={topic} onChange={(e) => setTopic(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  if (v) setType(v as QuestionType);
                }}
                items={(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[])
                  .filter((t) => t !== 'MATCHING')
                  .map((t) => ({ value: t, label: QUESTION_TYPE_LABELS[t] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[])
                    .filter((t) => t !== 'MATCHING')
                    .map((t) => (
                      <SelectItem key={t} value={t}>
                        {QUESTION_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => {
                  if (v) setDifficulty(v as QuestionDifficulty);
                }}
                items={(Object.keys(DIFFICULTY_LABELS) as QuestionDifficulty[]).map((d) => ({
                  value: d,
                  label: DIFFICULTY_LABELS[d],
                }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DIFFICULTY_LABELS) as QuestionDifficulty[]).map((d) => (
                    <SelectItem key={d} value={d}>
                      {DIFFICULTY_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-level">Class level</Label>
              <Input
                id="q-level"
                type="number"
                min="1"
                max="6"
                value={classLevel}
                onChange={(e) => setClassLevel(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-prompt">Question</Label>
            <Textarea
              id="q-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-20"
            />
          </div>

          {isMcq && (
            <div className="space-y-2">
              <Label>
                Options{' '}
                <span className="font-normal text-muted-foreground">
                  ({type === 'MCQ_SINGLE' ? 'pick the correct one' : 'tick all correct ones'})
                </span>
              </Label>
              {options.map((option, index) => (
                <div key={option.id} className="flex items-center gap-2">
                  {type === 'MCQ_SINGLE' ? (
                    <input
                      type="radio"
                      name="correct"
                      checked={correctSingle === option.id}
                      onChange={() => setCorrectSingle(option.id)}
                      aria-label={`Mark option ${option.id} correct`}
                    />
                  ) : (
                    <input
                      type="checkbox"
                      checked={correctMultiple.includes(option.id)}
                      onChange={(e) =>
                        setCorrectMultiple((prev) =>
                          e.target.checked
                            ? [...prev, option.id]
                            : prev.filter((x) => x !== option.id),
                        )
                      }
                      aria-label={`Mark option ${option.id} correct`}
                    />
                  )}
                  <span className="w-4 text-xs font-medium uppercase text-muted-foreground">
                    {option.id}
                  </span>
                  <Input
                    value={option.text}
                    onChange={(e) =>
                      setOptions((prev) =>
                        prev.map((o, i) => (i === index ? { ...o, text: e.target.value } : o)),
                      )
                    }
                    className="h-8 flex-1 text-sm"
                  />
                  {options.length > 2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setOptions((prev) => prev.filter((_, i) => i !== index))
                      }
                      aria-label={`Remove option ${option.id}`}
                    >
                      <Trash2 className="size-3" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < OPTION_IDS.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setOptions((prev) => [
                      ...prev,
                      { id: OPTION_IDS[prev.length], text: '' },
                    ])
                  }
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Add Option
                </Button>
              )}
            </div>
          )}

          {type === 'TRUE_FALSE' && (
            <div className="space-y-1.5">
              <Label>Correct answer</Label>
              <div className="flex gap-2">
                {['true', 'false'].map((v) => (
                  <Button
                    key={v}
                    variant={correctBool === v ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCorrectBool(v)}
                  >
                    {v === 'true' ? 'True' : 'False'}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {type === 'FILL_BLANK' && (
            <div className="space-y-1.5">
              <Label htmlFor="q-fill">Accepted answers (comma-separated)</Label>
              <Input
                id="q-fill"
                value={fillAnswers}
                onChange={(e) => setFillAnswers(e.target.value)}
                placeholder="e.g. photosynthesis, photo-synthesis"
              />
              <p className="text-xs text-muted-foreground">
                Compared case-insensitively, ignoring surrounding spaces.
              </p>
            </div>
          )}

          {type === 'ESSAY' && (
            <p className="text-xs text-muted-foreground">
              Essay answers are graded manually by the teacher after submission.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="q-image">Diagram / image (optional)</Label>
            <Input
              id="q-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : question ? (
                'Save Changes'
              ) : (
                'Submit Question'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
