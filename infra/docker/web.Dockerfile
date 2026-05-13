FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
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
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @auto-tm/db generate
RUN pnpm --filter @auto-tm/web build

FROM base AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/web/.next /app/apps/web/.next
COPY --from=build /app/apps/web/public /app/apps/web/public
COPY --from=build /app/apps/web/package.json /app/apps/web/package.json
COPY --from=build /app/apps/web/next.config.* /app/apps/web/
COPY --from=build /app/packages /app/packages
RUN groupadd -r auto-tm && useradd -r -g auto-tm -s /bin/false auto-tm && chown -R auto-tm:auto-tm /app
USER auto-tm
WORKDIR /app/apps/web
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:3002 || exit 1
CMD ["node", "node_modules/next/dist/bin/next", "start", "-p", "3002"]
