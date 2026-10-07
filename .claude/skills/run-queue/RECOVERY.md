# Queue recovery

### Resume a stopped implementer

When an implementer stops before it reports, for example at an API session limit:

1. Read the PR's `Execution state` and the pushed branch head.
2. Launch a fresh implementer in a new worktree through the host-specific lifecycle. It checks out the pushed head with `git switch --detach origin/agent/issue-<N>`.
3. Give it the stopped agent's worktree path. It may read files there, for example with `cat`, and copy uncommitted drafts into its own worktree. It never writes in that worktree and never runs git against it.
4. Leave the stopped worktree to the cleanup script, which keeps it while it is dirty, locked or unmatched, and list it in the final report.

### Hosts without isolated subagents

When neither the Claude isolation route nor the Codex owned-worktree route is available, do not create worktrees for other issues or write to them. Tell the founder, who runs one session per issue with `/run-issue <N>` in the queue order. Each of those sessions works in the worktree its host gave it, or in one it created for itself under the [worktree lifecycle](../../../docs/agents/worktree-lifecycle.md).

