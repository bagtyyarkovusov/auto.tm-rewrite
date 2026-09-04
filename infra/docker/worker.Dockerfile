# apps/worker production image (NestJS standalone BullMQ consumer).
#
# Build context: repository root. The worker has no public route: an
# incomplete runtime contract (env validation) fails boot with a non-zero
# exit, which Railway surfaces as a crashed deploy. The worker never runs
# migrations — the API pre-deploy command is the sole authority (ADR-0004).
FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ openssl && rm -rf /var/lib/apt/lists/*
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY vendor/ai-hero-sandcastle-0.5.10-d4b7db7-1df6ad8f.tgz vendor/ai-hero-sandcastle-0.5.10-d4b7db7-1df6ad8f.tgz
COPY apps/api/package.json apps/api/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/sms-gateway/package.json apps/sms-gateway/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# Runtime-shared packages export dist/, so build them before the app.
# Prisma 7 loads packages/db/prisma.config.ts during generate and requires a
# datasource URL even though no connection is made.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm --filter @auto-tm/db build
RUN pnpm --filter @auto-tm/contracts build
RUN pnpm --filter @auto-tm/worker build

FROM base AS runtime
# Deploy evidence: baked from Railway's RAILWAY_GIT_COMMIT_SHA build arg so
# boot logs identify the exact revision even when Railway rebuilds it.
ARG RAILWAY_GIT_COMMIT_SHA=unknown
ENV AUTOTM_COMMIT_SHA=${RAILWAY_GIT_COMMIT_SHA}
RUN apt-get update && apt-get install -y --no-install-recommends curl openssl postgresql-client && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/worker/node_modules /app/apps/worker/node_modules
COPY --from=build /app/apps/worker/dist /app/apps/worker/dist
COPY --from=build /app/apps/worker/package.json /app/apps/worker/package.json
COPY --from=build /app/packages /app/packages
RUN groupadd -r auto-tm && useradd -r -g auto-tm -s /bin/false auto-tm && chown -R auto-tm:auto-tm /app
USER auto-tm
WORKDIR /app/apps/worker
CMD ["node", "dist/main.js"]
