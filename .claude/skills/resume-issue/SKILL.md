---
name: resume-issue
description: Inspects and safely resumes a previously interrupted AutoTM issue from its durable branch, worktree, draft pull request, execution state, comments, and checks. Codex or Claude may resume an attempt created by the other.
argument-hint: "[issue-number]"
arguments:
  - issue
disable-model-invocation: true
---

# Resume one issue

Git and GitHub state, not the prior chat, own recovery. Preserve the previous attempt until its state is understood. Use the canonical [domain glossary](../../../docs/domain/GLOSSARY.md) when reconstructing acceptance criteria and documentation.

## Resolve and inspect

1. Read `CLAUDE.md`, `GRILL-OUTCOME.md`, the roadmap, glossary, CONTEXT map, ADR-0019, ADR-0020, ADR-0058, the issue, its references, and the latest durable state.
2. If `$issue` is empty, list candidates from local/remote `agent/issue-*` branches, worktrees, blocked execution states, and open PRs; require selection.
3. Inspect issue/dependencies, local and remote heads, worktree status and diff, commits versus `main`, PR body/comments/checks, review SHAs, and running processes. Treat missing or interrupted results as `unknown`.
4. Classify the attempt as reservation-only, local changes, pushed checkpoints without PR, open draft/ready PR, or merged PR with bookkeeping drift.
5. Run non-mutating scoped checks needed to understand state. Never query provider quota.

## Select the recovery path

Choose the safest path from evidence without adding an ordinary confirmation stop:

- **Continue:** heads agree or fast-forward safely; preserve the existing base and worktree.
- **Safety branch and rebase:** the branch diverged but the resolution is mechanical; create a preservation ref, rebase on current `main`, then continue.
- **Preserve and restart:** the canonical branch is missing or unusable; preserve every recoverable ref/diff before rebuilding `agent/issue-<N>` from `main`.
- **Bookkeeping repair:** code already merged; verify the PR/issue/dependency state and repair only the authorized metadata.

Pause only when recovery is destructive, overlaps user work, or a conflict has multiple valid semantic resolutions. Never delete preserved evidence automatically.

## Continue through completion

1. Restore or create the one draft PR after the first pushed checkpoint and update its `Execution state` using [`../run-issue/EXECUTION-STATE.md`](../run-issue/EXECUTION-STATE.md).
2. Rebuild the acceptance-criterion evidence map and reconcile terminology without expanding scope.
3. Run the scoped typecheck, lint, tests, runtime-import checks, Expo gates, host-only checks, and documentation reconciliation required by the touched workspaces.
4. Follow the [fixed-commit finalization contract](../run-issue/FINALIZATION.md): pin the SHA, obtain independent Standards and Spec verdict comments, resolve findings, wait for checks, merge, and verify closure. Reuse the existing PR.
5. If completion stops again, preserve and update the same branch and PR state.

## Completion

Report the recovery path, preserved safety state, PR/merge/issue status, verification evidence, and dependents changed.
