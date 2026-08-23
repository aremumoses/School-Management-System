# Stage 21 — Backend Prompt (Front Desk / Security + Pickup Authorization)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. Closes `docs/22-implementation-status.md`'s Front Desk dashboard (Phase 2) and Parent's Pickup Authorization row — they're one workflow split across two dashboards, build them together per the spec's own cross-reference. Build the **Phase 1/2 scope** of `docs/13-dashboard-front-desk-security.md` §1–6; §7 (Prospective Parent Inquiry CRM) is explicitly Phase 3 — skip it.

---

Read `docs/13-dashboard-front-desk-security.md` in full and `docs/07-dashboard-parent.md` §10 before starting.

## 1. Pickup Authorization (Parent-owned data)
- `AuthorizedPickupPerson` model: `studentId`, name, phone, relationship, optional photo URL, `addedByGuardianId`.
- `POST /students/:id/pickup-persons`, `DELETE /students/:id/pickup-persons/:personId` — `@Roles('PARENT')`, only for the caller's own linked child(ren) (reuse the existing guardian-student-link scoping pattern from `DocumentsService`/`IncidentsService`).
- `GET /students/:id/pickup-persons` — readable by the parent themselves and by Front Desk roles (added below), not by anyone else.

## 2. `FrontDeskModule`
- `Visitor` model: name, phone, reason, hostStaffId (who they're visiting), `signedInAt`, `signedOutAt`, optional photo URL.
- `POST /visitors/sign-in`, `POST /visitors/:id/sign-out` — `@Roles('FRONT_DESK', 'ADMIN')`.
- `GatePass` model: `studentId`, requestedByGuardianId (nullable — phone-verified front-desk-only requests have no guardian-initiated record), pickupPersonName, `verifiedAgainstAuthorizedList` (boolean), `issuedAt`, `issuedByStaffId`, status (`ISSUED` | `ESCALATED`).
- `POST /gate-pass` — `@Roles('FRONT_DESK', 'ADMIN')`. Accepts `studentId` + the pickup person's name/phone; looks them up against `AuthorizedPickupPerson` for that student. If matched, issues the pass and triggers a notification to the student's Class Teacher (reuse `BroadcastsService`, new `EARLY_PICKUP` template) per the spec's sample workflow. If **not** matched, create the record with status `ESCALATED` instead of `ISSUED` and notify Admin (per the spec's "Notifications received" — `UNRECOGNIZED_PICKUP_PERSON`) rather than silently blocking; an Admin-only `POST /gate-pass/:id/resolve` either confirms (flips to `ISSUED`) or rejects it.
- An optional pre-authorized early-pickup *request* path from the parent side: `POST /students/:id/pickup-requests` (`@Roles('PARENT')`, time + reason), surfaced to Front Desk as a pending queue so they're not starting from a cold phone call every time — per the spec's sample workflow this is the "parent calls ahead or submits a request" branch. Keep this as a thin request record front desk converts into a `GatePass` on arrival, not a duplicate of the `GatePass` model itself.
- `LateArrival` model: `studentId`, arrivalTime, `notifiedClassTeacher` (boolean). `POST /late-arrivals` — `@Roles('FRONT_DESK', 'ADMIN')`, optionally fires a notification to the student's Class Teacher (per spec, this is explicitly optional/configurable — a boolean flag on the request, not a hardcoded always-on send).
- `FacilityIncident` model — **deliberately distinct from Stage 9's `Incident`** (that one is `studentId`-required, student-discipline-only; this one is general security/facility, no student tie required): description, type (free text or a small enum — unauthorized-entry/altercation/lost-item/other), partiesInvolved (free text), actionTaken, `loggedByStaffId`, `loggedAt`. `POST /facility-incidents`, `GET /facility-incidents` — `@Roles('FRONT_DESK', 'ADMIN')`.
- `AssetMovement` model: assetDescription, direction (`OUT` | `IN`), reason, `loggedByStaffId`, `loggedAt`. `POST /asset-movements`, `GET /asset-movements`.
- `GET /front-desk/overview?date=` — today's visitor count, students currently out on gate pass, late-arrival count — one aggregate endpoint for the spec's "Gate Overview" screen, assembled from the models above (no new storage).

## 3. Data exports
- `GET /visitors/export`, `GET /gate-pass/export`, `GET /facility-incidents/export` (date-ranged Excel) — same `exceljs` pattern as Stage 13's exports.

**Done when**: a parent can add an authorized pickup person for their child from their own dashboard; front desk issuing a gate pass for a matching name correctly auto-notifies the Class Teacher; issuing one for an unrecognized name correctly creates an `ESCALATED` record and notifies Admin instead of silently succeeding; and a facility incident (e.g. "lost item at the gate") is logged without requiring a studentId, proving it's genuinely independent of Stage 9's student-discipline `Incident` model.
