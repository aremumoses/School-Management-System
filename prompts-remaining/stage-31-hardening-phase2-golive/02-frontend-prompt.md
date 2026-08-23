# Stage 31 — Frontend Prompt (Phase 2/3 hardening & go-live)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout — same final consistency audit Stage 11 ran, now extended to every screen Stages 12–30 added.

## 1. Error & empty states — new screens
- Sweep every list/table screen added across Stages 12–30 (a lot of them — Admissions, Timetable, Lesson Notes, Assignments, Resources, Clubs, Consent Forms, Front Desk's six screens, CBT's question bank/test builder/test-taking, Exam Officer Logistics' five screens, Library's six screens, Hostel's eight screens, Transport's six screens, HR's nine screens) and confirm each has a real empty state, not a bare table.

## 2. Performance & accessibility audit — the new mobile-critical screens
- Run Lighthouse specifically against the screens this folder flagged as mobile-critical: the CBT test-taking screen (Stage 22), the hostel roll-call and transport pickup-attendance screens (Stage 25), and the student/parent screens added in Stages 15/18/19/20/29. These are the ones most likely to actually be used on a phone in the field, not at a desk.
- Re-confirm keyboard-only navigation works through the new Admin/HR-heavy screens (payroll review, recruitment pipeline) — these involve more complex multi-step flows than Stage 11's original audit covered.

## 3. Visual consistency — the full product, now complete
- A final screen-by-screen pass across **every** route in the product (Stages 1–30 combined) against `00-DESIGN-SYSTEM.md` — this is the last time this checklist runs in this build plan, treat it as the actual final QA pass before the product is considered feature-complete against `docs/20-roadmap-phases.md`'s full three-phase scope.
- Specifically check the non-student-discipline incident logs (Stage 9's `/admin/discipline`, Stage 21's Front Desk incident log, Stage 23's malpractice log, Stage 25's hostel discipline cross-reference, Stage 26's HR disciplinary records) read as a coherent visual family despite being five separate models — same badge conventions, same form patterns — not five subtly different incident-logging UIs that happen to share a sidebar.

## 4. Module toggles, for real this time
- Stage 13 built the Settings UI for hiding Hostel/Transport/Library/CBT nav items per school. Now that those modules actually exist (Stages 22–25), confirm toggling one off genuinely hides its nav entries and routes redirect sensibly (not a 404) rather than just changing a setting with no visible effect.

**Done when**: Lighthouse scores "Good" or better on the newly-flagged mobile-critical screens, a full click-through of every dashboard in the product (all ten) shows one visually coherent product rather than thirty stages bolted together, and toggling a module off in Settings demonstrably changes what a school using this system actually sees.
