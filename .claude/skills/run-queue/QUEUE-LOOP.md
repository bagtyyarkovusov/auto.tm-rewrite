# Queue loop

## Per-issue loop

For the next issue whose dependencies are all closed, or whose only open dependency is a PR this queue owns (see stacking):

1. Launch the issue's `queue-implementer` as above. It runs `run-issue`: reservation branch `agent/issue-<N>`, draft PR, `Execution state`, and verification.
2. Read its report and the PR. Launch one Standards and one Spec reviewer as separate fresh `queue-reviewer` agents, in parallel, read-only and pinned to the reported head SHA, each with a report under 400 words. Post both in one PR comment with their attribution, as [FINALIZATION.md](../run-issue/FINALIZATION.md#independent-review) describes. Review once ([ADR-0085](../../../docs/adr/0085-one-review-round-one-fix-round-no-re-review.md)): for accepted findings, launch one fresh implementer for the single fix round, then read its diff and record each finding's outcome in the PR body's `Execution state`. Do not launch a second review. When the fix goes beyond the findings or leaves an accepted blocking finding unresolved, leave the PR a draft and report to the founder.
3. When the review round is posted and the fix round, if any, is recorded, set auto-merge as [FINALIZATION.md](../run-issue/FINALIZATION.md#checks-and-merge) describes. GitHub merges the PR once the required `pr` check passes.
4. Do not wait for CI. Start the next ready issue. Between issues, use `pnpm agent:github queue` for a bounded open-PR snapshot and `pnpm agent:github pr <PR>` or `execution <PR>` for detail. Fetch relevant comments with `comments pr <PR>` and expand omitted content when it governs the next action, following [GitHub operations](../../../docs/agents/github-operations.md). Recheck a PR when its check fails, a reviewer or the founder comments, or it merges; a missing PR in the bounded open list does not prove it merged.
5. Before launching an implementer for a PR that has auto-merge on, run `gh pr merge <PR> --disable-auto`. A push does not cancel auto-merge, so without this GitHub would merge a commit you have not read. Set auto-merge again after reading the new commit.
6. After each merge, verify the issue closed through `Closes #N`, run `git fetch origin`, and remove `blocked` from queued issues whose dependencies are now all closed, following [sprint-transitions.md](../../../docs/agents/sprint-transitions.md). Then run `pnpm worktree:gc`, read its report, and run `pnpm worktree:gc:apply` to retire the worktrees that pass the gate ([cleanup script](../../../docs/agents/worktree-lifecycle.md#run-the-cleanup-gate)). Apply only from the orchestrator's own checkout, with no implementer mid-run in a worktree it is about to retire; the script already keeps locked, dirty and running worktrees. When the script or a worktree could not be retired, record the cleanup tuple instead.

A failed check on an auto-merge PR leaves it open. A fresh implementer repairs it within `run-issue`'s three-attempt cap. The orchestrator reads the repair before setting auto-merge again. The repair needs no review.

## Stop and report

Pause the affected issue, comment on it, and move to the next independent issue when work needs:

- a product, design, or architecture decision;
- a human-only action, such as credentials, a store console, production, or a physical device;
- a write the host guard refuses; or
- a root failure that survived three focused repair attempts ([BAIL-AND-RECOVERY.md](../run-issue/BAIL-AND-RECOVERY.md)).

Label a paused issue `ready-for-human` only when a human must act. Stop the queue when every remaining issue is paused, blocked, or waiting on another owner.

## Final report

For each selected issue: its PR, merged commit or current state, evidence by acceptance criterion, gates run, missing evidence, follow-up issues filed, labels changed, and its implementer worktrees. Run `pnpm worktree:gc:apply` once more at queue end, then include its completion report: worktrees removed, worktrees kept with the script's exact reason (stopped ones by path), branches deleted, and stale Railway environments. Add a cleanup tuple only for a worktree the script could not retire. List skipped and paused issues with the reason. For a delegated outcome, reconcile the parent record against its completion evidence and report any missing gate or human action; merged code alone does not establish completion.
