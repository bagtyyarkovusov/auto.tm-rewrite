---
name: resume-issue
description: Inspects and safely resumes a previously interrupted AutoTM issue from its durable branch, worktree, draft pull request, execution state, comments, and checks. Codex desktop, Claude Code desktop, or the claude-kimi CLI may resume another client's attempt.
argument-hint: "[issue-number]"
arguments:
  - issue
disable-model-invocation: true
---

# Resume one issue

Git and GitHub state, not the prior chat, own recovery. Preserve the previous attempt until its state is understood. Use the canonical [domain glossary](../../../docs/domain/GLOSSARY.md) when reconstructing acceptance criteria and documentation.

## Resolve and inspect

1. Follow [AGENTS.md](../../../AGENTS.md) and [the coding workflow](../../../docs/agents/coding-workflow.md). Read the issue, its governing references, and the latest durable state. Load affected overviews, source, tests, and relevant vocabulary; load roadmap/sprint/charter decisions only when they govern this task.
2. If `$issue` is empty, list candidates from local/remote `agent/issue-*` branches, worktrees, blocked execution states, and open PRs; require selection.
3. Inspect issue/dependencies, local and remote heads, worktree status and diff, commits versus `main`, PR body/comments/checks, review SHAs, and running processes. Treat missing or interrupted results as `unknown`.
4. Classify the attempt as reservation-only, local changes, pushed checkpoints without PR, open draft/ready PR, or merged PR with bookkeeping drift. Also note whether auto-merge is on (`gh pr view <PR> --json autoMergeRequest`) and whether the PR is stacked (its base is not `main`; see `Stacked on` in its Execution state).
5. Run non-mutating scoped checks needed to understand state. Never query provider quota.

## Select the recovery path

Choose the safest path from evidence without adding an ordinary confirmation stop:

- **Refresh a reservation-only branch:** if it has no unique commits, worktree changes, or open PR, fast-forward it to current `main` before continuing. A stacked reservation stays on its parent's branch head until the parent merges; then follow [run-queue stacking](../run-queue/SKILL.md#stacking). This includes a branch preserved while `design-grill` produced and merged design artifacts.
- **Continue:** heads agree or fast-forward safely; preserve the existing base and worktree. When another session or agent, including a finished or stopped one, owns that worktree, only read it. Continue in your own worktree from the pushed head, as [run-queue](../run-queue/SKILL.md#resume-a-stopped-implementer) describes.
- **Safety branch and rebase:** the branch diverged but the resolution is mechanical; create a preservation ref, rebase on current `main`, then continue.
- **Preserve and restart:** the canonical branch is missing or unusable; preserve every recoverable ref/diff before rebuilding `agent/issue-<N>` from `main`.
- **Bookkeeping repair:** code already merged and closure is intact; reconcile only the parent tasklist and affected `blocked` labels through `docs/agents/sprint-transitions.md`. Do not change an implementation issue's open/closed state directly.

Pause and escalate when an issue remains open after its closing PR merged, following the integrity rule in [`../run-issue/FINALIZATION.md`](../run-issue/FINALIZATION.md). Also pause when recovery is destructive, overlaps user work, or a conflict has multiple valid semantic resolutions. Never delete preserved evidence automatically.

## Continue through completion

1. Restore or create the one draft PR after the first pushed checkpoint and update its `Execution state` using [`../run-issue/EXECUTION-STATE.md`](../run-issue/EXECUTION-STATE.md).
2. Rebuild the acceptance-criterion evidence map and reconcile terminology without expanding scope.
3. Run the scoped typecheck, lint, tests, runtime-import checks, Expo gates, host-only checks, and documentation reconciliation required by the touched workspaces.
4. A run-queue implementer stops after verification and returns its report to the orchestrator, which owns reviews, ready, and merge. Everyone else follows the [fixed-commit finalization contract](../run-issue/FINALIZATION.md): pin the SHA, obtain independent Standards and Spec verdict comments, resolve findings, set auto-merge, and verify the merge and closure. Turn auto-merge off before pushing to a PR that has it on. Reuse the existing PR.
5. If completion stops again, preserve and update the same branch and PR state.

## Completion

Report the recovery path, preserved safety state, PR/merge/issue status, verification evidence, and dependents changed.
