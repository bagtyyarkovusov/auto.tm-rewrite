# Vendored dependencies

## `ai-hero-sandcastle-0.5.10-dc7dab2.tgz`

Prebuilt tarball of the Kimi-enabled `@ai-hero/sandcastle` fork, consumed as a
**host-only** devDependency (`file:`) by the root `package.json`. Sandcastle runs
on the developer Mac to orchestrate Docker sandboxes; it never enters a sandbox
image or any deployed artifact, so it does not touch the air-gapped runtime.

- **Upstream:** https://github.com/mattpocock/sandcastle (`@ai-hero/sandcastle`)
- **Fork:** https://github.com/bagtyyarkovusov/sandcastle
- **Branch / commit:** `feature/kimi-code-provider` @ `dc7dab2` (`kimiCode` agent provider + Claude Code stream-json parsing; setup hooks in `createSandbox` now fail on non-zero exit with stderr and managed worktree paths are canonicalized on macOS)
- **Built:** 2026-06-07 via `npm run build && npm pack --ignore-scripts`
  (tsgo build; `--ignore-scripts` skips the fork's `husky` + rebuild `prepare`).

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
