# Stage 29 — Backend Prompt (Digital ID/QR gate-scan, Early-Warning At-Risk Flagging)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9, 11, and 21 (Front Desk) are complete. Closes two of `docs/22-implementation-status.md`'s remaining differentiator rows, bundled together because each is too small to be its own stage. Both are Phase 2/3 polish per `docs/19-unique-differentiators.md` §5 and §8 — genuinely optional, sequenced last on purpose.

---

## 1. Digital ID with QR gate-scan verification

Read `docs/19-unique-differentiators.md` §8 and `docs/02-feature-list.md` §3 before starting.

- Add a `qrToken` (a long random opaque string, not the raw admission number — don't make the QR code guessable/predictable) to `Student`, generated once at enrollment (Stage 3's `create` path — add it there) or backfilled for existing students via a one-off script.
- `GET /students/qr/:qrToken` — `@Roles('FRONT_DESK', 'ADMIN', 'HOSTEL_WARDEN')`, resolves the token to the student's bio-data + their `AuthorizedPickupPerson` list (Stage 21) in one call — this is the actual point of the feature: front desk scans the student's ID, instantly sees who's allowed to collect them, without typing a name into a search box mid-conversation with a parent at the gate.
- No new student-facing endpoint is needed to *render* the QR code — a QR is just `qrToken` encoded client-side (see frontend prompt), the backend's job is only issuing the token and resolving it back.

## 2. Early-warning at-risk student flagging

Read `docs/19-unique-differentiators.md` §5 before starting.

- `AtRiskThresholdConfig` — school-configurable: attendance-rate floor (e.g. below 75% mid-term), CA-running-average floor (e.g. below 40%) — reuse the same kind of configurable-threshold pattern Stage 4's chronic-absenteeism flagging and Stage 18's gradebook at-risk flag already established; this is the third place such a threshold exists in the codebase, make sure all three read from a consistent config shape rather than three slightly different ones.
- A scheduled job (reuse `@nestjs/schedule`, same pattern as every other periodic check in this build) that, mid-term, evaluates every active student's current attendance rate and running CA average against the configured floors and creates/updates an `AtRiskFlag` record (studentId, reason, flaggedAt, resolvedAt nullable) when either crosses the threshold — **don't re-notify on every run for an already-flagged, still-at-risk student**; only notify on the transition into the flagged state, and again if it resolves.
- On a new flag, notify the student's Class Teacher and Admin (reuse `BroadcastsService`) — per the spec, parent notification is explicitly "optional," so make it a school-configurable toggle, not a hardcoded always-on send.
- `GET /students/at-risk?classId=` — `@Roles('CLASS_TEACHER', 'ADMIN', 'VICE_PRINCIPAL')`, current flagged students with their specific reason (attendance/CA/both).

**Done when**: scanning a real student's QR code at the front desk instantly resolves to that student's authorized-pickup list (verified end-to-end with a real generated QR, not just the raw token typed into the URL), and a student whose seeded mid-term attendance or CA average is deliberately pushed below the configured threshold is correctly flagged exactly once (not re-flagged every time the scheduled job runs while still below threshold).
