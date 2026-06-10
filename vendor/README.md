# Vendored dependencies

## `ai-hero-sandcastle-0.5.10-d4b7db7.tgz`

Prebuilt tarball of the Kimi-enabled `@ai-hero/sandcastle` fork, consumed as a
**host-only** devDependency (`file:`) by the root `package.json`. Sandcastle runs
on the developer Mac to orchestrate Docker sandboxes; it never enters a sandbox
image or any deployed artifact, so it does not touch the air-gapped runtime.

- **Upstream:** https://github.com/mattpocock/sandcastle (`@ai-hero/sandcastle`)
- **Fork:** https://github.com/bagtyyarkovusov/sandcastle
- **Branch / commit:** `feature/kimi-code-provider` @ `d4b7db7` (adds `copyFromDir` source-root override to `copyToWorktree` for the copy-to-worktree dependency strategy — parallel copy via `SANDCASTLE_COPY_CONCURRENCY`, 600 s default batch timeout, `mkdir -p` of the dest parent — threaded through `createSandbox` / `createWorktree` / `run`; plus Claude Code log cleanup: `user`/`tool_result` dumps collapse to a compact `tool_result` event, `system` lifecycle chatter is dropped as `ignore`, and unrecognized-line telemetry is truncated. Built on `dc7dab2`: `kimiCode` provider + Claude Code stream-json parsing + setup hooks that fail on non-zero exit.)
- **Built:** 2026-06-10 via `npm run build && npm pack --ignore-scripts`
  (tsgo build; `--ignore-scripts` skips the fork's `husky` + rebuild `prepare`).

> The `d4b7db7` build was packed from a working tree that also carried an
> unrelated, uncommitted `cursor` agent-provider WIP; that WIP was stashed before
> the build, so this tarball reflects exactly the `d4b7db7` commit (copy-to-worktree
> + log-cleanup) on top of `dc7dab2`.

### Why vendored (not a `github:` git dependency)

See [ADR-0028](../docs/adr/0028-kimi-sandcastle-afk-orchestrator.md). A git
dependency would run the fork's `prepare` (`husky && tsgo build`) on every
install — fragile under pnpm and hostile to reproducibility. A committed
prebuilt tarball is deterministic, needs no build toolchain at install time, and
pins the exact bytes.

### Rebuild

```bash
# in a checkout of the fork, on feature/kimi-code-provider
npm run build
npm pack --ignore-scripts
cp ai-hero-sandcastle-0.5.10.tgz <repo>/vendor/ai-hero-sandcastle-0.5.10-<shortsha>.tgz
# then bump the file: path in the root package.json and run: pnpm install
```
