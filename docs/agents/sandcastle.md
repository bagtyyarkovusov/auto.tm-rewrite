# Sandcastle — AFK parallel orchestrator

Sandcastle (`@ai-hero/sandcastle`, Kimi K2 fork) runs an autonomous loop that
works several **unblocked** issues in parallel, each in its own Docker sandbox +
git worktree:

```
Planner (reads ready-for-agent -blocked, builds dep graph, emits <plan>)
  → parallel { Implementer (≤100 iters) → Reviewer (1 iter) }   one sandbox per issue
  → Merger (merges branches into the current branch, closes child issues)
  → repeat up to MAX_ITERATIONS
```

It is the **AFK parallel** counterpart to `/run-issue` (the synchronous,
human-in-the-loop single-issue path). Both consume the same `ready-for-agent` /
`blocked` / `## Depends on` conventions (`docs/agents/issue-tracker.md`,
`docs/agents/triage-labels.md`). Decisions and rationale: [ADR-0028](../adr/0028-kimi-sandcastle-afk-orchestrator.md).

Config lives in `.sandcastle/`. It runs **on the developer Mac** (it orchestrates
Docker); it is never deployed to the air-gapped runtime.

## Prerequisites

- Docker Desktop running.
- `.sandcastle/.env` (copy from `.sandcastle/.env.example`, gitignored):
  - `KIMI_API_KEY` — Kimi Code API key.
  - `GH_TOKEN` — GitHub token with `repo` scope (issue read/close, push).
  - `CONTEXT7_API_KEY` — Context7 MCP (live library docs), recommended.
  - `DATABASE_URL` — a dummy is enough. The setup hook runs `pnpm --filter
    @auto-tm/db generate`, and `packages/db/prisma.config.ts` resolves
    `env("DATABASE_URL")` at config-load time (it throws if unset) even though
    `generate` never connects. Clean worktrees have no `packages/db/.env`, and the
    EnvResolver only forwards keys declared in `.sandcastle/.env`, so it must be set.
- The vendored fork installed: `pnpm install` (links `vendor/ai-hero-sandcastle-*.tgz`).

## Build the sandbox image

```bash
pnpm exec sandcastle docker build-image --dockerfile .sandcastle/Dockerfile
```

The `--dockerfile` flag is required: it sets the build context to the repo root
so the Dockerfile's warm-store `COPY pnpm-lock.yaml …` resolves
(`.sandcastle/Dockerfile.dockerignore` keeps that context tiny). The build
auto-detects your host UID/GID and bakes the warm pnpm store from
`pnpm-lock.yaml`. The image is tagged from the repo directory name
(`sandcastle:auto.tm-rewrite`). Verify the user matches your host (`501:20` on
macOS):

```bash
docker image inspect "$(docker images --format '{{.Repository}}:{{.Tag}}' | grep sandcastle | head -1)" --format '{{.Config.User}}'
```

**Rebuilding the image after `pnpm-lock.yaml` changes** re-warms the store so new
packages install from disk instead of the network — a perf optimization. The hook
uses `pnpm install --prefer-offline` (not `--offline`), so a stale store is no
longer a correctness failure: missing packages are fetched over the bridge network.

## Trigger a run

```bash
pnpm sandcastle                 # full loop (MAX_ITERATIONS=10)
MAX_ITERATIONS=1 pnpm sandcastle  # one cycle (smoke test / cautious run)
```

The planner selects `gh issue list --state open --label "ready-for-agent"
--search "-label:blocked"`, excludes parent `Sprint N —` PRDs, and works the
unblocked slices in parallel.

Before each planner cycle, the host script checks the GitHub core + GraphQL
rate-limit budget. If either budget is below the configured floor
(`SANDCASTLE_MIN_GH_CORE_REMAINING`, `SANDCASTLE_MIN_GH_GRAPHQL_REMAINING`;
defaults: 50), the run stops before creating more worktrees. This avoids the
half-started state where the planner succeeds but implementer/reviewer `gh`
calls later fail under a shared 5,000/hour quota.

