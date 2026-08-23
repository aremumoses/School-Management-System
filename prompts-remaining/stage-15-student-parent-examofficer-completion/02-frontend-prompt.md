# Stage 15 — Frontend Prompt (Student, Parent & Exam Officer dashboard completion)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt (and Stage 13's Assessment Structure page, for §3 below) are done. Every screen in this prompt calls a backend endpoint that **already exists** — `docs/22-implementation-status.md` confirms these are pure frontend gaps across the Student (§3), Parent (§4), and Exam Officer (§6) sections.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout — §9's mobile-first rule applies especially to §1–2 below.

## 1. Student Profile (`/student/profile`)
- View own bio-data, class/arm, admission number, photo (calling `GET /students/:id` with the logged-in student's own id). Allow editing non-sensitive fields only (address, phone if the school collects one for the student directly) via `PATCH /students/:id` — leave admission number, class/arm, and guardian links read-only here (those change through Admin/enrollment flows, not self-service).

## 2. Student Fee Status (`/student/fees`)
- Read-only view of the student's own invoice balance/status (calling the existing `GET /invoices` scoped to the student) — explicitly no "Pay Now" button here, payment stays a Parent-only action per the permissions matrix.

## 3. Exam Officer's Assessment Structure, Result Approval, and Transcripts pages
- `/exam-officer/assessment-structure` — same component built for `/admin/assessment-structure` in Stage 13, mounted under the Exam Officer segment too (Exam Officer has "E" on this per the permissions matrix).
- `/exam-officer/result-approvals` — a dedicated approval queue (currently this workflow only has a UI under `/admin/results`) showing per-arm submission status and the approve/return actions Exam Officer is permitted (collate and send-for-approval, not final publish — that stays Admin-only, confirm the role boundary against `docs/03-roles-and-permissions.md` §2 before wiring buttons).
- `/exam-officer/transcripts` — a student picker + transcript view/download, calling the existing `TranscriptService` endpoint already consumed by `/student/results`.

## 4. Student↔Teacher messaging (`/student/messages`)
- Reuse the existing `messaging-shell` component (already built for Teacher/Parent in Stage 7) — same UI, scoped to the student's own teachers via this stage's backend change.

## 5. Parent dashboard home (`/parent`)
- Replace the generic placeholder with per-child summary cards (today's attendance status, current term fee balance with a "Pay Now" shortcut, 3 most recent notices) for the active child in the child switcher — reuse the `ChildSwitcher` component already built for Attendance/Fees/Results.

**Done when**: every row marked "frontend only, backend already exists" across `docs/22-implementation-status.md` §3, §4, and §6 now shows ✅, and a Student can view (but not pay) their own fee status while a Parent retains the only "Pay Now" button in the product.
