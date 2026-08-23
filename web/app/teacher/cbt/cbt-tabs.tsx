'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { CBTTestDto, QuestionDto } from '@/lib/types/cbt';
import { QuestionBankPanel } from './question-bank-panel';
import { TestsPanel } from './tests-panel';

export function CbtTabs({
  initialTab,
  questions,
  tests,
  subjectOptions,
  classSubjectOptions,
}: {
  initialTab: 'bank' | 'tests';
  questions: QuestionDto[];
  tests: CBTTestDto[];
  subjectOptions: { id: string; name: string }[];
  classSubjectOptions: { classSubjectId: string; label: string }[];
}) {
  const [tab, setTab] = useState<'bank' | 'tests'>(initialTab);

  return (
    <div className="space-y-6">
      <div className="flex gap-1">
        {(
          [
            { key: 'bank', label: 'Question Bank' },
            { key: 'tests', label: 'My Tests' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              tab === key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'bank' ? (
        <QuestionBankPanel questions={questions} subjectOptions={subjectOptions} />
      ) : (
        <TestsPanel tests={tests} classSubjectOptions={classSubjectOptions} />
      )}
    </div>
  );
}
