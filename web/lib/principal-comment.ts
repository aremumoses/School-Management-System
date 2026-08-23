/**
 * A reasonable starting point for the Principal's comment, based on the
 * student's overall average — always editable, never saved until the
 * Admin explicitly clicks Save (docs/14-module-academic-results.md §10's
 * "always editable and must be explicitly accepted" rule for AI/smart
 * defaults applies here too, even though this one is a static band lookup
 * rather than an AI suggestion).
 */
export function smartPrincipalComment(overallAverage: number): string {
  if (overallAverage >= 75) {
    return 'An excellent result this term — keep up the outstanding work.';
  }
  if (overallAverage >= 60) {
    return 'A good result this term. Continued effort will yield even better outcomes.';
  }
  if (overallAverage >= 50) {
    return 'A satisfactory result this term. There is room for improvement with more consistent effort.';
  }
  if (overallAverage >= 40) {
    return 'A below-average result this term. Please see the Class Teacher for additional support.';
  }
  return 'This result requires urgent attention. A meeting with parents is strongly recommended.';
}
