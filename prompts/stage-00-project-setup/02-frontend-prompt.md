# Stage 0 — Frontend Prompt (Next.js project setup)

> Copy everything below the line into Claude Code as one message. Run the Stage 0 backend prompt first — this one assumes the API's `/health` endpoint already exists.

---

I'm building the frontend for a School Management System for one secondary school in Lagos, Nigeria. The backend is a separate NestJS API (already scaffolded in `/api`, with a `GET /health` endpoint). This step sets up the Next.js project and the shared design system — no real screens yet.

Set up a new **Next.js** project in `/web`:

1. `create-next-app` with TypeScript, Tailwind CSS, App Router, and ESLint.
2. Install and initialize **shadcn/ui**. Configure `tailwind.config.ts` and `globals.css` with the exact design tokens from `prompts/00-DESIGN-SYSTEM.md` §2 (colors), §3 (font/type scale), and §4 (spacing/radius) — set these as theme extensions / CSS variables, not as one-off hardcoded values, so every later screen inherits them automatically.
3. Load **Inter** via `next/font/google` as the only font, per the design system.
4. Build a root layout (`app/layout.tsx`) with the font and theme provider wired up, and a placeholder home page.
5. Set up environment variables: create `.env.local.example` with `NEXT_PUBLIC_API_URL` (the NestJS API's base URL) and `NEXTAUTH_SECRET` (generate one with `openssl rand -base64 32` and document how to generate it in a comment, don't commit a real secret).
6. Build a small typed `apiFetch` helper (`lib/api.ts`) that wraps `fetch`, prefixes `NEXT_PUBLIC_API_URL`, and parses JSON — no auth header yet (that's Stage 1).
7. On the placeholder home page, call `GET /health` on the API via `apiFetch` and render a simple status line ("Backend: connected" / "Backend: unreachable") — this is just to prove the two services can talk to each other; replace it with the real landing/login flow in Stage 1.
8. Add a PWA-ready manifest (`app/manifest.ts`) with the app name, theme color (`primary` from the design system), and icon placeholders — full offline/installable behavior comes later (Stage 8/10), this just lays the groundwork so it's not retrofitted.
9. Confirm the project deploys cleanly to Vercel with `NEXT_PUBLIC_API_URL` pointed at the deployed (or local tunnel) API.

Follow `prompts/00-DESIGN-SYSTEM.md` for every visual decision — there shouldn't be any custom colors, fonts, or spacing values outside what that file defines, even on this placeholder page.

**Done when**: the app is live on Vercel, the home page renders with the Inter font and the design system's background/text colors applied, and it correctly shows "Backend: connected" when pointed at the live API's `/health` endpoint.
