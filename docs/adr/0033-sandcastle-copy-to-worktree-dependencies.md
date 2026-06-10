# ADR-0033: Sandcastle dependencies via copy-to-worktree (supersedes ADR-0028 §D3)

- **Status**: Accepted
- **Date**: 2026-06-10
- **Deciders**: AutoTM founder + AI architect

## Context

[ADR-0028](0028-kimi-sandcastle-afk-orchestrator.md) §D3 chose to provision each
Sandcastle worktree's `node_modules` with a **per-worktree `pnpm install --offline`**
against a warm content-addressable store baked into the sandbox image, and
explicitly **rejected `copyToWorktree`** (ADR-0028 §Alternatives) on the belief
that pnpm's `node_modules` is "a symlink farm into `.pnpm`" whose copy "risks
broken/absolute symlink targets."

In practice the per-worktree install was the single most unreliable part of the
AFK loop. Root cause, established by direct observation (2026-06-09/10):

- Sandcastle's `docker()` provider is **bind-mount** (`createBindMountSandboxProvider`,
  tag `"bind-mount"`): the worktree lives on the **macOS host** and is bind-mounted
  into the Linux container. The warm pnpm store lives **in-VM**.
- pnpm cannot hardlink across that mount boundary (`EXDEV`), so
  `--package-import-method=hardlink` silently falls back to a **cross-device COPY
  of ~1,862 packages** through Docker-for-Mac file sharing. Under parallel waves
  this saturates I/O and blew even a serialized 40-minute timeout. The
  `serializeInstall` band-aid in `main.mts` traded throughput for survival and
  still failed in later waves.

The ADR-0028 rejection of `copyToWorktree` was also empirically wrong for this
repo. Building a Linux `node_modules` set inside the warm image and inspecting it
shows pnpm's layout is **fully self-contained and relocatable**: the `.pnpm`
virtual store is in-tree (root `node_modules/.pnpm`, real files), and **100% of
symlinks are relative** (root `node_modules/<pkg>` → `.pnpm/…`; workspace
`apps/api/node_modules/<dep>` → `../../../node_modules/.pnpm/…`) with **zero**
absolute symlinks escaping the tree. A copy that preserves symlinks therefore
relocates cleanly. The earlier failures with a *host* `node_modules` copy were a
different problem — the host tree is macOS/arm64 (`@esbuild/darwin-arm64`, macOS
Prisma engines), exec-format-incompatible with the Linux gate — not a symlink
problem.

## Decision

**Provision worktree dependencies by copy-to-worktree from a prebuilt Linux
`node_modules`, replacing the per-worktree `pnpm install`.** Two stages:

- **D3a — Stage A: `materializeLinuxModules()` builds a Linux `node_modules`
  tree once per lockfile.** `main.mts` hashes `pnpm-lock.yaml`; on a miss it runs
  the warm-store image detached, `git archive HEAD | tar -x` the committed tree
  in, runs `pnpm install --prefer-offline --frozen-lockfile` + `pnpm --filter
  @auto-tm/db generate` **in-VM** (so hardlinks from the warm store work — no
  EXDEV), then `tar`s the node_modules set (root + every workspace package,
  pruning nested stores) out to a host-side, gitignored
  `.sandcastle/linux-modules/`.

- **D3b — Stage B: clone that tree into each worktree via Sandcastle's
  `copyToWorktree` + `copyFromDir`.** Implementers/reviewers
  (`createSandbox`) and the merger (`run`, `merge-to-head`) pass
  `copyToWorktree: <module paths>`, `copyFromDir: ".sandcastle/linux-modules"`.
  The copy runs **host→host on the same APFS volume** (`cp -cR` clonefile,
  metadata-only), sidestepping EXDEV and Docker file sharing entirely. The
  generated Prisma client and `@auto-tm/db` / `@auto-tm/contracts` `dist/` are
  **not** copied; turbo `^build` regenerates them in-worktree at gate time
  (see [ADR-0016](0016-typescript-runtime-boundaries.md)).

- **D3c — Stage C: an optional, default-on top-up `pnpm install
  --prefer-offline --frozen-lockfile`** runs as `onSandboxReady` to reconcile
  any per-branch delta (a branch that adds a dependency). It is now cheap — the
  bulk is already clonefiled in, so pnpm materializes only what's missing.
  Disable with `SANDCASTLE_TOPUP_INSTALL=0`.

