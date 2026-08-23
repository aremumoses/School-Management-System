// Fixed category lists for ConductRating.category (docs/14-module-academic-results.md
// §6). Kept as validated string constants rather than a DB enum — see
// ConductRating's schema comment — since the exact wording is cosmetic and
// easier to adjust per school later than a migration-requiring enum.
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
