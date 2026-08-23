/** Overdue check hoisted out of render paths (React Compiler purity rule) — same pattern as assignment-status.ts's isDeadlinePassed. */
export function isLoanOverdue(dueDate: string): boolean {
  return new Date(dueDate).getTime() < Date.now();
}
