# Stage 27 — Frontend Prompt (HR: Appraisals & Training/CPD)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Appraisal Cycles (`/hr/appraisals`)
- Cycle list + create form. A reviewer-facing form-fill screen (rendered dynamically from the cycle's configured form definition — rating scales + free text sections, similar in spirit to Stage 5's conduct-ratings form). Per-staff appraisal history view (timeline of past cycles' results).

## 2. Training Log (`/hr/training`)
- A form (staff picker, title, provider, date, optional certificate upload) and a per-staff training history list.

**Done when**: both nav items resolve to real pages, a reviewer can complete and sign off a structured appraisal for a staff member, and a staff member's training history shows every logged record with downloadable certificates.
