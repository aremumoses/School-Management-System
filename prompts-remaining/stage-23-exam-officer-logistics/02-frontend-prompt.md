# Stage 23 — Frontend Prompt (Exam Officer Logistics)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Exam Timetable & Hall/Seat Allocation (`/exam-officer/exam-timetable`)
- A builder similar in shape to Stage 16's Timetable Builder (reuse that grid/picker pattern where it fits) for scheduling exam sessions, with the backend's clash error surfaced inline. A seat-allocation view per session (hall picker, auto-allocate button, a simple seat-grid or list showing student→seat, with manual drag-or-pick override for edge cases).

## 2. Invigilation Roster (`/exam-officer/invigilation`)
- Per exam session, an invigilator picker (lead + assistant roles), showing each staff member's existing duty load across the exam period so the Exam Officer isn't double-booking the same teacher into two simultaneous halls.

## 3. External Exam Registration (`/exam-officer/external-exams`)
- Candidate list per exam body/session year (`DataTable`), subject-combination editor per candidate, "Export Registration Data" button. A small CA-summary view per candidate (calling the backend's mapping endpoint) for cross-checking before submission season.

## 4. Malpractice Log (`/exam-officer/malpractice`)
- A form (exam session or CBT attempt reference, student, description, action taken) and a list — visually distinct from `/admin/discipline`, same reasoning as Stage 21's Front Desk incident log: different model, different nav, no shared component beyond page layout.

## 5. Statistics (`/exam-officer/statistics`)
- Pass-rate chart per subject/class (bar chart, Recharts per design system §6), subject-comparison chart across arms. No item-analysis section yet — that's explicitly a later Phase 3 addition once Stage 22's anti-cheating/item-analysis work happens.

**Done when**: every remaining Exam Officer nav item in `dashboard-config.ts` resolves to a real page, an exam timetable can be built without clashing against the regular class schedule, and the BECE/WAEC candidate export produces a real downloadable Excel file with correct subject combinations per student.
