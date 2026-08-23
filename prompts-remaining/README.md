# Remaining Work — Build Prompts

This folder is the sequel to [`/prompts`](../prompts/README.md): everything [`docs/22-implementation-status.md`](../docs/22-implementation-status.md) found missing or partial after auditing the live codebase, turned into the same copy-paste-ready, stage-by-stage prompt format `/prompts` used for Phase 1. Where `/prompts` built the system from zero through Phase 1, this folder finishes Phase 1's loose ends, then builds all of Phase 2, then Phase 3's differentiators.

**Read [`docs/22-implementation-status.md`](../docs/22-implementation-status.md) first.** Every stage below exists because of a specific ❌/🟡 row in that doc — the stage intros reference the exact rows they close out instead of re-explaining the gap.

## How to use this folder

Same rules as `/prompts`:
1. Work through the stages **in numeric order** — later stages assume earlier ones exist (e.g. the CBT engine's Question Bank assumes Stage 17's Resources module pattern; HR's Leave Requests fixes both the HR *and* Teacher dashboards at once).
2. **Backend prompt before frontend prompt**, within a stage.
3. Copy everything below the `---` divider in a prompt file, paste as one message.
4. Check the stage's "Done when" line before moving on. Don't stack unverified stages.
5. Commit after each stage.
6. After a stage ships, flip its rows in `docs/22-implementation-status.md` from ❌/🟡 to ✅ — keep that doc truthful, the same way you'd update a roadmap.

## Folder map

| Stage | Folder | Closes out | Backend? | Frontend? |
|---|---|---|---|---|
| 11 | `stage-11-hardening-phase1-golive/` | §0 — Stage 10 was never executed | ✅ | ✅ |
| 12 | `stage-12-admissions-pipeline/` | Admin §Admissions | ✅ | ✅ |
| 13 | `stage-13-admin-dashboard-depth/` | Admin's remaining ❌/🟡 rows | ✅ | ✅ |
| 14 | `stage-14-bursar-dashboard-completion/` | Bursar's remaining ❌/🟡 rows | ✅ | ✅ |
| 15 | `stage-15-student-parent-examofficer-completion/` | Frontend-only gaps where backend already exists (Student, Parent, Exam Officer) | — | ✅ (+ 1 small backend change) |
| 16 | `stage-16-timetable/` | Admin/Teacher/Student Timetable | ✅ | ✅ |
| 17 | `stage-17-lesson-notes/` | Teacher/Admin Lesson Notes | ✅ | ✅ |
| 18 | `stage-18-assignments-gradebook/` | Teacher/Student/Parent Assignments + Homework Tracker + Gradebook | ✅ | ✅ |
| 19 | `stage-19-resources-elibrary/` | Teacher/Student Resources / E-Library | ✅ | ✅ |
| 20 | `stage-20-clubs-consent-forms/` | Student Clubs & Activities, Parent Consent Forms | ✅ | ✅ |
| 21 | `stage-21-front-desk-pickup-authorization/` | Parent Pickup Authorization + full Front Desk dashboard | ✅ | ✅ |
| 22 | `stage-22-cbt-engine/` | The CBT & Examination Engine (biggest stage in this folder) | ✅ | ✅ |
| 23 | `stage-23-exam-officer-logistics/` | Exam timetable, invigilation, external exam registration, malpractice log, statistics | ✅ | ✅ |
| 24 | `stage-24-library-management/` | Full Librarian dashboard | ✅ | ✅ |
| 25 | `stage-25-hostel-transport/` | Full Hostel & Transport dashboard | ✅ | ✅ |
| 26 | `stage-26-hr-core/` | HR Phase 2: recruitment, leave, payroll, staff attendance, staff discipline, offboarding | ✅ | ✅ |
| 27 | `stage-27-hr-appraisals-training/` | HR Phase 3: appraisals, training/CPD log | ✅ | ✅ |
| 28 | `stage-28-communication-whatsapp-pwa/` | WhatsApp Business API channel, offline-first PWA, push notifications, USSD fallback | ✅ | ✅ |
| 29 | `stage-29-digital-id-at-risk-flagging/` | QR digital ID/gate-scan, early-warning at-risk flagging | ✅ | ✅ |
| 30 | `stage-30-ai-report-comments/` | AI-assisted report card comments (human-in-the-loop) | ✅ | ✅ |
| 31 | `stage-31-hardening-phase2-golive/` | Re-run Stage 11's checklist against everything Stages 12–30 added | ✅ | ✅ |

Within each stage folder, files are numbered so they sort in the order you should use them: `01-backend-prompt.md` before `02-frontend-prompt.md` (Stage 15 is the one exception — almost entirely frontend, called out in its own README note).

## Ordering rationale (why this order, not roadmap order)

[`docs/20-roadmap-phases.md`](../docs/20-roadmap-phases.md) groups by Phase (1/2/3) for *feature scoping* — deciding what's in vs out of an MVP. This folder orders by *build dependency and payoff*, which isn't the same thing:

1. **Stage 11 (hardening) comes first**, not last, because it closes a Phase 1 gap that's actively risky to leave open with real student/payment data already flowing — `docs/21-build-guide.md`'s own checklist calls this out before go-live, and it was simply never run.
2. **Stages 12–15 finish Phase 1** before any Phase 2 feature starts. Several of these (14, 15) are pure frontend against backends that already exist — cheap, high-value, and finishing them first means Phase 1 is *actually* done rather than "mostly done with five small gaps forever."
3. **Stages 16–21 are the Phase 2 items every other staff role's daily workflow depends on** (Timetable, Lesson Notes, Assignments, Resources) before the larger standalone Phase 2 systems (CBT, Library, Hostel/Transport, HR) that don't block anyone else.
4. **Stages 22–27 are the large, mostly-standalone Phase 2 systems**, ordered by how much they share with what's already built (CBT reuses the Stage 5 results/grading engine and Stage 17/19's content patterns; Library/Hostel/Transport/HR are closer to greenfield).
5. **Stages 28–30 are Phase 2/3 differentiators** — genuinely optional polish, sequenced last on purpose per `docs/20-roadmap-phases.md`'s own prioritization note.
6. **Stage 31 closes the loop**, re-running Stage 11's hardening checklist against everything this folder added, the same way Stage 10 did for Phase 1.

## The one shared file (still applies)

[`/prompts/00-DESIGN-SYSTEM.md`](../prompts/00-DESIGN-SYSTEM.md) is still the design system for every frontend prompt in this folder too — it's not duplicated here. If a stage needs a genuinely new pattern not covered there (the CBT exam-mode lockdown UI, for instance), that stage's frontend prompt says so explicitly and explains the exception, the same way `00-DESIGN-SYSTEM.md` §11 describes.

## Relationship to `/docs`

Same convention as `/prompts`: these prompts are deliberately compressed and point at the relevant `docs/*.md` section rather than re-explaining it. [`docs/22-implementation-status.md`](../docs/22-implementation-status.md) is the one new doc this folder leans on most — it's the audit trail proving every prompt here corresponds to a real, verified gap, not a guess.
