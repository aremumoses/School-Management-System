/** Mirrors api/src/modules/results/conduct-categories.ts exactly — keep in sync if the backend's lists ever change. */

export const AFFECTIVE_CATEGORIES = [
  'Punctuality',
  'Neatness',
  'Honesty',
  'Relationship with peers',
  'Relationship with staff',
  'Leadership',
  'Initiative',
] as const;

export const PSYCHOMOTOR_CATEGORIES = [
  'Handwriting',
  'Sports/Games',
  'Handling of tools/instruments',
  'Musical skill',
  'Verbal fluency',
] as const;

export const CONDUCT_SCORE_LABELS: Record<number, string> = {
  5: 'Excellent',
  4: 'Very Good',
  3: 'Good',
  2: 'Fair',
  1: 'Poor',
};
