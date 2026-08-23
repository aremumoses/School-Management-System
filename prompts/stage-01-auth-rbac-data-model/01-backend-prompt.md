# Stage 1 — Backend Prompt (Data model, auth, RBAC foundation)

> Copy everything below the line into Claude Code as one message. Assumes Stage 0's backend scaffold is already in place.

---

Read `docs/18-technical-architecture.md` §2–4 and `docs/03-roles-and-permissions.md` before starting — this stage builds the foundation everything else sits on, so it needs to match those specs exactly.

## 1. Prisma schema

In `/api`, add these Prisma models (single-school — no tenant/organization layer, see `docs/18-technical-architecture.md` §2):

- `School` — one row only: name, logo URL, address, registration number, motto, brand colors (for printed documents only, see `prompts/00-DESIGN-SYSTEM.md` §11), current academic session/term references, grading-scale config (store as JSON for now).
- `AcademicSession` (e.g. "2025/2026") → `Term` (First/Second/Third, with start/end dates and an `isCurrent` boolean).
- `Class` (e.g. JSS1, SSS2) and `Arm` (e.g. Gold, Science A), linked.
- `Subject`, and `ClassSubject` (which subjects exist at which class level).
- `Staff` (bio-data, employment date, contact), `Role` (enum or table: ADMIN, VICE_PRINCIPAL, HOD, CLASS_TEACHER, SUBJECT_TEACHER, EXAM_OFFICER, BURSAR, LIBRARIAN, HOSTEL_WARDEN, TRANSPORT_OFFICER, HR_OFFICER, FRONT_DESK — full list in `docs/03-roles-and-permissions.md` §1), `StaffRole` (join table — a staff member can hold multiple roles).
- `Student` (full bio-data per `docs/02-feature-list.md` §3: name, DOB, gender, state of origin, LGA, religion, blood group, genotype, address, photo URL, admission number).
- `Guardian` (bio-data, contact), `StudentGuardian` (join table with a `relationship` field).
- `Enrollment` (links Student to Class + Arm + Term, with a `status` field: ACTIVE, PROMOTED, REPEATED, TRANSFERRED, WITHDRAWN, GRADUATED).
- `AuditLog` (actorId, actorRole, action, entityType, entityId, beforeJson, afterJson, timestamp) — append-only, written to from Stage 1 onward for every sensitive write.

Generate the initial migration. Write a seed script (`prisma/seed.ts`) producing: 1 School row, 1 AcademicSession with 3 Terms (current term marked), 3 classes × 2 arms each, 6 subjects, 6 staff members covering at least Admin/Teacher/Bursar/Exam Officer roles, 20 students each with at least one linked guardian and an active enrollment.

## 2. Auth module

Build an `AuthModule`:

- `POST /auth/login` — accepts email + password, uses Passport's **local strategy** to validate against whichever of Staff/Guardian/Student has that email (check `docs/03-roles-and-permissions.md` §4 for who can log in), passwords hashed with **bcrypt**. On success, issue:
  - an **access token** (JWT, ~15 min expiry) containing `sub` (user id), `roles` (array), and `userType` (STAFF/GUARDIAN/STUDENT)
  - a **refresh token** (JWT, ~7 day expiry, stored hashed against the user so it can be revoked)
- `POST /auth/refresh` — exchanges a valid refresh token for a new access token; rejects if the refresh token has been revoked (e.g., staff offboarded).
- `POST /auth/logout` — revokes the refresh token.
- A `JwtStrategy` (Passport) that validates the access token on every protected route and attaches `req.user`.

## 3. RBAC enforcement

- Build a `@Roles(...roles: string[])` decorator and a `RolesGuard` that reads `req.user.roles` (set by `JwtStrategy`) and throws a `403 Forbidden` if none match. Apply it as a global guard, opt-out per-route with a `@Public()` decorator (used on `/health`, `/auth/login`, `/auth/refresh`) rather than opting in everywhere — fail closed by default.
- Every future module's endpoints will use `@Roles(...)`. Don't build any feature endpoints yet — just the mechanism.

## 4. Tests

Write tests proving:
- A request to a `@Roles('ADMIN')` route with a valid token for a non-admin role gets a 403.
- A request with no token gets a 401.
- A request with an expired token gets a 401.
- `/auth/refresh` with a revoked refresh token is rejected.

**Done when**: `npm run test` passes including the above, the seed script runs cleanly against a fresh database, and you can `curl` `/auth/login` with a seeded user's credentials and get back a working access token that successfully authorizes a protected test route.
