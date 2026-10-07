# Queue stacking

## Stacking

When the next issue depends on a PR of this queue that is reviewed but not merged yet:

1. The parent PR's own base must be `main`: stacks are one level deep. A child waits instead when its parent is itself stacked, or when it depends on more than one unmerged PR.
2. The child's `blocked` label, if it is caused only by that parent, does not stop it. Leave the label on until the parent merges.
3. The child's implementer branches `agent/issue-<N>` from the parent's branch head, pushes it, and opens the draft PR with the parent branch as its base. It records `Stacked on: #<parent PR> at <parent head SHA>` in the `Execution state`, and updates that SHA whenever it rebases the child onto new parent commits.
4. Review the stacked PR against its own diff. Do not set auto-merge on it and never merge it into its parent branch. PR Checks runs only for pull requests into `main`, so a stacked PR has no `pr` check yet. The implementer's local gates are its evidence.
5. After the parent squash-merges, GitHub deletes the parent branch and retargets the child PR to `main`. If the base is still the parent branch, run `gh pr edit <PR> --base main` first. Then launch a fresh implementer to rebase: `git fetch origin`, `git switch --detach origin/agent/issue-<N>`, `git rebase --onto origin/main <recorded parent head SHA>`, and `git push --force-with-lease=agent/issue-<N>:<child head SHA before the rebase> origin HEAD:agent/issue-<N>`. The push after retargeting starts the `pr` check. If the check still does not start, close and reopen the PR.
6. Remove the child's `blocked` label. A clean rebase leaves the child's own diff unchanged: confirm it with `git range-diff` and record that in `Execution state`. If a conflict changed the child's content, read the change and record it. Then set auto-merge.

Wait instead of stacking when a rebase would need a semantic conflict resolution.

