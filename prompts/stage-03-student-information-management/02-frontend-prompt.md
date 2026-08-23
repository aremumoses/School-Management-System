# Stage 3 — Frontend Prompt (Student records & bulk import screens)

> Copy everything below the line into Claude Code as one message. Assumes Stage 3's backend endpoints already exist.

---

Read `docs/02-feature-list.md` §3, and follow `prompts/00-DESIGN-SYSTEM.md` for every visual decision.

Build these screens under `/admin/students/*`:

## 1. Student Directory (`/admin/students`)
- A data table (per `00-DESIGN-SYSTEM.md` §6): photo thumbnail, name, admission number, class+arm, status badge, with filters for class/arm/session/status and a search box (debounced) for name/admission number. Pagination footer.
- "+ Add Student" primary button top-right; a "Bulk Import" secondary button next to it.

## 2. Student Profile (`/admin/students/[id]`)
- Tabbed layout: **Bio-data** (all fields from `docs/02-feature-list.md` §3, with the photo shown large at the top), **Guardians** (cards per guardian with relationship badge, contact info, and an "Invite/Resend login" action), **Documents** (a simple file list with type, upload date, and download/view, plus an uploader), **Academic History** (a clean timeline/table of past enrollments — class, arm, session, status).
- Edit happens inline per tab (not a separate edit mode toggle) — click a field, it becomes editable, save/cancel inline, per the form patterns in `00-DESIGN-SYSTEM.md` §6.

## 3. Add Student (`/admin/students/new`)
- A multi-step form (Bio-data → Guardian(s) → Class/Arm placement) using shadcn's stepper pattern, with a progress indicator at the top. Each step validates before letting you continue (React Hook Form + Zod).

## 4. Bulk Import (`/admin/students/import`)
- Step 1: drag-and-drop/click Excel upload, with a downloadable template link.
- Step 2: validation preview — a table showing every row with a status icon (✓ valid / ⚠ has errors), errors shown inline per row in `error` color so the Admin knows exactly what to fix without leaving the screen.
- Step 3: a clear count summary ("47 of 50 rows valid") and a "Confirm Import" button that's disabled until at least reviewed; after confirming, show a success state with a link back to the Student Directory.
- This whole flow is the **first real test of the product for a migrating school** — it should feel reassuring and clear, not like a raw data-processing tool. Use generous whitespace, clear step labels, and never let an error look like a crash.

**Done when**: every screen above works end-to-end against the real API, the bulk import flow has been tried with a deliberately messy test spreadsheet and produces a clear, actionable validation report, and the whole student-management flow works cleanly on a 375px mobile viewport (Admins sometimes do this from a phone too).
