# Stage 5 — Backend Prompt (Academics & Results Engine)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–4 are complete. This is the biggest, most important stage — take it slowly and test thoroughly; this is the engine the whole product is judged on.

---

Read **`docs/14-module-academic-results.md` in full** before starting — every section number below refers to it.

## 1. `AssessmentModule`
- `AssessmentComponent` CRUD (e.g. CA1, CA2, CA3, Exam — each with a `maxScore` and a `weight`), scoped per term, configurable per school per §2. Validate weights sum to 100 (or to the school's configured total) before allowing them to be activated for a term.

## 2. `ScoreModule`
- `POST /scores/submit` — accepts `{ classSubjectId, termId, entries: [{ studentId, assessmentComponentId, score }] }`. Guard with `@Roles('SUBJECT_TEACHER')`. Validate: each score ≤ that component's `maxScore`; the caller is the assigned teacher for that `ClassSubject` (via `TeacherAssignment`, never trust the request body); the term's score-entry deadline hasn't passed. Upsert in a transaction. On success, **lock** that teacher's rows for that class+subject+term (a `locked` boolean or a separate submission record) per §3.
- `POST /scores/unlock` — `@Roles('EXAM_OFFICER', 'ADMIN')` only, re-opens a locked submission with a required `reason` field, written to `AuditLog`.
- `GET /scores?classSubjectId=&termId=` — current scores for a class+subject (for the teacher's own grid, and the Exam Officer's broadsheet).

## 3. Grading & ranking (§4–5)
- A `GradingService` that, given a total score and the School's configured grading-scale table (from Stage 2), returns the matching grade + remark.
- A ranking computation (can run on-demand or be cached/recomputed on every relevant score change): **position in subject** (rank within the class for that subject) and **overall position in class** (rank by aggregate/average across all registered subjects for that student). Implement the tie-handling rule from §5 (shared rank). Only compute overall class position once **all** subjects for that class+term are submitted and locked — expose a `GET /results/:classArmId/:termId/status` endpoint reporting which subjects are still outstanding.

## 4. `ResultModule` — approval workflow (§7)
- Endpoints for the workflow: Class Teacher submits affective/psychomotor ratings (§6 — model these as a fixed set of rated categories per student per term, e.g. punctuality/neatness/leadership/etc., each on the scale the school configures) + form-teacher comment → Exam Officer reviews/collates (broadsheet endpoint: `GET /results/:classArmId/:termId/broadsheet` returning the full class×subject grid with grades/positions) → Admin approves + adds principal's comment, or returns the batch for correction (with a reason) → `POST /results/:classArmId/:termId/publish` makes it visible to students/parents and triggers the report-card generation job.
- Track and expose the current stage of this workflow per class+term so the frontend can show real status, not just a guess.

## 5. Report card PDF generation (§6, §10 of `docs/18-technical-architecture.md`)
- Stand up BullMQ now (`@nestjs/bullmq`, Redis via Upstash). Build a `ReportCardProcessor`:
  - Renders an HTML template matching the **exact** layout in `docs/14-module-academic-results.md` §6: school header (logo/name/address from the School record), student bio block, per-subject table (CA breakdown/Exam/Total/Grade/Position in Subject/Class Average/Remark), summary row (overall position, class size), attendance summary (pulled from Stage 4's summary endpoint), affective/psychomotor ratings table, form teacher's comment, principal's comment, next term's resumption date.
  - Converts the HTML to PDF via **Puppeteer**, uploads it via the `StorageService`, and links the URL on the published result record.
- `POST /results/:classArmId/:termId/generate-report-cards` enqueues one job per student in the class (don't render synchronously in the request).

## 6. Promotion & transcript (§8–9)
- `POST /sessions/:id/promotion-suggestions` — given a configurable threshold, returns a suggested outcome (PROMOTED/REPEATED) per student based on their final-term aggregate — **suggestion only**, requires a separate `POST /students/:id/promote` confirm call by an Admin to actually change the `Enrollment` status. Never auto-apply without that explicit confirmation.
- `GET /students/:id/transcript` — aggregates results across all sessions for a student.

**Done when**: you can run a complete term-end cycle end-to-end via API calls alone — seed a class with multiple subjects and teachers, submit all scores, confirm the broadsheet computes correct grades/positions (verify by hand against a couple of rows), run the full approval workflow to Published, generate report-card PDFs for the whole class, and download one that visually matches §6's layout exactly. Write tests for the ranking/tie-handling logic specifically — that's the part most likely to have a subtle bug.
