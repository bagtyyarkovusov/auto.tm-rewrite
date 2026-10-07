# Queue integration

## Integration branches

When the founder groups issues under one parent spec ([ADR-0084](../../../docs/adr/0084-related-issues-of-one-parent-may-ship-on-one-integration-branch.md)), they share one branch and one PR instead of stacking. Unrelated issues keep one PR each.

1. Create the integration branch from `origin/main` without a worktree: `git fetch origin`, then `git push origin origin/main:refs/heads/agent/spec-<parent>-<slug>`.
2. Give each issue's implementer the integration branch as its base. It works on `agent/issue-<N>`, pushes checkpoints, opens no PR, and merges the integration tip into its branch before it reports. Until the integration PR exists, it keeps its `Execution state` in one comment on its issue, with the fields [BAIL-AND-RECOVERY.md](../run-issue/BAIL-AND-RECOVERY.md#pushed-checkpoint-without-a-draft-pr) lists, and updates that comment at each checkpoint. A resumed grouped issue starts from that comment and its branch head, and never opens its own PR.
3. After every grouped issue has reported, launch one merger implementer. It runs once. Only one agent writes the integration branch at a time: the merger and a fix-round implementer never overlap. The merger:
   - runs `git fetch origin` and `git switch --detach origin/agent/spec-<parent>-<slug>`;
   - merges the issue branches in issue-number order, each with `git merge --no-ff origin/agent/issue-<N>`;
   - when `main` has moved since step 1, runs `git merge --no-ff origin/main`;
   - resolves mechanical conflicts itself, and stops and reports on a conflict with more than one valid resolution;
   - pushes with `git push origin HEAD:agent/spec-<parent>-<slug>`; and
   - opens one draft PR with `gh pr create --draft --base main --head agent/spec-<parent>-<slug>`. Its body has a `Closes #<N>` line for every issue and one `Execution state` per issue, copied from that issue's comment.
4. Review the integration PR once at its head, and start only after the last grouped issue is merged. Tell the Spec reviewer to check every issue's and slice's criteria.
5. When one issue of the group fails review, launch the fix-round implementer on the integration branch, as in steps 2 and 5 of the per-issue loop: `git fetch origin`, `git switch --detach origin/agent/spec-<parent>-<slug>`, then `git push origin HEAD:agent/spec-<parent>-<slug>`. An issue branch is finished once the merger has folded it, so no re-merge is needed.
6. Continue at step 3 of the per-issue loop. After the integration PR merges, delete each grouped issue's remote branch with `git push origin --delete agent/issue-<N>`, because GitHub removes only the PR's head branch.

