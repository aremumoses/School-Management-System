# Stage 8 — Frontend Prompt (Parent & Student dashboard polish)

> Copy everything below the line into Claude Code as one message. This is a frontend-only stage — no backend changes — assumes Stages 1–7 are complete. This is the stage where the product goes from "functional" to "the thing a parent actually enjoys opening."

---

Read `docs/07-dashboard-parent.md` and `docs/06-dashboard-student.md` in full, and follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Multi-child switcher
- Build it once as a shared component: an avatar-row or dropdown at the top of the Parent dashboard, switching the active child context for every screen below it (attendance, fees, results, assignments). Persist the last-selected child across navigation (don't reset to the first child on every page load). If the guardian has only one child, hide the switcher entirely rather than showing a useless single-item control.

## 2. Assignments view (`/student/assignments`, with a read-only equivalent for parents)
- A list grouped by status (Due soon / Submitted / Graded), each item showing subject, title, due date, and a status badge. Detail view shows the full instructions, a file-upload submission control (drag-and-drop, with upload progress), and once graded, the score/feedback shown clearly. "Due soon" items within 48 hours get a subtle `warning` accent so nothing is missed.

## 3. Performance trend dashboard (`/parent/performance`, `/student/performance`)
- Per-subject line charts (Recharts, per `00-DESIGN-SYSTEM.md` §6) showing score trend across terms, plus a single overall-average trend line. Highlight the most-improved and most-declined subject since last term as two small callout cards — this is the kind of insight that makes a parent actually want to open the app, not just tolerate it.

## 4. Full mobile responsiveness & PWA pass
Go through **every** Parent and Student screen built in Stages 1–7 (login, dashboard home, attendance, results/report card, fees, notices, messages, assignments) and verify against this checklist, fixing anything that fails:
- [ ] No horizontal scroll or overflow at 375px width except where deliberately designed (e.g. the broadsheet, which isn't a parent/student screen anyway).
- [ ] All touch targets ≥44×44px.
- [ ] The bottom tab bar (per `00-DESIGN-SYSTEM.md` §5) is present and correctly highlights the active section on every screen.
- [ ] Every async load has a skeleton state, not a blank screen or bare spinner.
- [ ] Images (student photos, school logo) are served at an appropriately small size for mobile, not full-resolution originals.
- [ ] The PWA manifest from Stage 0 is complete with real icons; confirm "Add to Home Screen" works on an Android browser and the installed app opens to the right place (last-viewed dashboard, not always the login screen if already authenticated).
- [ ] Run a Lighthouse mobile audit on the 3 most-used screens (dashboard home, attendance, fees) and fix anything scoring below "Good" on Performance and Accessibility.

**Done when**: a parent can do everything they need — check attendance, view a report card, pay a fee, read a notice, message a teacher, switch between two children — entirely on a real Android phone, installed as a home-screen app, without ever needing to rotate to landscape or pinch-zoom to read something.
