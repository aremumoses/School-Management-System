# Stage 10 — Frontend Prompt (Hardening, QA & launch polish)

> Copy everything below the line into Claude Code as one message. Assumes Stages 1–9 are complete. Last stage before this goes in front of real parents and staff.

---

Follow `prompts/00-DESIGN-SYSTEM.md` throughout — this stage is partly a final consistency audit against it.

## 1. Error & empty states
- Build a styled global error boundary (`app/error.tsx`) and `not-found.tsx` — both on-brand (per the design system, not the framework's default plain text), with a clear "Go back home" action.
- Sweep every list/table screen built in Stages 1–9 and confirm each has a real empty state (icon + message + action where relevant) — fix any that still show a bare empty table.

## 2. Performance & accessibility audit
- Run Lighthouse (mobile profile, simulated slow 3G/4G) on the login page, and the Admin, Teacher, and Parent dashboard homes. Fix anything scoring below "Good" on Performance, Accessibility, and Best Practices — common culprits at this point are unoptimized images and missing `aria-label`s on icon-only buttons (per `00-DESIGN-SYSTEM.md` §8).
- Confirm every interactive element has a visible focus ring and is reachable via keyboard-only navigation (Tab through a full page of each major dashboard).

## 3. Sentry
- Wire up `@sentry/nextjs`, confirm a deliberately-thrown test error in a non-production environment appears in Sentry with a useful stack trace and the logged-in user's role attached as context (not their name/email — keep PII out of error reports).

## 4. PWA & installability
- Confirm the manifest and icons from Stage 0/8 pass an installability check (Chrome's "Add to Home Screen" prompt appears on Android), and that the installed app's splash screen and theme color match the design system.

## 5. Final visual consistency pass
- Go screen by screen (every route built across Stages 1–9) and check against `00-DESIGN-SYSTEM.md`: consistent button styles, consistent badge colors for the same semantic meaning across different modules (e.g. "Paid" and "Approved" should feel like the same visual language, not slightly different greens), consistent spacing, no orphaned default-Tailwind-blue links or buttons that slipped through without using the theme tokens.

## 6. Production deploy
- Confirm the Vercel production deployment uses the live API URL (not localhost or a staging URL), `NEXTAUTH_SECRET` is a freshly generated production value, and a custom domain with SSL is connected and resolving correctly.

**Done when**: Lighthouse scores "Good" or better on Performance/Accessibility/Best Practices for the three audited pages, a full keyboard-only pass through the Admin and Parent dashboards works without a mouse, the installed PWA looks and feels intentional (not like a bare website wrapped in an icon), and a final click-through of every dashboard built in this project shows one consistent visual product — not eleven differently-styled features bolted together.
