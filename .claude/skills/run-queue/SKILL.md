---
name: run-queue
description: Works a founder-given ordered list of AutoTM issues from one orchestrator session. The orchestrator dispatches each implementer into its own worktree using the host-specific lifecycle; each issue still gets its own run-issue branch, draft pull request, execution state, and one fixed-commit review round, unless the founder groups issues on an integration branch. The orchestrator sets auto-merge after the review and its one fix round and starts the next ready issue without waiting for CI. Use when the user invokes /run-queue with issue numbers or asks one agent to work a queue of issues.
argument-hint: "[issue numbers in order, with dependencies]"
arguments:
  - queue
disable-model-invocation: true
---

# Run a queue of issues

One orchestrator session owns a queue from start to finish, so it keeps context between related issues and does not wait idle for CI. It does not implement. Under this skill the orchestrator is the issue's integration owner, as run-issue, FINALIZATION, and ADR-0064 and ADR-0067 mean the term. Each issue's implementer is a separate agent in its own worktree, under the [host-specific lifecycle](../../../docs/agents/worktree-lifecycle.md#queue-implementer-worktrees). Every issue still follows [run-issue](../run-issue/SKILL.md) and the [coding workflow](../../../docs/agents/coding-workflow.md) in full; this skill adds ordering, implementer handoff, auto-merge, stacking, and integration branches.

## Accept the queue

1. The founder supplies the queue: issue numbers in order, and optionally which issues wait for which. Human selection sets the order ([ADR-0058](../../../docs/adr/0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)). Never add issues the founder did not list. If `$queue` is empty, ask for it.
2. For each listed issue, read its `## Depends on` section, labels, comments, and any branch or PR. Build the order: listed order, moved later only when a dependency is still open.
3. Skip, and report, any issue that is closed, labelled `ready-for-human`, or already owned by another open branch or PR. An existing branch or PR for a listed issue is resumed through [resume-issue](../resume-issue/SKILL.md) only when it has no other live owner.
4. Never query provider quota. Implementers push checkpoints often, so another agent can resume any issue from its PR if a session stops.
5. Confirm a supported worktree route: Claude host-created isolation or Codex writer-created ownership under [ADR-0071](../../../docs/adr/0071-codex-queue-models-and-owned-worktrees.md). If neither is available, see [Hosts without isolated subagents](#hosts-without-isolated-subagents).

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

### Resume a stopped implementer

When an implementer stops before it reports, for example at an API session limit:

1. Read the PR's `Execution state` and the pushed branch head.
2. Launch a fresh implementer in a new worktree through the host-specific lifecycle. It checks out the pushed head with `git switch --detach origin/agent/issue-<N>`.
3. Give it the stopped agent's worktree path. It may read files there, for example with `cat`, and copy uncommitted drafts into its own worktree. It never writes in that worktree and never runs git against it.
4. Leave the stopped worktree to the cleanup script, which keeps it while it is dirty, locked or unmatched, and list it in the final report.

### Hosts without isolated subagents

When neither the Claude isolation route nor the Codex owned-worktree route is available, do not create worktrees for other issues or write to them. Tell the founder, who runs one session per issue with `/run-issue <N>` in the queue order. Each of those sessions works in the worktree its host gave it, or in one it created for itself under the [worktree lifecycle](../../../docs/agents/worktree-lifecycle.md).

## Per-issue loop

For the next issue whose dependencies are all closed, or whose only open dependency is a PR this queue owns (see stacking):

1. Launch the issue's `queue-implementer` as above. It runs `run-issue`: reservation branch `agent/issue-<N>`, draft PR, `Execution state`, and verification.
2. Read its report and the PR. Launch one Standards and one Spec reviewer as separate fresh `queue-reviewer` agents, in parallel, read-only and pinned to the reported head SHA, each with a report under 400 words. Post both in one PR comment with their attribution, as [FINALIZATION.md](../run-issue/FINALIZATION.md#independent-review) describes. Review once ([ADR-0085](../../../docs/adr/0085-one-review-round-one-fix-round-no-re-review.md)): for accepted findings, launch one fresh implementer for the single fix round, then read its diff and record each finding's outcome in the PR body's `Execution state`. Do not launch a second review. When the fix goes beyond the findings or leaves an accepted blocking finding unresolved, leave the PR a draft and report to the founder.
3. When the review round is posted and the fix round, if any, is recorded, set auto-merge as [FINALIZATION.md](../run-issue/FINALIZATION.md#checks-and-merge) describes. GitHub merges the PR once the required `pr` check passes.
4. Do not wait for CI. Start the next ready issue. Between issues, read each open queue PR with `gh pr view <PR> --json state,mergedAt,autoMergeRequest,statusCheckRollup,comments`, and come back to it when its check fails, a reviewer or the founder comments, or it merges.
5. Before launching an implementer for a PR that has auto-merge on, run `gh pr merge <PR> --disable-auto`. A push does not cancel auto-merge, so without this GitHub would merge a commit you have not read. Set auto-merge again after reading the new commit.
6. After each merge, verify the issue closed through `Closes #N`, run `git fetch origin`, and remove `blocked` from queued issues whose dependencies are now all closed, following [sprint-transitions.md](../../../docs/agents/sprint-transitions.md). Then run `pnpm worktree:gc`, read its report, and run `pnpm worktree:gc:apply` to retire the worktrees that pass the gate ([cleanup script](../../../docs/agents/worktree-lifecycle.md#run-the-cleanup-gate)). Apply only from the orchestrator's own checkout, with no implementer mid-run in a worktree it is about to retire; the script already keeps locked, dirty and running worktrees. When the script or a worktree could not be retired, record the cleanup tuple instead.

A failed check on an auto-merge PR leaves it open. A fresh implementer repairs it within `run-issue`'s three-attempt cap. The orchestrator reads the repair before setting auto-merge again. The repair needs no review.

## Stacking

When the next issue depends on a PR of this queue that is reviewed but not merged yet:

1. The parent PR's own base must be `main`: stacks are one level deep. A child waits instead when its parent is itself stacked, or when it depends on more than one unmerged PR.
2. The child's `blocked` label, if it is caused only by that parent, does not stop it. Leave the label on until the parent merges.
3. The child's implementer branches `agent/issue-<N>` from the parent's branch head, pushes it, and opens the draft PR with the parent branch as its base. It records `Stacked on: #<parent PR> at <parent head SHA>` in the `Execution state`, and updates that SHA whenever it rebases the child onto new parent commits.
4. Review the stacked PR against its own diff. Do not set auto-merge on it and never merge it into its parent branch. PR Checks runs only for pull requests into `main`, so a stacked PR has no `pr` check yet. The implementer's local gates are its evidence.
5. After the parent squash-merges, GitHub deletes the parent branch and retargets the child PR to `main`. If the base is still the parent branch, run `gh pr edit <PR> --base main` first. Then launch a fresh implementer to rebase: `git fetch origin`, `git switch --detach origin/agent/issue-<N>`, `git rebase --onto origin/main <recorded parent head SHA>`, and `git push --force-with-lease=agent/issue-<N>:<child head SHA before the rebase> origin HEAD:agent/issue-<N>`. The push after retargeting starts the `pr` check. If the check still does not start, close and reopen the PR.
6. Remove the child's `blocked` label. A clean rebase leaves the child's own diff unchanged: confirm it with `git range-diff` and record that in `Execution state`. If a conflict changed the child's content, read the change and record it. Then set auto-merge.

Wait instead of stacking when a rebase would need a semantic conflict resolution.

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

## Stop and report

Pause the affected issue, comment on it, and move to the next independent issue when work needs:

- a product, design, or architecture decision;
- a human-only action, such as credentials, a store console, production, or a physical device;
- a write the host guard refuses; or
- a root failure that survived three focused repair attempts ([BAIL-AND-RECOVERY.md](../run-issue/BAIL-AND-RECOVERY.md)).

Label a paused issue `ready-for-human` only when a human must act. Stop the queue when every remaining issue is paused, blocked, or waiting on another owner.

## Final report

For each listed issue: its PR, merged commit or current state, evidence by acceptance criterion, gates run, missing evidence, follow-up issues filed, labels changed, and its implementer worktrees. Run `pnpm worktree:gc:apply` once more at queue end, then include its completion report: worktrees removed, worktrees kept with the script's exact reason (stopped ones by path), branches deleted, and stale Railway environments. Add a cleanup tuple only for a worktree the script could not retire. List skipped and paused issues with the reason.
