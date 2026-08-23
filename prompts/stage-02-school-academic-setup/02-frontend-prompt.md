# Stage 2 — Frontend Prompt (Admin: school & academic setup screens)

> Copy everything below the line into Claude Code as one message. Assumes Stage 2's backend endpoints already exist.

---

Read `docs/04-dashboard-school-admin.md` §4 (Academic Setup) and §13 (Settings), and follow `prompts/00-DESIGN-SYSTEM.md` for everything visual. Regenerate the typed API client from the NestJS OpenAPI spec before starting, per `docs/21-build-guide.md` §5, so these screens are calling real typed endpoints, not guesses.

Build these screens under `/admin/settings/*` and `/admin/academics/*`:

## 1. School Profile (`/admin/settings/school`)
- A form: name, address, registration number, motto, a logo uploader (drag-and-drop + click-to-browse, with a live preview), and a small color-picker pair for the school's *document* brand colors. Add a clearly worded note near the color picker: "These colors appear on printed report cards and receipts only — they don't change how this app looks." (See `00-DESIGN-SYSTEM.md` §11.)
- A separate **Grading Scale** card: an editable table of score-range → grade → remark rows (add/remove rows), and the CA/Exam weighting inputs with a live-computed "Total: __%" that turns red if it isn't 100.

## 2. Academic Session & Term setup (`/admin/academics/sessions`)
- A list of sessions (card or table), each expandable to show its 3 terms with start/end dates and a "Set as current" action (radio-style — only one current term at a time, with a confirmation dialog since this affects the whole school).
- "+ New Session" opens a form that scaffolds the 3 terms in one step.

## 3. Classes & Arms (`/admin/academics/classes`)
- A two-level list: classes, each expandable to show its arms, with inline add/edit/delete (use shadcn `Dialog` for the add/edit forms, not full page navigations — this is a frequently-repeated small task and shouldn't feel heavy).

## 4. Subjects (`/admin/academics/subjects`)
- A searchable table of subjects. Each subject's detail view shows which class levels it's mapped to (multi-select checkboxes against the class list) — saving updates the `ClassSubject` mappings.

## 5. Staff Directory (`/admin/staff`)
- A searchable/filterable table (name, role badges, department, date employed) using the data-table pattern from `00-DESIGN-SYSTEM.md` §6. Each row opens a detail view with bio-data, a role-assignment multi-select (rendered as removable badges), and a "Teaching Assignments" section listing/editing which Class+Subject+Term combinations this staff member teaches.

Every list screen here needs a real empty state (e.g., "No subjects yet — add your school's first subject" with a button), not a blank table, since a brand-new school starts with nothing.

**Done when**: starting from a fresh Admin login, you can — through the UI alone, no API calls by hand — fully set up a new academic session, classes, arms, subjects, subject-to-class mappings, staff records, and teacher assignments, and everything persists correctly on reload.
