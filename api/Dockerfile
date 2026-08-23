# --- Build stage ---
FROM node:22-slim AS build
WORKDIR /app

# Chrome is installed from Debian's own package in the runtime stage below
# (see the comment there), so puppeteer's ~150MB postinstall download of its
# own bundled Chrome is pure waste here — it would be discarded with this
# stage. Skipping it is the single biggest build-time saving in this file,
# which matters on a free-tier builder.
ENV PUPPETEER_SKIP_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# --- Runtime stage ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# The five PDF processors (report cards, receipts, offer letters, payslips,
# documents) drive headless Chrome. Debian's chromium package is used rather
# than puppeteer's bundled download because apt resolves Chrome's ~30 shared
# library dependencies (nss, gbm, pango, gtk, …) automatically — installing
# the bundled build instead means hand-maintaining that list, and a single
# missing .so surfaces only as a failed PDF job at runtime, never at build.
# fonts-liberation is needed too, or rendered PDFs fall back to tofu boxes.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation \
  && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# The Prisma schema and migration history ship in the image so that
# `npx prisma migrate deploy` can be run against it as a separate pre-deploy
# step (see the note below) — without these files that command has nothing
# to apply.
COPY --from=build /app/prisma ./prisma
# prisma.config.ts is not optional here: schema.prisma declares the datasource
# with no `url`, so the connection string reaches Prisma *only* through this
# config's datasource.url (process.env.DATABASE_URL). tsconfig.json comes along
# so the ts-node seed command this config names can run against the image too.
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json

# node_modules is copied wholesale (not reinstalled with --omit=dev) because
# @prisma/client's generated query engine lives inside node_modules/.prisma
# and must be the exact one produced by `prisma generate` in the build stage —
# regenerating it here would need the prisma CLI and schema present too.

# Migrations are NOT run automatically on container start (multiple replicas
# booting at once would race). Run `npx prisma migrate deploy` as its own
# deploy step before/alongside rolling out a new image.

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
