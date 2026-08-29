---
name: resume-issue
description: Inspects and safely resumes a previously bailed AutoTM issue from its preserved branch, remote branch, bail comment, or open pull request. Use when the user invokes /resume-issue or asks to continue, rebase, or restart an interrupted /run-issue attempt.
argument-hint: "[issue-number]"
arguments:
  - issue
disable-model-invocation: true
---

# Resume one issue

Inspect before mutation. Preserve the previous attempt until the user chooses a recovery path.

## Resolve and inspect

1. Read `CLAUDE.md`, `GRILL-OUTCOME.md`, the roadmap, [the domain glossary](../../../docs/domain/GLOSSARY.md), CONTEXT map, ADR-0019, ADR-0020, the issue, its references, and the latest bail comment. Reload relevant canonical terms even when the preserved attempt predates the glossary.
2. If `$issue` is empty, list candidates from local/remote `agent/issue-*` branches, recent bail comments, and open PRs; require selection.
3. Inspect issue state, dependencies, last bail comment, local and remote branch heads, working-tree diff, commits versus `main`, PR/check state, and merge/issue closure state.
4. Classify the attempt as local-only, pushed without PR, open PR, or merged PR with bookkeeping drift.
5. Run non-mutating/scoped verification needed to understand current state. Install dependencies only when dependency state requires it.

## Propose one recovery

Show evidence and require one explicit choice:

- **A — Continue:** keep the current base and finish the existing attempt.
- **B — Safety-branch and rebase:** preserve a safety branch, rebase on current `main`, then continue.
- **C — Preserve and restart:** rename/preserve the old branch and create a fresh `agent/issue-<N>` from `main`.
- **Cancel:** leave everything unchanged.

If the branch is missing, only restart is available. Never delete the preserved branch automatically. Stop for conflicts with multiple valid semantic resolutions; mechanical conflicts within the approved rebase may be resolved.

## Execute the choice

Approval of A or B authorizes the normal completion flow without another push/merge confirmation:

1. Rebuild the acceptance-criterion evidence map.
   - Reconcile new or changed names with the glossary without treating definitions as behavior, current-state evidence, or authorization for an unrelated naming migration.
2. Re-run scoped typecheck, lint, tests, runtime-import checks, Expo gates, host-only checks, and `CONTEXT.md` reconciliation required by the touched workspaces. Unknown or unavailable gates are not passes. Use the same three-focused-attempt cap as `/run-issue`.
3. Follow [the fixed-commit finalization contract](../run-issue/FINALIZATION.md): stage exact paths, create and pin the implementation commit, pass independent Standards and Spec review against that SHA, resolve findings and repeat affected axes, then push, check, merge, and verify integrity. These gates apply even when the preserved attempt already has commits or an open PR; reuse the PR rather than creating a duplicate.
4. If completion bails again, preserve the branch, working tree, remote branch, and PR. Comment with the failing command/root cause, attempts, passed evidence, exact state, and next recovery action; never reset, stash, delete, or overwrite user work.

For C, preserve the prior attempt first, then hand the fresh branch to the same `/run-issue` state machine. If the same root failure survives three focused attempts in the resumed run, bail rather than loop.

## Completion

Report the chosen path, preserved safety state, resulting PR/merge/issue status, verification evidence, and dependents changed.
