# Stage 0 — Backend Prompt (NestJS project setup)

> Copy everything below the line into Claude Code as one message.

---

I'm building a School Management System for one secondary school in Lagos, Nigeria. The full spec is in `docs/` (start with `docs/00-INDEX.md` if you want context) and the architecture decisions are in `docs/18-technical-architecture.md`. This is the very first step: scaffold the backend API. Don't build any business features yet — just a clean, production-shaped skeleton.

Set up a new **NestJS** project in `/api`:

1. Initialize with the Nest CLI, TypeScript, and a `src/modules/` convention for feature modules (each future feature gets its own module folder with `controller`, `service`, `dto/`, and `entities`-equivalent Prisma usage).
2. Install and configure:
   - `@nestjs/config` — load environment variables via a validated config schema (use `zod` or `class-validator` against the env), fail fast on startup if a required var is missing.
   - `prisma` + `@prisma/client` — initialize Prisma pointed at a `DATABASE_URL` env var (PostgreSQL). Just the connection for now; no models yet (that's Stage 1). Wrap it in an injectable `PrismaService` (a Nest provider implementing `OnModuleInit`/`OnModuleDestroy` to connect/disconnect cleanly).
   - `@nestjs/swagger` — wire up Swagger at `/api/docs`, with the API titled "School Management System API".
   - `class-validator` + `class-transformer` — enable a **global** `ValidationPipe` (whitelist: true, forbidNonWhitelisted: true, transform: true) in `main.ts`.
   - A global exception filter that returns a consistent JSON error shape (`{ statusCode, message, error }`) instead of Nest's default.
   - A global logging interceptor that logs method, path, status, and duration for every request.
3. Enable CORS, configured via an env var (`FRONTEND_ORIGIN`) rather than hardcoded, since the frontend will be a separate deployed app (see `docs/18-technical-architecture.md` §3).
4. Add a `GET /health` endpoint (no auth) that checks the Prisma connection and returns `{ status: "ok", db: "connected" }` or a 503 if the DB is unreachable.
5. Add a `.env.example` listing every env var introduced so far (`DATABASE_URL`, `FRONTEND_ORIGIN`, `PORT`).
6. Add a `Dockerfile` (multi-stage: build then slim runtime image) suitable for deploying to Railway, Render, or Fly.io.
7. Set up `npm run lint`, `npm run format` (ESLint + Prettier, Nest's defaults are fine), and confirm `npm run test` runs (even with zero tests) and `npm run build` succeeds.

Don't add any feature modules (auth, students, etc.) yet — those come in later stages. This stage is purely the scaffold, tooling, and a working health check.

**Done when**: `npm run start:dev` boots cleanly, `GET /health` returns a 200 with `db: "connected"` against a real Postgres instance, and `/api/docs` renders an (empty) Swagger UI.
