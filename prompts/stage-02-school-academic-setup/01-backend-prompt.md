# Stage 2 — Backend Prompt (School profile & academic structure)

> Copy everything below the line into Claude Code as one message. Assumes Stage 1's auth/RBAC and Prisma models already exist.

---

Read `docs/04-dashboard-school-admin.md` §4 and `docs/02-feature-list.md` §1 & §5 before starting.

Build these NestJS modules in `/api`, all guarded with `@Roles('ADMIN')` for writes (per `docs/03-roles-and-permissions.md` §2, "School setup" and "Class/Subject/Timetable setup" rows — a few reads are open to other roles, noted below):

## 1. `SchoolModule`
- `GET /school` — returns the single School row (open to any authenticated role — everyone needs the school name/logo for headers).
- `PATCH /school` — update profile fields (name, address, registration number, motto, brand colors for documents). Admin only.
- `POST /school/logo` — upload endpoint, stores the file in object storage (set up an `S3Service`/`StorageService` wrapping the Supabase Storage or AWS S3 SDK now — you'll reuse it in Stage 3+ for student photos and documents) and saves the resulting URL on the School row.
- `PATCH /school/grading-scale` — update the grading-scale config (the score-range → grade mapping described in `docs/14-module-academic-results.md` §4) and the CA/exam weighting (§2 of that doc). Validate weights sum to 100.

## 2. `AcademicModule`
- Full CRUD for `AcademicSession` and `Term` (with an endpoint to set which Term is current — only one can be current at a time, enforce that in a transaction).
- Full CRUD for `Class` and `Arm`.
- Full CRUD for `Subject` and `ClassSubject` (which subjects exist at which class level — validate a subject can't be mapped to a class level twice).
- All list endpoints (`GET`) open to any authenticated role (Teacher/Student/Parent dashboards need to read class/subject names); writes Admin-only.

## 3. `StaffModule`
- CRUD for `Staff`.
- `POST /staff/:id/roles` / `DELETE /staff/:id/roles/:roleId` — assign/remove roles from a staff member (a staff member can hold several, per `docs/03-roles-and-permissions.md` §1).
- A `TeacherAssignment` model + endpoints: assign a Staff member to teach a specific `ClassSubject` — this is what Stage 5's score-entry RBAC checks against later, so get the relation right now (`TeacherAssignment(staffId, classSubjectId, termId)`).
- `GET /staff` open to Admin/HR; individual staff can `GET /staff/me`.

Add Swagger decorators to all of the above so `/api/docs` is a usable reference for the frontend stage.

**Done when**: starting from a freshly seeded database, you can — purely through API calls — create a new academic session with 3 terms, mark one current, add classes/arms/subjects, map subjects to class levels, and assign a teacher to a class+subject for the current term. Add an e2e test covering this full setup sequence.
