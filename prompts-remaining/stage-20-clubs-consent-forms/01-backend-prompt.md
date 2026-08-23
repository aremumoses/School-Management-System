# Stage 20 — Backend Prompt (Clubs & Activities, Consent Forms)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 and 11 are complete. Closes two small, unrelated `docs/22-implementation-status.md` rows bundled into one stage because each is too small to be its own: Student's Clubs & Activities, and Parent's Consent Forms.

---

## 1. `ClubsModule`

Read `docs/06-dashboard-student.md` §12 first. **Note**: the spec only describes the student-facing *read* view ("view clubs... enrolled in") — it doesn't specify who manages club rosters. Infer the obvious minimal Admin-side management capability rather than leaving it entirely unmanageable; don't over-build (no club budgets, no attendance-per-club-meeting — that's not asked for).

- `Club` model: name, description, optional meeting schedule (free text is fine — "Wednesdays, 4–5pm, Hall B"), `patronStaffId` (the supervising teacher).
- `ClubMembership` model: `clubId`, `studentId`, joined date.
- `POST /clubs`, `PATCH /clubs/:id` — `@Roles('ADMIN', 'VICE_PRINCIPAL')`.
- `POST /clubs/:id/members`, `DELETE /clubs/:id/members/:studentId` — `@Roles('ADMIN', 'VICE_PRINCIPAL')` (the patron teacher managing their own club's roster is a reasonable later addition but isn't asked for here — don't add it unprompted).
- `GET /clubs` (all, for Admin), `GET /students/:id/clubs` (a student's own — students/guardians can read only their own/their child's).

## 2. `ConsentFormsModule`

Read `docs/07-dashboard-parent.md` §6 first.

- `ConsentForm` model: title, description, type (`EXCURSION` | `MEDICAL` | `PHOTO_VIDEO` | `OTHER`), `createdByStaffId`, optional target scope (whole school / specific class — reuse the same targeting shape Stage 7's broadcasts already use, don't invent a new targeting concept).
- `ConsentResponse` model: `consentFormId`, `studentId`, `guardianId`, `response` (`CONSENTED` | `DECLINED`), `respondedAt`, e-signature representation — a typed full-name confirmation plus timestamp is sufficient (this codebase has no handwritten-signature capture anywhere else — Stage 9's documents use the same "name + timestamp" e-signature convention; reuse that precedent, don't add a drawing/signature-pad library for this one feature).
- `POST /consent-forms` — `@Roles('ADMIN', 'VICE_PRINCIPAL', 'CLASS_TEACHER')` (a Class Teacher sending an excursion form for just their class is a realistic case).
- `GET /consent-forms` — scoped: staff see ones they created or are unscoped for; guardians see ones targeting their child(ren).
- `POST /consent-forms/:id/respond` — `@Roles('PARENT')`, one response per student per form (upsert, same idempotent pattern as Stage 9's RSVP).
- `GET /consent-forms/:id/responses` — `@Roles('ADMIN', 'VICE_PRINCIPAL', 'CLASS_TEACHER')`, the response tally + respondent list (same shape as Stage 9's event-RSVP respondent list — reuse that pattern, don't invent a new one).

**Done when**: an Admin can create a club and enroll a student, that student sees it on their own Clubs screen; a Class Teacher can send an excursion consent form to their class, a Parent can e-sign (consent or decline) for their child, and the Class Teacher can see exactly which guardians have and haven't responded.
