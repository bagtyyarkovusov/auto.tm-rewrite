# Worktree merge cleanup

## Treat merge and cleanup as separate results

`gh pr merge --squash --delete-branch` can merge the PR and delete the remote branch, then exit non-zero because the local branch is still checked out in a linked worktree. Always verify the PR state and merge commit independently from the command's exit status.

After a successful merge, record this cleanup tuple:

- linked worktree path;
- local task branch and any unchanged host scaffold branch;
- task branch HEAD, which must equal the PR's final `headRefOid`. For a queue implementer's worktree on a detached HEAD, record the detached HEAD SHA instead of a task branch;
- PR URL and merge commit.

An agent whose live session uses that linked worktree reports the tuple instead of deleting its own working directory. The root or integration session removes it after the worker session finishes by running the [cleanup script](worktree-lifecycle.md#run-the-cleanup-gate), which finds the worktree by the same gate. The tuple remains the manual record when the script is unavailable.

## Safe cleanup gate

The root or integration session retires a completed worktree, with the [cleanup script](worktree-lifecycle.md#run-the-cleanup-gate) as the normal route and the user or the host as the alternative, only when every condition holds:

- the worker session has finished and the worktree is not locked or active;
- `git status --porcelain` in the worktree is empty;
- the PR is `MERGED` into `main` and the issue is closed when the PR should close it;
- the worktree HEAD equals the PR's final `headRefOid`, so no post-PR commit would be lost. For a queue implementer's worktree, a clean HEAD that is an ancestor of the final `headRefOid` also passes (check with `git merge-base --is-ancestor <HEAD> <final headRefOid>`), because earlier fix rounds end on older commits. The check needs the PR head object in the local object store, so run `git fetch origin` first; a worktree whose PR head is missing is kept as "no PR match"; and
- the branch is not an evidence, prototype, research, active draft-PR, or app-managed Codex worktree.

Age, a quiet terminal, or an absent agent session never satisfies the cleanup gate by itself.

By hand, remove without force, then delete refs conditionally:

```bash
git worktree remove <path>
git update-ref -d refs/heads/<task-branch> <expected-head-sha>
git update-ref -d refs/heads/<unchanged-scaffold-branch> <recorded-start-sha>
git worktree prune
```

Delete a remaining remote task branch only after verifying the PR merged and the remote ref still points at the recorded PR head. A failed gate preserves the worktree and reports the exact reason.

