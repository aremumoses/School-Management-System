# SMS Frontend

Next.js frontend for the School Management System — see [`../docs`](../docs/00-INDEX.md) for the full functional spec and [`../prompts`](../prompts/README.md) for the stage-by-stage build plan. The backend is the separate NestJS API in [`../api`](../api).

## Setup

```bash
cp .env.local.example .env.local   # fill in NEXT_PUBLIC_API_URL and NEXTAUTH_SECRET
npm install
npm run dev
```

Requires the API (`../api`) running — see its own README/setup for that. Local dev: API on port 4000, this app on port 3000.

## Design system

Every visual decision (colors, type scale, spacing, components) follows [`../prompts/00-DESIGN-SYSTEM.md`](../prompts/00-DESIGN-SYSTEM.md). Tokens live in `app/globals.css` as Tailwind v4 `@theme` CSS variables — there is no `tailwind.config.ts` in this project.

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run lint` — ESLint
