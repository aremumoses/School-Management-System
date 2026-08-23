# Stage 9 — Frontend Prompt (Discipline, calendar & document screens)

> Copy everything below the line into Claude Code as one message. Assumes Stage 9's backend endpoints already exist.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Discipline (`/admin/discipline`, with a logging view for Class Teachers)
- A case list (student, severity badge, status, date), detail view showing the full incident + proposed/actual action + approval state. Severity badges use `warning` (minor) through `error` (severe) consistently. The Admin approval screen makes the irreversible nature of Suspension/Expulsion clear via a deliberate confirmation step, not a casual one-click button.

## 2. Calendar (`/[role]/calendar`)
- A month-grid view (toggle to a simple list view for mobile, where a month grid is cramped) showing term dates, holidays, and events as colored dots/chips. Clicking a day shows that day's items. Event creation (Admin) is a simple form (title, date/time, description, RSVP toggle); the RSVP button appears on event detail for everyone else, showing current response counts to the organizer.

## 3. Documents (`/admin/documents`, `/parent/documents`, `/student/documents`)
- Admin: a request/generate flow (pick student + document type + template) and an approval queue (DRAFT documents awaiting sign-off, with a preview before approving).
- Parent/Student: a simple list of their approved, downloadable documents — nothing in DRAFT state is ever visible here.

**Done when**: all three features work end-to-end through the UI, the calendar correctly renders a mix of term dates/holidays/events without visual clutter, and a parent never sees a document that hasn't been Admin-approved.
