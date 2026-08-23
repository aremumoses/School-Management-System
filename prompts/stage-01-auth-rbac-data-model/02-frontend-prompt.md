# Stage 1 — Frontend Prompt (Login, session, role-based shell)

> Copy everything below the line into Claude Code as one message. Assumes Stage 1's backend (auth endpoints) is already built and deployed/running locally.

---

Read `docs/03-roles-and-permissions.md` §1 for the full role list, and `prompts/00-DESIGN-SYSTEM.md` for every visual decision below.

## 1. Auth bridge

Set up **Auth.js (NextAuth v5)** in `/web`:

- A **Credentials provider** whose `authorize()` calls the NestJS API's `POST /auth/login` with the submitted email/password. On success, return a user object containing the access token, refresh token, and role(s) so they end up in the session/JWT.
- Configure the NextAuth JWT callback to refresh the access token using `/auth/refresh` when it's near expiry, transparently, so a logged-in user isn't randomly logged out mid-session.
- Update `lib/api.ts`'s `apiFetch` helper to automatically attach `Authorization: Bearer <accessToken>` pulled from the current session to every request.
- Middleware (`middleware.ts`): redirect unauthenticated users to `/login` for any route under `/admin`, `/teacher`, `/student`, `/parent`, etc.; redirect authenticated users away from `/login` to the dashboard matching their primary role.

## 2. Login page (`/login`)

Build a clean, centered login form:
- School name/logo placeholder at the top, email + password fields (shadcn `Form` + `Input`), a primary submit button with a loading spinner while pending, and inline error messaging (in `error` color, per the design system) if login fails — never a raw error message, a friendly one like "Email or password is incorrect."
- Fully responsive: on mobile it's a single centered card near the top of the viewport; on desktop, centered both axes with generous whitespace. This is the very first impression of the product — it should feel calm and trustworthy, not bare.

## 3. Role-based dashboard shells

Build the layout shells (no real feature content yet — just nav + an empty state) for these roles, each behind its own route group: **Admin** (`/admin`), **Teacher** (`/teacher`), **Student** (`/student`), **Parent** (`/parent`). Stub placeholder nav items for the other staff roles (Bursar, Exam Officer, Librarian, Hostel/Transport, HR, Front Desk) so the structure exists, even if their dashboards are empty until later stages.

- **Admin/Teacher/staff shells**: persistent left sidebar (per `00-DESIGN-SYSTEM.md` §5) with nav items relevant to that role (pull the section list from that role's doc, e.g. `docs/05-dashboard-teacher.md`), a top bar with page title + a user menu (avatar initials, name, role badge, logout).
- **Student/Parent shells**: mobile-first, bottom tab bar below `md`, sidebar above `md` — same nav-item logic.
- Each empty dashboard home should show a friendly "Welcome, {name}" with a short note that this section is coming in a later stage — not a blank white page.
- Logout button calls NextAuth's `signOut()` and also hits the API's `/auth/logout` to revoke the refresh token.

## 4. Loading & error states

- Show a full-page skeleton (matching the eventual sidebar+content layout) while the session is being resolved on first load — never a flash of unstyled content or a blank screen.
- If the API is unreachable, show a friendly full-page error state ("We can't reach the server right now") rather than an unhandled crash.

**Done when**: you can log in as each of the four seeded user types from Stage 1's backend seed data and land on four visually distinct (but design-system-consistent) dashboard shells, each showing the correct nav items for that role; logging out and trying to revisit a protected URL redirects to `/login`; and a direct, manually-crafted request to a role-restricted page while logged in as the wrong role is blocked (server-side, not just hidden in the nav).
