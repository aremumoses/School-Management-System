# Stage 12 — Frontend Prompt (Admissions Pipeline)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done. Closes the same gap as the backend prompt — see `docs/22-implementation-status.md` Admin §"Admissions (applicant pipeline)".

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Public application form (`/apply`, no auth)
- A standalone route **outside** every dashboard layout (not under `/admin`, `/parent`, etc. — this page has no logged-in user). Simple multi-step form (bio-data → guardian contact → intended class) posting to `POST /admissions/apply`, then a confirmation screen with a "Pay Application Fee" button (Paystack inline widget, public key only, same pattern as `pay-now-button.tsx`) and a reference number the applicant can use to check status later (a simple, unauthenticated `GET /admissions/status/:reference`-style lookup — add this read-only endpoint to the backend if it doesn't already cover it).
- This is the one screen in the whole product that has to look credible to a parent who has never heard of the school's system before — get the empty/loading/error states right.

## 2. Admin admissions queue (`/admin/admissions`)
- A case list (applicant name, intended class, status badge, application-fee-paid indicator, submitted date) using the established `DataTable` pattern, linking to an applicant detail page.
- Detail page: full bio-data, guardian contact, application-fee status, reviewer notes, Approve/Reject actions (Reject requires a reason, same `AlertDialog`-with-required-field pattern as Stage 9's discipline rejection flow), and once `APPROVED`, a "Convert to Student" form (class + arm picker, optional manual admission-number override) that calls `POST /admissions/:id/convert` and links straight to the new student's profile on success.
- Offer letter: once `APPROVED`, show a download link for the generated PDF (poll-and-refresh for the async render the same way Stage 9's `documents-table.tsx` does for the async PDF pipeline — don't leave it stuck on "Rendering…" with no way to see it finish).

## 3. Nav wiring
- Add `{ label: 'Admissions', href: '/admin/admissions' }` to the admin segment in `dashboard-config.ts` (the spec already lists it in §"Screens", so check it isn't already a dead nav entry pointing nowhere before adding it — `docs/22-implementation-status.md` says it currently has no page behind it).
- Add "record new admission" as one of the Admin home's quick-link tiles, once Stage 13 builds the Admin home's KPI/quick-link layout (if Stage 13 hasn't run yet, skip this sub-item — don't build a one-off home-page change here that Stage 13 will then conflict with).

**Done when**: a parent with no account can submit a real application from `/apply`, pay a real Paystack test transaction, an Admin can review and approve it from `/admin/admissions`, download an offer letter that visually matches the design system, and convert the applicant into a working student+guardian login — end to end, no manual database steps.
