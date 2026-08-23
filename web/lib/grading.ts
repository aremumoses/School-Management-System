import type { GradingScaleEntry } from '@/lib/types/academic';
import type { ScoreGridComponentDto } from '@/lib/types/results';

/**
 * Client-side mirror of api/src/common/grading/grading.service.ts and
 * api/src/modules/scores/scores.service.ts's computeSubjectPercentage —
 * needed so the Teacher score-entry grid can show a live total/grade as
 * scores are typed, without a round-trip per keystroke. Keep this in sync
 * with the backend if either ever changes; the backend's value (computed
 * from whatever's actually persisted) is always the source of truth once a
 * submission is saved.
 */

export function computeSubjectPercentage(
  scoresByComponentId: Record<string, number | '' | null | undefined>,
  components: Pick<ScoreGridComponentDto, 'id' | 'maxScore' | 'weight'>[],
): number {
  let total = 0;
  for (const component of components) {
    const score = scoresByComponentId[component.id];
    if (score == null || score === '' || component.maxScore === 0) continue;
    total += (score / component.maxScore) * component.weight;
  }
  return total;
}

const UNGRADED = { grade: '-', remark: 'Ungraded' };

export function gradeFromScale(
  percentage: number,
  scale: GradingScaleEntry[],
): { grade: string; remark: string } {
  const match = scale.find((entry) => percentage >= entry.min && percentage <= entry.max);
  return match ? { grade: match.grade, remark: match.remark } : UNGRADED;
}

/** Badge variant per grade band — A-range positive, mid-range warning, failing error. */
export function gradeBadgeVariant(grade: string): 'success' | 'warning' | 'error' | 'outline' {
  if (grade === '-') return 'outline';
  if (grade.startsWith('A') || grade.startsWith('B')) return 'success';
  if (grade === 'F9' || grade.startsWith('F')) return 'error';
  return 'warning';
}