## Agent reasoning mode

Sandcastle runs Claude Code against Kimi's Anthropic-compatible coding endpoint.
`kimi-k2.6` enables thinking by default, and this workflow now keeps thinking on
with a 16K budget:

```bash
MAX_THINKING_TOKENS=16000
```

Planner, reviewer, and merger run with low effort; implementer runs with medium
effort. The vendored fork parses Claude Code `thinking` blocks, normal tool
calls, and suppresses high-frequency `thinking_tokens` progress records in logs.

## The gate (D1)

In-sandbox, each implementer/reviewer runs:

```bash
CI=1 COREPACK_ENABLE_PROJECT_SPEC=0 pnpm exec turbo run typecheck lint test:unit --filter=<workspace> --cache-dir=/tmp/turbo-cache
```

`test:unit` is the **Docker-free** unit suite (excludes `*.e2e.spec.ts`). The
**Testcontainers e2e suite runs on CI**, not in the sandbox (`pr-checks.yml` /
`ci.yml`, self-hosted `tm-proxy` runner). There is no Docker-in-Docker and no
`docker.sock` mount in the sandboxes.

## Mobile caveat (D2)

Agents can build mobile components/screens/hooks and pass
`typecheck`/`test:unit`/`lint`, but they **cannot** run `expo install --check`,
an iOS export, or Expo Go in a headless Linux sandbox. After a mobile branch
merges, **run the Expo simulator gate yourself** (`docs/agents/mobile-expo.md`).
The merger flags mobile branches for this.

## Reading logs

Per-phase logs stream to `.sandcastle/logs/` (gitignored). Worktrees live under
`.sandcastle/worktrees/` (gitignored); after a clean run they are torn down. If a
run is interrupted, a worktree with uncommitted changes is preserved on disk —
remove it manually once you've inspected it.

Dependency setup is no longer a per-worktree install with its own `setup.log`.
Stage A (`materializeLinuxModules()`) logs `[stage-a] …` lines to the
orchestrator's own stdout (`.sandcastle/run.log` if you redirect it), and the
per-worktree step is just a clone, so a "stuck setup" now shows up as a slow
clone or a Stage C top-up failure in the phase log, not a separate file. The
agent stream logs themselves are readable: tool output is collapsed to one-line
`⤷` summaries (`✗` on error) instead of raw-JSON `tool_result` dumps.

If an interrupted run left an empty branch/worktree, the next run resets that
zero-commit Sandcastle branch to the current host `HEAD` before starting. Branches
with unique commits or uncommitted changes are preserved for inspection. This
matters after `pnpm-lock.yaml` changes: an old empty branch would otherwise keep
the old lockfile even after the Docker image has a freshly warmed store.

## Merge phase

The merger runs in a temporary Sandcastle worktree, not the root checkout. This is
intentional: pnpm 10 may purge an incompatible existing `node_modules` layout, and
that must never happen against the developer's real repo root. After the merge
agent emits `<promise>COMPLETE</promise>`, Sandcastle merges the temporary branch
back into the current host branch and the host orchestrator pushes that branch to
`origin` using `.sandcastle/.env` / `gh auth setup-git`.

## Dependency model — copy-to-worktree (two-stage)

Locked in [ADR-0033](../adr/0033-sandcastle-copy-to-worktree-dependencies.md),
which supersedes the old per-worktree `pnpm install` ([ADR-0028](../adr/0028-kimi-sandcastle-afk-orchestrator.md) §D3).
That install materialized ~1,862 packages from the in-VM warm store **into the
macOS bind-mounted worktree**; pnpm can't hardlink across that mount (`EXDEV`),
so it fell back to a cross-device COPY through Docker-for-Mac file sharing and
blew even a serialized 40-minute timeout. The fix is to never install against the
bind mount:

