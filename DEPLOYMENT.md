# Deploying the demo (all free tiers, no credit card)

Two apps, four accounts:

| Piece | Host | Why this one |
|---|---|---|
| `web/` (Next.js) | **Vercel** | Hobby tier, built for Next.js |
| `api/` (NestJS) | **Render** free web service, Docker | Free tier runs Dockerfiles |
| Postgres | **Neon** | Render's free Postgres is *deleted after 30 days*; Neon's isn't |
| Redis | **Render Key Value** | The app's config takes only `REDIS_HOST`/`REDIS_PORT` — no password or TLS field, which every *public* managed Redis (Upstash etc.) requires. Render's is reachable over its private network without either. |
| File storage | **Supabase Storage** | S3-compatible, which is what `StorageService` speaks |

`render.yaml` in the repo root is a Blueprint: Render reads it and creates the
API *and* the Redis instance, wiring `REDIS_HOST`/`REDIS_PORT` between them and
generating the two JWT secrets. Only the values it can't know are prompted for.

Do the steps in this order — each one produces a value the next needs.

---

## 1. Neon — Postgres

1. [neon.tech](https://neon.tech) → sign in with GitHub → create a project.
2. Copy the connection string (`postgresql://…@…neon.tech/neondb?sslmode=require`).

Keep it: it's `DATABASE_URL` in step 3 **and** step 4.

## 2. Supabase — file storage

1. [supabase.com](https://supabase.com) → new project (note the **region** you pick).
2. **Storage** → new bucket named `sms-uploads` → mark it **Public**
   (uploads are served back by URL; a private bucket returns 400s on every
   avatar and document).
3. **Project Settings → Storage → S3 Connection** → generate an access key.

That yields, with `<ref>` being your project ref:

```
STORAGE_ENDPOINT         https://<ref>.supabase.co/storage/v1/s3
STORAGE_REGION           <the region from step 2.1, e.g. eu-west-2>
STORAGE_BUCKET           sms-uploads
STORAGE_ACCESS_KEY_ID    <from step 2.3>
STORAGE_SECRET_ACCESS_KEY <from step 2.3>
STORAGE_PUBLIC_URL_BASE  https://<ref>.supabase.co/storage/v1/object/public/sms-uploads
```

`STORAGE_REGION` must be the real region — the S3 protocol signs requests with
it, so a wrong value fails auth even though every other field is correct.

## 3. Render — API + Redis

1. [render.com](https://render.com) → sign in with GitHub → **New → Blueprint**.
2. Pick this repo. Render finds `render.yaml` and shows two services.
3. Fill in the prompted values: `DATABASE_URL` (step 1), the six `STORAGE_*`
   (step 2), the two `VAPID_*` (below), and `FRONTEND_ORIGIN`.

   `FRONTEND_ORIGIN` isn't known until step 5 — put
   `https://placeholder.vercel.app` now and correct it in step 6.

4. Apply. First build takes ~10 min (it installs Chromium for PDF rendering).

The API lands at `https://sms-api-<hash>.onrender.com`. Check
`/health`, and browse `/api/docs` for Swagger.

## 4. Migrations + demo data

**Render's free tier has no shell**, so this runs from your laptop against
Neon directly — the database is reachable either way, so the result is
identical:

```bash
cd api
export DATABASE_URL='<the Neon string from step 1>'
npx prisma migrate deploy   # applies all 32 migrations
npx prisma db seed          # demo school: staff, students, guardians, classes
```

Every seeded account shares the password `Password123!`:

| Email | Role |
|---|---|
| `admin@demoschool.ng` | Admin |
| `tunde.bakare@demoschool.ng` | Subject + Class Teacher |
| `bursar@demoschool.ng` | Bursar |
| `examofficer@demoschool.ng` | Exam Officer |
| `guardian.stu2025001@example.com` | Parent |

## 5. Vercel — the frontend

Vercel's GitHub App needs access to the repo first, since it's private:
**Vercel → Add New → Project → Configure GitHub App → grant access to
`School-Management-System`.**

Then import the repo with **Root Directory = `web`** and set:

```
NEXT_PUBLIC_API_URL             https://sms-api-<hash>.onrender.com   (step 3)
NEXTAUTH_SECRET                 <openssl rand -base64 32>
NEXT_PUBLIC_VAPID_PUBLIC_KEY    <the public half of the pair below>
```

## 6. Close the loop

Set Render's `FRONTEND_ORIGIN` to the real Vercel URL and redeploy the API.
Until you do, every browser request is blocked by CORS and the app looks
broken while both halves are individually healthy.

`FRONTEND_ORIGIN` takes the **origin only** — `https://x.vercel.app`, no
trailing slash, no path.

---

## VAPID keys

Web Push is the one integration that fully works here: the keypair is
self-generated, with no account behind it. Generate your own with
`node -e "console.log(require('web-push').generateVAPIDKeys())"`, then use the
**same public key** in both places — Render's `VAPID_PUBLIC_KEY` and Vercel's
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`. A mismatch rejects every subscription.

## What is deliberately not live

`env.validation.ts` requires the provider keys to be non-empty so a
misconfigured deploy fails at boot rather than silently swallowing messages.
The blueprint therefore sets **placeholders** for Paystack, Termii, Resend,
WhatsApp and Anthropic. Those services degrade rather than crash — an SMS
records as `FAILED` instead of sending — so on a public demo no tester can
spend real money or message a real person. Swap in real keys any time in
Render's dashboard.

## Known limits of the free tier

- **Cold starts.** Render free services sleep after 15 minutes idle and take
  roughly a minute to wake. The first login after a quiet spell may time out —
  retry once and it's fast. This is the main thing to warn testers about.
- **512 MB RAM.** Enough to serve the app, but Chromium is memory-hungry;
  generating a large batch of report-card PDFs can hit the ceiling.
- **Shared demo data.** Every tester has the same admin login and edits the
  same database. To reset, re-run step 4's seed.
