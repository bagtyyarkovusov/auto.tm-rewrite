# Claude / Cursor — agent policy for auto.tm-rewrite

This file is read at the start of every AI-assisted coding session in this repo.

## Read first, every session

1. **`GRILL-OUTCOME.md`** — the design charter. Locked decisions. The spec.
2. **`docs/prd/03-roadmap.md`** — the trajectory. Tells you which sprint is current and what shipped before it. Points to the per-sprint file under `docs/prd/sprints/`.
3. **`CONTEXT-MAP.md`** — index of every `CONTEXT.md` in the tree.
4. **The `CONTEXT.md` for the workspace you're working in** (e.g., `apps/api/src/modules/conversations/CONTEXT.md`).
5. Relevant **ADRs** in `docs/adr/` for the decisions that affect this work.
6. **The current sprint file** (`docs/prd/sprints/sprint-NN-<name>.md`) for the DoD, file list, tests required, and open risks of the work you're doing.

## Architecture in one paragraph

Monorepo (Turborepo + pnpm) with 7 apps and 5 packages. API is NestJS + Prisma + Postgres + Socket.IO. Two Next.js apps (public + admin) plus an Expo mobile app. Custom Kotlin Android SMS gateway for OTP. **Level 2 bounded-contexts architecture** in `apps/api/src/modules/<context>/`: each context has `domain/` (pure TS, no Prisma), `application/` (one use-case per file), `infrastructure/` (Prisma repositories, FCM clients, mappers), and `presentation/` (HTTP controllers + WS gateways). **Cross-context calls go through injected ports OR the in-process event bus — never direct imports.** Self-hosted inside Turkmenistan (air-gapped), deployments via Docker image tarballs.

## Always do

- **Read the local `CONTEXT.md` before editing anything in a bounded context.** It tells you what invariants the context maintains and which ports exist.
- **Domain layer is framework-free.** No `@Injectable()`, no Prisma, no Nest. Pure TypeScript business rules.
- **Prisma models live ONLY in `infrastructure/`.** Repositories map Prisma rows → domain entities at the boundary.
- **Write tests in `application/` and `domain/`** — use-case-level tests beat HTTP-level tests for business logic.
- **One use-case per file.** `application/SendMessage.ts` is one class, one method, one job. ~100 lines max.
- **Every schema change is a Prisma migration committed to git.** No `db push` against any environment except localhost.
- **Capture every architecture decision as a new ADR** in `docs/adr/`. Numbered. Dated. Never edited after merge.
- **Update the CONTEXT.md when domain invariants change.** That file should always reflect today, not last quarter.
- **All times UTC in DB.** Convert at the display layer.
- **Run `pnpm test` and `pnpm typecheck` before committing.**

## Never do

- **NEVER import across contexts directly.** `identity/` cannot `import` from `conversations/domain/`. Add a port instead.
- **NEVER mock Prisma in tests.** Use Testcontainers for real Postgres + Redis.
- **NEVER use `db push` outside localhost dev.** Migrations only.
- **NEVER inline magic strings for tokens, roles, or status enums.** They live in `domain/types.ts` per context.
- **NEVER ship code that calls an outside-of-TM service from the API or worker.** Air-gap. Use the TM Proxy PC for VPN-bridged external calls if absolutely needed.
- **NEVER store plaintext refresh tokens.** Bcrypt-hash them in `User.refreshTokenHash` (your current pattern, kept).
- **NEVER commit `.env` files. Only `.env.template` is committed.**
- **NEVER bypass the 60s video / 5 MB image client-side compression** — TM mobile data is metered.

## Documentation systems (don't mix)

| System | Where | Mutable? | When to write |
|---|---|---|---|
| ADRs | `docs/adr/`, `apps/*/docs/adr/` | No (immutable after merge) | Every architectural decision |
| `CONTEXT.md` | Per app + per bounded context | Yes | When domain invariants change |
| PRD vision/scope | `docs/prd/00-...02-...md` | Rarely | Charter-level changes |
| **PRD roadmap** | **`docs/prd/03-roadmap.md`** | **Per sprint** | **Start of sprint (set 🟡) and end of sprint (set 🟢 + bump Current)** |
| **Sprint plans** | **`docs/prd/sprints/sprint-NN-*.md`** | **Per sprint** | **Edit DoD/risks as understanding sharpens; never rewrite history** |
| PRD features / flows | `docs/prd/features/`, `docs/prd/flows/` | Yes | Before / during feature implementation |
| Agent skill config | `docs/agents/` | Rarely | Only when changing issue tracker or label vocabulary |

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary, default names. See `docs/agents/triage-labels.md`.

### Domain docs

**Multi-context** — `CONTEXT-MAP.md` at root, per-app `CONTEXT.md`, per-bounded-context `CONTEXT.md` under `apps/api/src/modules/`. See `docs/agents/domain.md`.

## Verification before completion

Before claiming a feature done:

1. `pnpm typecheck` passes for every workspace touched
2. `pnpm test` passes (unit + integration; e2e for full flows)
3. The relevant `CONTEXT.md` reflects the new state
4. If an architectural choice was made, an ADR exists
5. The PRD section for this feature is updated with what shipped
6. Manual verification: actually run the dev stack and try the feature in the UI

Evidence before assertions. Never claim "fixed" without a passing test or a screenshot of the working flow.
