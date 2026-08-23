# Stage 21 — Frontend Prompt (Front Desk / Security + Pickup Authorization)

> Copy everything below the line into Claude Code as one message. Assumes this stage's backend prompt is done.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout.

## 1. Parent Pickup Authorization (`/parent/pickup-authorization`)
- Per-child (reuse `ChildSwitcher`) list of authorized pickup persons (name, relationship, phone, optional photo) with add/remove. This is a safety-relevant list — removing someone should use the existing `ConfirmDeleteButton` pattern, not a casual one-click remove.
- An "Request Early Pickup" form (time, reason) feeding the optional pre-authorized request path the backend added.

## 2. Front Desk Gate Overview (`/front-desk`)
- Replace the placeholder home with today's stat cards: visitor count, students currently out on gate pass, late arrivals — calling `GET /front-desk/overview`.

## 3. Visitor Sign-In/Out (`/front-desk/visitors`)
- A sign-in form (name, phone, reason, host staff picker), a live "currently signed in" list with a one-tap Sign Out action, and a full day's log below it.

## 4. Gate Pass / Pickup Verification (`/front-desk/gate-pass`, `/front-desk/pickup-verification`)
- A student picker + pickup-person name/phone entry, calling `POST /gate-pass`. On a match, show a clear success state ("✓ Matches an authorized pickup person — pass issued, Class Teacher notified"). On no match, show the escalation state clearly (not as an error — this is an expected, handled path, not a bug) with next-step copy ("Escalated to Admin — do not release the student until resolved").
- An Admin-facing resolve action for escalated passes (confirm/reject) — can live on this same screen if the logged-in user is Admin, or a small section under `/admin/discipline`-adjacent admin tooling; keep it simple, don't build a separate admin route just for this.

## 5. Late Arrivals (`/front-desk/late-arrivals`)
- A simple form (student picker, arrival time, notify-class-teacher toggle) and today's log.

## 6. Incident Log (`/front-desk/incidents`)
- A form (type, description, parties involved, action taken) and a list — visually distinct from Stage 9's `/admin/discipline` (different nav, different data, no shared component beyond maybe the page layout shell) since this is a different model entirely.

## 7. Asset Movement (`/front-desk/asset-movement`)
- A simple form (description, direction OUT/IN, reason) and a log list.

## 8. Data exports
- "Export to Excel" buttons on the Visitor log, Gate Pass log, and Incident log screens.

**Done when**: a parent-added pickup person correctly shows as a match at the gate-pass screen and an unlisted name correctly triggers the escalation flow (verified both ways), and every Front Desk nav item in `dashboard-config.ts` now resolves to a real page instead of falling through to the "Coming Soon" catch-all.
