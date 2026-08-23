# --- Build stage ---
FROM node:22-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# --- Runtime stage ---
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

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
