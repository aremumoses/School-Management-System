'use client';

import { FileQuestion } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DIFFICULTY_LABELS,
  QUESTION_STATUS_BADGE,
  QUESTION_TYPE_LABELS,
} from '@/lib/cbt-labels';
import type {
  QuestionDifficulty,
  QuestionDto,
  QuestionStatus,
  QuestionType,
} from '@/lib/types/cbt';
import { QuestionEditorDialog } from './question-editor-dialog';

export function QuestionBankPanel({
  questions,
  subjectOptions,
}: {
  questions: QuestionDto[];
  subjectOptions: { id: string; name: string }[];
}) {
  const [subjectId, setSubjectId] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      questions.filter(
        (q) =>
          (!subjectId || q.subjectId === subjectId) &&
          (!difficulty || q.difficulty === difficulty) &&
          (!type || q.type === type) &&
          (!status || q.status === status) &&
          (!search ||
            q.prompt.toLowerCase().includes(search.toLowerCase()) ||
            q.topic.toLowerCase().includes(search.toLowerCase())),
      ),
    [questions, subjectId, difficulty, type, status, search],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompt/topic…"
          className="w-56"
          aria-label="Search questions"
        />
        <Select
          value={subjectId}
          onValueChange={(v) => setSubjectId(v ?? '')}
          items={[{ value: '', label: 'All subjects' }, ...subjectOptions.map((s) => ({ value: s.id, label: s.name }))]}
        >
          <SelectTrigger className="w-40" aria-label="Filter by subject">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All subjects</SelectItem>
            {subjectOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={difficulty}
          onValueChange={(v) => setDifficulty(v ?? '')}
          items={[{ value: '', label: 'Any difficulty' }, ...Object.entries(DIFFICULTY_LABELS).map(([value, label]) => ({ value, label }))]}
        >
          <SelectTrigger className="w-36" aria-label="Filter by difficulty">
            <SelectValue placeholder="Any difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any difficulty</SelectItem>
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(v) => setType(v ?? '')}
          items={[{ value: '', label: 'Any type' }, ...Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => ({ value, label }))]}
        >
          <SelectTrigger className="w-40" aria-label="Filter by type">
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any type</SelectItem>
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v ?? '')}
          items={[
            { value: '', label: 'Any status' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'RETURNED', label: 'Returned' },
          ]}
        >
          <SelectTrigger className="w-32" aria-label="Filter by status">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Any status</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="RETURNED">Returned</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <QuestionEditorDialog subjectOptions={subjectOptions} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileQuestion />
            </EmptyMedia>
            <EmptyTitle>No questions match</EmptyTitle>
            <EmptyDescription>
              Author a question — teacher questions go to the Exam Officer for approval before
              entering the shared bank.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-2">
          {filtered.map((question) => (
            <li
              key={question.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm text-foreground">{question.prompt}</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="info" className="text-xs">
                    {question.subject.name}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {QUESTION_TYPE_LABELS[question.type as QuestionType]}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {DIFFICULTY_LABELS[question.difficulty as QuestionDifficulty]}
                  </Badge>
                  <Badge
                    variant={QUESTION_STATUS_BADGE[question.status as QuestionStatus]}
                    className="text-xs"
                  >
                    {question.status.charAt(0) + question.status.slice(1).toLowerCase()}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{question.topic}</span>
                </div>
                {question.status === 'RETURNED' && question.reviewerNotes && (
                  <p className="text-xs text-error-soft-foreground">
                    Returned: {question.reviewerNotes}
                  </p>
                )}
              </div>
              <QuestionEditorDialog subjectOptions={subjectOptions} question={question} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
