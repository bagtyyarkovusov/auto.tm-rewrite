# Worktree lifecycle

Use one linked worktree per agent session and retire it after its PR merges. This prevents host-created scaffold branches, canonical task branches, and full dependency trees from accumulating after successful work.

The canonical `agent/issue-<N>` branch and its pull request are the durable reservation and recovery record. Codex, Claude, or another supported agent that finds either resumes it after inspecting the issue, local and remote heads, worktree, PR body/comments/checks, running processes, and diff. It never creates a parallel attempt because the prior chat is unavailable.

## Start in the worktree you already have

Some hosts create a linked worktree and a `claude/<name>` or `codex/<name>` branch before the task begins.

1. Inspect `git worktree list --porcelain`, the current branch, status, local/remote task branches, and open PRs.
2. If the current checkout is already an isolated linked worktree, reuse it. Create or switch to the workflow's canonical branch in that worktree; do not create a second linked worktree for the same task.
3. Record any host scaffold branch and its starting SHA. It is cleanup-eligible only while it remains unchanged and has no PR or remote work.
4. Create a new linked worktree only when the current checkout is the shared repository checkout or the task explicitly needs another isolated checkout.

## Treat merge and cleanup as separate results

`gh pr merge --squash --delete-branch` can merge the PR and delete the remote branch, then exit non-zero because the local branch is still checked out in a linked worktree. Always verify the PR state and merge commit independently from the command's exit status.

After a successful merge, record this cleanup tuple:

- linked worktree path;
- local task branch and any unchanged host scaffold branch;
- task branch HEAD, which must equal the PR's final `headRefOid`;
- PR URL and merge commit.

An agent whose live session uses that linked worktree reports the tuple instead of deleting its own working directory. The root or integration session removes it after the worker session finishes.

## Safe cleanup gate

The root or integration session may retire a completed worktree only when every condition holds:

- the worker session has finished and the worktree is not locked or active;
- `git status --porcelain` in the worktree is empty;
- the PR is `MERGED` and the issue is closed when the PR should close it;
- the worktree HEAD equals the PR's final `headRefOid`, so no post-PR commit would be lost; and
- the branch is not an evidence, prototype, research, active draft-PR, or app-managed Codex worktree.

Age, a quiet terminal, or an absent agent session never satisfies the cleanup gate by itself.

Remove without force, then delete refs conditionally:

```bash
git worktree remove <path>
git update-ref -d refs/heads/<task-branch> <expected-head-sha>
git update-ref -d refs/heads/<unchanged-scaffold-branch> <recorded-start-sha>
git worktree prune
```

Delete a remaining remote task branch only after verifying the PR merged and the remote ref still points at the recorded PR head. A failed gate preserves the worktree and reports the exact reason.

## Completion report

Report worktrees removed, local and remote refs removed, worktrees deliberately preserved, and any cleanup tuple still waiting for its worker session to end.
