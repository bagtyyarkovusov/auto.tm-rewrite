# Queue dispatch

## Agent types and models

Use the [queue model profile](../../../docs/agents/queue-models.md) for the actual host. On Codex, dispatch separate writing and review tasks with that profile; the writing agent creates its own worktree. The Claude project agent types live in [.claude/agents](../../agents).

On Claude Code, the first file in a new `.claude/agents/` directory needs a session restart before the host picks it up. Until then, the agent types are missing. Launch a reviewer as the built-in `Plan` type, which has no Edit or Write, with `model` set to Opus. Launch an implementer as `general-purpose` with `model` set to Opus and `isolation: "worktree"`. Effort follows the session.

## Implementers and worktrees

Each implementer gets its own linked worktree, and an issue has at most one writing worktree at a time ([ADR-0069](../../../docs/adr/0069-queue-implementers-run-in-host-created-worktrees.md), amending ADR-0058). Creation follows the [host-specific lifecycle](../../../docs/agents/worktree-lifecycle.md#queue-implementer-worktrees); the orchestrator never creates it.

- **Who creates it.** Use the lifecycle's Claude or Codex route. Give Codex writers an absolute unique worktree path and the supplied base; the writer creates and owns that worktree before editing.
- **Who writes to it.** Only its implementer. Every agent writes only in its own worktree and in `/tmp`. If the host refuses a write, the agent stops and reports the exact message. It never retries through a shell command, a script, or another tool. The orchestrator never edits, formats, or commits in an implementer's worktree, and never creates issue worktrees with `git worktree add`.
- **How it reaches the issue branch.** The first implementer runs `git fetch origin`, then `git switch -c agent/issue-<N> origin/main` (or from the parent branch head when stacked), and pushes the reservation with `git push -u origin agent/issue-<N>`. A later implementer for the same issue runs `git fetch origin`, `git switch --detach origin/agent/issue-<N>`, and pushes with `git push origin HEAD:agent/issue-<N>`, because the named branch may still be checked out in the earlier worktree.
- **Guard-friendly commands.** Keep Bash commands plain and separate. Pass environment values, such as the CI-only values in `scripts/ci-services.sh`, as literal `VAR=value` prefixes, not through `source` or `env $(…)`. The guard refuses commands it cannot verify.
- **Checkpoints.** The implementer commits and pushes a small checkpoint after each meaningful step and keeps the draft PR's `Execution state` current. Only pushed work survives an agent that stops.
- **Sliced issues.** For an issue with numbered slices ([ADR-0082](../../../docs/adr/0082-an-issue-may-carry-up-to-three-ordered-slices.md)), the implementer works them in order, runs each slice's check, pushes a checkpoint and ticks the slice in `Execution state` before starting the next. Give a three-slice issue to a Claude Opus or Codex implementer. Choose at least one final reviewer on a different model than the implementer, and tell the Spec reviewer to check every slice's criteria and the real-path proof.
- **What to give it.** The issue number, the base (`origin/main` or the parent branch), the rules above, and what to return: PR number, head SHA, gate results, guard messages, and open decisions. The implementer runs `run-issue` through verification. The orchestrator owns review and merge.
- **Who retires it.** The host removes a worktree whose implementer made no changes. A worktree with commits or uncommitted files stays after its agent ends. The orchestrator never removes another agent's worktree by hand, never forces a removal, and never removes one the script keeps. It retires worktrees only by running `pnpm worktree:gc` and then `pnpm worktree:gc:apply`, which apply the [cleanup gate](../../../docs/agents/worktree-lifecycle.md#safe-cleanup-gate) ([ADR-0076](../../../docs/adr/0076-orchestrator-runs-the-worktree-cleanup-gate-after-every-merge.md)). A worktree that passes needs no separate user approval, and the user can still keep any worktree by locking it.

### Limits

- On a host that cannot message a finished agent, a finished or stopped implementer cannot be messaged or resumed with its context. Each fix round starts a fresh implementer from the PR: its `Execution state`, the review comments, and the branch head.
- Agents report once and stop. Wake an agent only for new work, rather than repeated status reports.
- Apply the [host-specific concurrency profile](../../../docs/agents/queue-models.md) when dispatching implementers, reviewers, and fixers. Each worktree needs its own install; isolate service stacks and avoid shared file or simulator collisions. ADR-0064 still sets no limit on issues in flight; issues waiting on CI or review need no running implementer.

