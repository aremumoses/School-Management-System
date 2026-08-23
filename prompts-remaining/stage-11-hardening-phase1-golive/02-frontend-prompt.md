# Stage 11 — Frontend Prompt (Phase 1 hardening, for real this time)

> Copy everything below the line into Claude Code as one message. Assumes the backend prompt in this stage is done. `docs/22-implementation-status.md` §0 confirms `app/error.tsx`, `app/not-found.tsx`, and `app/manifest.ts` already exist (incidental, from earlier general scaffolding) but Sentry and the rest of the original Stage 10 frontend checklist were never run.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout — this stage is partly a final consistency audit against it.

## 1. Error & empty states
- Confirm `app/error.tsx` and `app/not-found.tsx` (both already exist) actually match the design system (on-brand, not framework-default plain text) and have a working "Go back home" action — verify, don't assume.
- Sweep every list/table screen built across Stages 1–9 and confirm each has a real empty state (icon + message + action where relevant). Fix any that still show a bare empty table.

## 2. Performance & accessibility audit
- Run Lighthouse (mobile profile, simulated slow 3G/4G) on the login page and the Admin, Teacher, and Parent dashboard homes. Fix anything scoring below "Good" on Performance, Accessibility, and Best Practices.
- Confirm every interactive element has a visible focus ring and is reachable via keyboard-only navigation (Tab through a full page of each major dashboard).

## 3. Sentry
- Install `@sentry/nextjs` (not currently a dependency — confirm). Confirm a deliberately-thrown test error in a non-production environment appears in Sentry with a useful stack trace and the logged-in user's **role** attached as context — not their name or email; keep PII out of error reports.

## 4. PWA & installability
- Confirm `app/manifest.ts` (already exists) and its icons pass an installability check (Chrome's "Add to Home Screen" prompt appears on Android), and that the installed app's splash screen and theme color match the design system.

## 5. Final visual consistency pass
- Go screen by screen across every route built in Stages 1–9 and check against `00-DESIGN-SYSTEM.md`: consistent button styles, consistent badge colors for the same semantic meaning across different modules (a "Paid" badge and an "Approved" badge should read as the same visual language), consistent spacing, no orphaned default-Tailwind-blue links or unthemed buttons.

## 6. Production deploy
- Confirm the production deployment uses the live API URL (not localhost/staging), `NEXTAUTH_SECRET` is a freshly generated production value, and a custom domain with SSL resolves correctly.

**Done when**: Lighthouse scores "Good" or better on Performance/Accessibility/Best Practices for the three audited pages, a full keyboard-only pass through the Admin and Parent dashboards works without a mouse, the installed PWA looks intentional, and a final click-through of every Stage 1–9 dashboard shows one consistent visual product.