**`copyFromDir` is added to the vendored fork** (`copyToWorktree` source-root
override; also parallel copy via `SANDCASTLE_COPY_CONCURRENCY`, a 600 s default
batch timeout, and `mkdir -p` of the destination parent), threaded through
`createSandbox` / `createWorktree` / `run`. The fork is **rebuilt and
re-vendored** per the existing workflow ([ADR-0028](0028-kimi-sandcastle-afk-orchestrator.md),
`vendor/README.md`): `vendor/ai-hero-sandcastle-0.5.10-d4b7db7.tgz`.

This supersedes ADR-0028 §D3 and reverses its `copyToWorktree` rejection. The
warm-store image is **still required** — it is the build substrate for Stage A —
so D3's image-rebuild-on-lockfile-change consequence still holds.

Same change, unrelated improvement: the vendored fork's Claude Code stream
parser now **collapses `user`/`tool_result` dumps into a one-line summary and
drops `system` lifecycle chatter**, so AFK logs are readable (the prior logs were
~80% raw-JSON `tool_result` payloads). This is a log-only change with no bearing
on the dependency strategy.

## Consequences

### Positive

- No pnpm install touches the bind mount, so the EXDEV cross-device copy — the
  actual failure — is gone. Per-worktree setup is a metadata-only clonefile.
- Stage A pays the install cost **once per lockfile**, in-VM where hardlinks
  work, instead of once per worktree per wave.
- `serializeInstall` and its 40-minute timeout are deleted; setup no longer
  contends across parallel issues.
- Logs are readable, which makes AFK runs auditable.

### Negative / accepted costs

- Stage A adds a one-time ~2–3 min build whenever `pnpm-lock.yaml` changes
  (amortized across the wave; skipped when the lockhash matches).
- `.sandcastle/linux-modules/` is a ~1.9 GB+ gitignored working-tree artifact on
  the host.
- The copy is HEAD's module set; a branch that adds a dependency relies on the
  Stage C top-up (default-on) to fill the delta.
- The warm-store image is still rebuilt when the lockfile changes (Stage A's
  substrate) — unchanged from ADR-0028 §D3.

### Neutral

- `createSandbox` / `run` keep their existing `copyToWorktree` signature;
  `copyFromDir` is an additive, backward-compatible option.
- D1 (in-sandbox gate = typecheck + lint + unit) and D2 (mobile Expo gate stays
  with the human) are unchanged.

## Alternatives considered

- **Keep the per-worktree `pnpm install` (ADR-0028 §D3), just raise the
  timeout** — rejected: the timeout was a symptom; the EXDEV cross-device copy of
  ~1,862 packages through Docker file sharing does not get reliably faster, and
  parallel waves compound it.
- **Copy the host's `node_modules` directly into worktrees** — rejected: the host
  tree is macOS/arm64 (`@esbuild/darwin-arm64`, macOS Prisma engines); the Linux
  gate (`turbo` + `vitest`→esbuild + `prisma generate`) fails with exec-format
  errors. Stage A must source a **Linux** tree.
- **Mount a shared in-VM `node_modules` volume across worktrees** — rejected:
  worktrees need independent, writable trees (turbo writes `dist/`, prisma
  writes `generated/`), and a shared volume reintroduces cross-worktree
  contention.
- **pnpm `enableGlobalVirtualStore` (the prior experiment)** — rejected: it
  leaves `node_modules` as symlinks into an out-of-tree global store, which is
  exactly what is *not* copyable; a standard install yields the self-contained,
  relative-symlink tree this ADR relies on.

## References

- [ADR-0028](0028-kimi-sandcastle-afk-orchestrator.md) — Kimi-Sandcastle AFK orchestrator (this supersedes its §D3)
- [ADR-0016](0016-typescript-runtime-boundaries.md) — runtime-shared packages build to `dist/` (why Stage A skips copying `dist/`/`generated/`; turbo `^build` regenerates them)
- `docs/agents/sandcastle.md` — operating guide (dependency-strategy + rebuild sections)
- `vendor/README.md` — vendored fork provenance + rebuild steps (`d4b7db7`)
- Fork: `github:bagtyyarkovusov/sandcastle#feature/kimi-code-provider` @ `d4b7db7` — `copyFromDir` + log cleanup