- **The repo stays on pnpm 9 for normal dev; the Sandcastle image pins pnpm 10**
  and bakes a warm pnpm content-addressable store (`pnpm fetch`).
- **Stage A — `materializeLinuxModules()` (once per lockfile).** `main.mts`
  hashes `pnpm-lock.yaml` against `.sandcastle/linux-modules/.lockhash`. On a
  miss it runs the warm-store image detached, `git archive HEAD | tar -x` the
  committed tree in, runs `pnpm install --prefer-offline --frozen-lockfile` +
  `pnpm --filter @auto-tm/db generate` **in-VM** (hardlinks from the warm store,
  no EXDEV), then `tar`s the node_modules set (root + every workspace package)
  out to the host at `.sandcastle/linux-modules/` (gitignored, ~1.9 GB+). It
  needs a dummy `DATABASE_URL` for `prisma generate` (provided automatically).
- **Stage B — copy into each worktree.** Implementers/reviewers (`createSandbox`)
  and the merger (`run`) pass `copyToWorktree: <module paths>` +
  `copyFromDir: ".sandcastle/linux-modules"`. The fork copies **host→host on the
  same APFS volume** with `cp -cR` (clonefile, metadata-only), so there is no
  cross-device copy and no bind-mount write — per-worktree setup is a fast clone,
  not an install. Tune with `SANDCASTLE_COPY_CONCURRENCY` (default 5) and
  `SANDCASTLE_COPY_TO_WORKTREE_MS` (default 900 000).
- **Stage C — optional top-up.** A now-cheap
  `CI=1 COREPACK_ENABLE_PROJECT_SPEC=0 pnpm install --prefer-offline --frozen-lockfile`
  runs as `onSandboxReady` to reconcile a branch that **adds** a dependency (the
  bulk is already cloned in, so pnpm only fetches the delta over the bridge
  network). Default-on; set `SANDCASTLE_TOPUP_INSTALL=0` to skip.
  `COREPACK_ENABLE_PROJECT_SPEC=0` is required because the root `packageManager`
  still points Corepack at pnpm 9; the agent process also gets `CI=1` +
  `COREPACK_ENABLE_PROJECT_SPEC=0` so even a bare `pnpm` uses the image's pnpm 10.
- `dist/` for `@auto-tm/db` + `@auto-tm/contracts` and the Prisma client are
  **not** copied; turbo `^build` regenerates them in-worktree when the gate runs
  (per [ADR-0016](../adr/0016-typescript-runtime-boundaries.md)).
- **Rebuild the image when `pnpm-lock.yaml` changes** — it is Stage A's build
  substrate (the warm store goes stale otherwise). Stage A itself also rebuilds
  `linux-modules/` automatically on a lockhash miss.

The implementer/reviewer/merger phases have explicit idle budgets so a stuck Kimi
or Claude Code stream does not look like an infinite hang:
`SANDCASTLE_IMPLEMENTER_IDLE_TIMEOUT_SECONDS` defaults to 300 seconds;
reviewer/merger default to 180 seconds.

## Updating the fork

The Kimi provider is a **vendored tarball** (`vendor/`), not a git dependency.
To pick up fork changes, rebuild + re-vendor per `vendor/README.md`, bump the
`file:` path in the root `package.json`, and `pnpm install`.

## Relationship to `/run-issue`

| | `/run-issue` | sandcastle |
|---|---|---|
| Mode | synchronous, 1 issue, in your CC session | AFK, N issues in parallel |
| Branch | `agent/issue-<N>` | `sandcastle/issue-<N>-<slug>` |
| Agent | Claude Code (you) | Kimi K2 in Docker sandboxes |
| e2e gate | local + CI | CI only (D1) |
| Mobile gate | you run it | deferred to you post-merge (D2) |

Use `/run-issue` for judgment-heavy or one-off slices; use sandcastle to burn
down a batch of independent, fully-specified `ready-for-agent` slices.
