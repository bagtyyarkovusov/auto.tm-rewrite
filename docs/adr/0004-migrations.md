# ADR-0004: Prisma migrations discipline

- **Status**: Accepted
- **Date**: 2026-05-13

## Context

The previous backend had "poorly handled" migrations — drift between dev and prod, manual SQL fixes, unclear deployment story. This was identified as one of the key reasons for the rewrite.

Air-gapped Turkmenistan deployment compounds the problem: we cannot run `prisma migrate dev` against the production database from a developer's laptop — there is no network path. Migrations must be deterministic, reviewable in PRs, and applied automatically inside the Docker image at startup.

## Decision

**One source of truth: `packages/db/prisma/schema.prisma`.** All schema changes start here.

### Developer workflow

1. Edit `schema.prisma` locally
2. Run `pnpm db:migrate:dev --name <verb>_<thing>` — this:
   - Generates a timestamped SQL migration file in `packages/db/prisma/migrations/`
   - Applies it to the local dev Postgres
   - Regenerates the Prisma client
3. **Commit the migration file with the schema change in the same commit/PR.**
4. Migration name format: `<timestamp>_<verb>_<thing>` — e.g., `20260513120000_add_messages_table`

### Production workflow

- **Never run `prisma migrate dev` against production.**
- **Never run `prisma db push` against any environment except localhost.**
- Production migrations run inside the Docker image at container start, via `prisma migrate deploy`. This applies pending migrations idempotently. It does **not** generate new migrations.
- The image bundle includes the `prisma/migrations/` folder.

### CI enforcement

- PR check: `prisma migrate diff --from-migrations --to-schema-datamodel` must produce zero changes. If `schema.prisma` drifted from migrations, fail the PR.
- PR check: every PR touching `schema.prisma` must include exactly one new migration file.

### Rules

1. **One migration per PR.** No bundling unrelated schema changes.
2. **Forward-only.** We do not implement down migrations. To "revert" a bad migration, write a new migration that reverses it.
3. **Migrations are immutable after merge.** If you need to fix a bad migration, write a new one. Never edit a merged file.
4. **No destructive operations without an explicit comment.** Dropping a column, table, or constraint requires `-- destructive: dropping <name>` at the top of the migration file and a manual backup taken before deploy.

### Seed data

- `packages/db/prisma/seed.ts` runs catalog data (brands, models, colors, regions) on `pnpm db:seed`.
- Seed data is committed to git in `packages/db/prisma/seed/*.json`.
- Production seeds run once on initial deploy, then never again unless explicitly invoked.

## Consequences

### Positive
- Migrations are reviewable in PRs as SQL
- No drift possible between schema.prisma and what's deployed
- Air-gap-friendly: migrations ship inside the image, no internet needed at deploy
- Rollback story is clear: write a reversing migration, deploy as a hotfix

### Negative / accepted costs
- Forward-only migrations mean we cannot easily reset a bad migration locally — devs occasionally drop their dev DB to start fresh
- The "one migration per PR" rule slows down some refactor-heavy work (acceptable trade-off)

### Neutral
- This discipline is what every reasonable team adopts. We're not inventing anything; we're committing to follow it.

## Alternatives considered

- **`prisma db push`** in dev — rejected: too easy to drift; we use `migrate dev` only.
- **Bidirectional (up + down) migrations** — rejected: forward-only is simpler and matches modern practice (Rails, Django, golang-migrate all support but discourage downs).
- **Manual SQL files** — rejected: bypasses Prisma's drift detection and reproducibility.

## References

- Charter §16 (DB conventions)
- Related: ADR-0002 (stack — Prisma chosen), ADR-0005 (hosting — air-gap workflow)
