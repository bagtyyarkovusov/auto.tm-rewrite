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

**Rebuild the image whenever `pnpm-lock.yaml` changes** — the warm store goes
stale otherwise, and per-worktree `pnpm install --offline` would miss new packages.

## Trigger a run

```bash
pnpm sandcastle                 # full loop (MAX_ITERATIONS=10)
MAX_ITERATIONS=1 pnpm sandcastle  # one cycle (smoke test / cautious run)
```

The planner selects `gh issue list --state open --label "ready-for-agent"
--search "-label:blocked"`, excludes parent `Sprint N —` PRDs, and works the
unblocked slices in parallel.

## The gate (D1)

In-sandbox, each implementer/reviewer runs:

```bash
pnpm exec turbo run typecheck lint test:unit --filter=<workspace>
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

## Dependency model (why it's fast + offline)

- The image bakes a warm pnpm content-addressable store (`pnpm fetch`).
- Each worktree runs `pnpm install --offline --frozen-lockfile` (a
  `hooks.sandbox.onSandboxReady` command) — no network, links from the store.
- `dist/` for `@auto-tm/db` + `@auto-tm/contracts` is produced by turbo `^build`
  when the gate runs (per [ADR-0016](../adr/0016-typescript-runtime-boundaries.md));
  the hook also runs `pnpm --filter @auto-tm/db generate`.
- If an issue **adds** a dependency, `--offline` will miss it. Rebuild the image
  (re-warms the store) or, as a stop-gap, the sandbox's default bridge network
  allows a non-offline install.

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
