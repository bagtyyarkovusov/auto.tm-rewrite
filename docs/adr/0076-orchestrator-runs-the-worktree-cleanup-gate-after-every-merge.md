# ADR-0076: The orchestrator runs the worktree cleanup gate after every merge

- **Status**: Proposed
- **Date**: 2026-10-01
- **Deciders**: AutoTM founder (orchestration chat, 2026-10-01); acceptance delegated to the orchestrator
- **Amends**: [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md)'s Cleanup rule, which reserves removal of queue implementer worktrees for the user or the host, and [ADR-0071](0071-codex-queue-models-and-owned-worktrees.md)'s statement that cleanup stays under the lifecycle's safety gate with no blanket authorization. The rest of both remains in force.

## Context

On 2026-10-01 this Mac held 47 linked worktrees using about 60 GB. 26 of them passed the [safe cleanup gate](../agents/worktree-lifecycle.md#safe-cleanup-gate) and were removed by hand with an ad-hoc script. The gate was written down, but nothing ran it, and ADR-0069 and ADR-0071 left removal of queue implementer worktrees to the user or the host. So cleanup happened only when someone remembered, and every merged queue issue added a worktree with a full dependency tree, a `worktree-agent-<id>` scaffold branch and a task branch.

The founder decided in the orchestration chat on 2026-10-01 to enforce the cleanup rules so the repository stays tidy, and to let the orchestrator apply them. Issue [#482](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/482) builds the mechanism. The founder delegated acceptance of this ADR to the orchestrator, which records it in review.

## Decision

**The gate becomes code, `scripts/worktree-gc.mjs`. The orchestrator or integration session runs `pnpm worktree:gc` after each merge and at queue end, and `pnpm worktree:gc:apply` (the script's `--apply` mode) removes the worktrees that pass the gate. A worktree that passes needs no separate user approval. The user can still keep any worktree.**

- **Who runs it.** The orchestrator or integration session, after it verifies the PR merged and the issue closed through `Closes #N` and has run `git fetch origin`, and once more at queue end. A session never runs it against a worktree it is itself working in, and an implementer never runs `--apply`.
- **What passes.** Exactly the existing gate: the worktree is clean, not locked, and holds no running process; its HEAD equals the matching PR's final `headRefOid` or is its ancestor; and that PR is merged. It matches a PR through HEAD, never through branch name alone, so commits after the PR head fail the gate.
- **What is always kept, with the exact reason reported.** The main checkout; the running session's own worktree; a Codex app-managed worktree under `~/.codex/worktrees`; a locked worktree (including another Claude session's lock); a worktree with a running process in it; a missing directory (prunable); an unborn branch; an evidence, prototype or research worktree; a dirty tree; an open PR; a PR closed without merging; a HEAD already on `main` that belongs to no PR; and no PR match. An unreadable status or process scan keeps the worktree or, for `--apply`, stops the run.
- **Read-only by default.** The default run changes nothing. `--apply` uses `git worktree remove` without `--force`, so git itself still refuses a dirty or locked tree. It then deletes the removed worktrees' `agent/issue-*` and `worktree-agent-*` branches, and local branches of those two forms that no worktree holds and whose tip is inside a merged PR head, each with `git update-ref -d refs/heads/<branch> <expected-sha>`, and finally runs `git worktree prune`. It stops at the first failure and prints a completion report of what was removed and kept. Other branches, remote branches and refs are never touched.
- **Keeping a worktree.** The user keeps any worktree by locking it (`git worktree lock`), leaving it dirty, or naming its branch or directory for evidence, prototype or research work. Nothing else is needed, and the orchestrator does not ask first.
- **Stale-state report.** Every run also lists local task and scaffold branches with no worktree that are safe to delete, and Railway PR environments whose PR is closed, from the read-only `railway environment list --json`. The Railway part is report only. Deletion stays with Railway's automatic lifecycle under [ADR-0075](0075-railway-pr-backends-for-agent-native-sessions.md).
- **Orchestrator rule.** The orchestrator still never removes a worktree by hand, never uses `--force`, and never removes a worktree this script reports as kept. This replaces ADR-0069's "never removes another agent's worktree" with "removes another agent's worktree only through the gate".

Unchanged: the shared pnpm store and Codex app-managed worktrees are never deleted, no Railway environment is deleted, and the host's own removal of unchanged implementer worktrees stays as it is.

## Consequences

### Positive

- Worktrees, scaffold branches and task branches stop accumulating after merges, and the reason a worktree stays is always printed.
- The gate is tested over fixtures, so a change to its rules fails a test instead of drifting from the documentation.
- Removal needs no user round trip for worktrees that provably lost nothing.

### Negative / accepted costs

- An orchestrator session now deletes directories on the shared Mac. The gate is conservative (every unknown is a keep), `--apply` never forces, and ref deletes are conditional, but a bug in the script could remove a worktree that should have stayed.
- Deleting a worktree discards its ignored files, such as `node_modules` and local `.env` copies, which the gate does not inspect.
- The ancestor check needs the PR head object in the local object store. A worktree whose PR head was never fetched is kept as "no PR match" until `git fetch origin` supplies it.
- Process detection sees only processes the user can list. A process outside that view is not detected, though a dirty tree or lock usually covers the work.

### Neutral

- ADR-0069's one-writing-worktree rule, host-created isolation, ownership and fix-round rules are unchanged, as are ADR-0071's Codex models and concurrency.
- `docs/agents/worktree-lifecycle.md` and `run-queue` carry the operating detail.

## Alternatives considered

- **Keep cleanup with the user.** Rejected. It left 47 worktrees and about 60 GB on one machine, and the gate was only prose.
- **Delete by age or by a quiet terminal.** Rejected. The gate already says age and absence never satisfy it.
- **A report-only script.** Rejected. The founder asked the orchestrator to apply the rules, and a report needs a manual step that is the one people skip.
- **Force removal for dirty merged worktrees.** Rejected. A clean-tree check is the guard against losing uncommitted work.
- **Delete Railway PR environments from the script.** Rejected. Railway deletes them when the PR closes, and deletion needs credentials beyond this decision.

## References

- Issue [#482](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/482)
- [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md) and [ADR-0071](0071-codex-queue-models-and-owned-worktrees.md)
- [ADR-0075](0075-railway-pr-backends-for-agent-native-sessions.md) - Railway PR environment lifecycle
- [`docs/agents/worktree-lifecycle.md`](../agents/worktree-lifecycle.md) and [`run-queue`](../../.claude/skills/run-queue/SKILL.md)
- [`scripts/worktree-gc.mjs`](../../scripts/worktree-gc.mjs)
