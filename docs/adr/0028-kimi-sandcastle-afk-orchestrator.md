# ADR-0028: Kimi-Sandcastle as the AFK parallel orchestrator

- **Status**: Accepted
- **Date**: 2026-06-04
- **Deciders**: AutoTM founder + AI architect

## Context

The repo already runs autonomous single-issue work through the `/run-issue` skill: a human picks one `ready-for-agent` issue and Claude Code drives it synchronously (branch → implement → test → PR → merge). `docs/agents/issue-tracker.md` notes that a parallel orchestrator was "discussed but deferred." What is missing is an **away-from-keyboard (AFK) path that works several unblocked issues in parallel**.

`@ai-hero/sandcastle` provides that loop — `Planner → parallel { Implementer → Reviewer } → Merger`, each agent isolated in its own Docker sandbox + git worktree — and a Kimi K2 provider exists on the fork `github:bagtyyarkovusov/sandcastle#feature/kimi-code-provider`. The loop is proven on a sibling repo (`sandcastle-test`), but that project is a single-package **npm + SQLite + one Next.js app**. `auto.tm-rewrite` differs on every axis sandcastle cares about: pnpm with `shamefully-hoist` + workspace symlinks, Turborepo (7 apps / 5 packages), Postgres + Redis tests via Testcontainers (no mocks, per `CLAUDE.md`), an Expo app that needs simulators, and an air-gapped production target. A self-hosted `tm-proxy` CI runner already runs the full `pnpm test` (Testcontainers included) on every PR and push to `main`.

The full design and trade-off analysis is in `docs/superpowers/specs/2026-06-04-kimi-sandcastle-monorepo-port-design.md`. This ADR records the load-bearing decisions so they survive after that spec is retired.

## Decision

**Adopt Kimi-Sandcastle as the AFK parallel orchestrator, configured under `.sandcastle/`, augmenting (not replacing) `/run-issue` and CI.** Both paths consume the same `ready-for-agent` / `blocked` / `## Depends on` conventions. Autonomous branches use the `sandcastle/issue-<N>-<slug>` prefix to stay visibly distinct from `/run-issue`'s `agent/issue-<N>`.

The operating constraints:

- **D1 — In-sandbox gate = `typecheck` + `lint` + Docker-free unit tests.** The implement/review prompts run `turbo run typecheck lint test:unit --filter=<workspace>` (a new `test:unit` excludes `*.e2e.spec.ts`). The Testcontainers e2e suite stays on CI/PR (`pr-checks.yml` / `ci.yml`, `tm-proxy`). Sandboxes get **no Docker-in-Docker and no `docker.sock` mount** — the hexagonal architecture already isolates business logic behind fake ports, so unit coverage in-sandbox is meaningful, and the heavy suite already runs correctly on the Docker-capable runner. Accepted weakness: API/Prisma code can pass in-sandbox and fail e2e only at CI; mitigated by fake-port TDD and by the first intended workload being mobile (zero Testcontainers exposure).

- **D2 — Mobile build/runtime verification is deferred to the host.** Agents run `typecheck` + unit tests + `lint` for `apps/mobile`; the human owns the Expo dependency check / iOS export / Expo Go simulator gate (`docs/agents/mobile-expo.md`) after merge, because it cannot run headless in a Linux container.

- **D3 — Dependencies via a warm pnpm store + offline per-worktree install, not `copyToWorktree`.** The image bakes a fully-populated content-addressable store (`pnpm fetch` from the lockfile in a Docker layer); a `hooks.sandbox.onSandboxReady` command runs `pnpm install --offline --frozen-lockfile && pnpm --filter @auto-tm/db generate` inside each worktree. Copying pnpm's symlink-farm `node_modules` across a worktree is rejected as fragile. The hook's `timeoutMs` is configurable (the 60s default applies only to `copyToWorktree`, which is unused), so the install gets a generous budget.

- **Fork consumed as a vendored prebuilt tarball.** `vendor/ai-hero-sandcastle-<sha>.tgz` (committed) is referenced via `file:` in the root `package.json` as a **host-only devDependency**. Sandcastle runs on the developer Mac to orchestrate Docker; it never enters a sandbox image or any deployed artifact. A `github:` git dependency was rejected because its `prepare` (`husky` + `tsgo` build) runs on every install — fragile under pnpm and non-reproducible.

- **Planner uses `kimiCode("kimi-k2.6", { thinking: false })`** for speed and to avoid an observed planner shell-loop; implementer/reviewer/merger keep default thinking.

- **The first real run is gated on slicing issue #94** into independent vertical `ready-for-agent` slices. Standing up the machinery does not trigger sprint work.

## Consequences

### Positive

- A parallel AFK path exists for the unblocked queue without a parallel issue/label system.
- Sandboxes are hermetic and unprivileged (no socket mount), so the parallelism/security/network failure surface stays small.
- Offline installs from the baked store are fast and deterministic; no flaky network installs per worktree.
- The expensive, correct Testcontainers suite stays where Docker actually works (the `tm-proxy` runner).
- The vendored tarball pins exact bytes and needs no build toolchain at install time.

### Negative / accepted costs

- API/Prisma regressions can surface only at CI (post-merge), not in-sandbox.
- Mobile branches are only half-verified by agents; a human must run the Expo simulator gate before trusting screens.
- The vendored tarball must be rebuilt + re-committed when the fork advances (documented in `vendor/README.md`).
- The image must be rebuilt when `pnpm-lock.yaml` changes (the warm store goes stale otherwise).

### Neutral

- `/run-issue` and CI are unchanged; sandcastle is additive.
- `.sandcastle/.env` (secrets) is gitignored; only `.env.example` is committed.

## Alternatives considered

- **`copyToWorktree: ["node_modules"]`** (the sandcastle-test default) — rejected: pnpm's `node_modules` is a symlink farm into `.pnpm`; copying it across a worktree risks broken/absolute symlink targets and silent module-resolution failures.
- **`github:` git dependency for the fork** — rejected: its `prepare` (`husky` + `tsgo`) runs at install, which is fragile under pnpm and non-reproducible. Vendored tarball chosen instead.
- **Run Testcontainers e2e in-sandbox (Docker-in-Docker or `docker.sock` mount)** — rejected: adds a host-root escalation path for autonomous agents and a large networking/parallelism failure surface, when CI already runs the suite correctly.
- **A pre-merge e2e gate in the Merger** (the one serial, low-risk Docker spot) — deferred, not adopted in v1; rely on CI.
- **Replace `/run-issue` or CI** — rejected: sandcastle augments both.

## References

- `docs/superpowers/specs/2026-06-04-kimi-sandcastle-monorepo-port-design.md` — full design + trade-offs
- `docs/agents/sandcastle.md` — operating guide
- [ADR-0016](0016-typescript-runtime-boundaries.md) — runtime-shared packages build to `dist/` (why the install hook runs `db generate` + relies on turbo `^build`)
- [ADR-0017](0017-context7-as-canonical-doc-source.md) — Context7 MCP required in the agent prompts
- [ADR-0019](0019-context-md-describes-current-state.md) / [ADR-0020](0020-document-hierarchy-and-mutability.md) — CONTEXT.md current-state + doc mutability (encoded in the prompts)
- `docs/agents/issue-tracker.md`, `docs/agents/triage-labels.md` — the reused `ready-for-agent` / `blocked` / `## Depends on` conventions
- [ADR-0010](0010-testing-obs.md) — testing pyramid (Testcontainers, no mocks)
