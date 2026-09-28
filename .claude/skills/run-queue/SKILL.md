---
name: run-queue
description: Works a founder-given ordered list of AutoTM issues with one long-running integration owner. Each issue still gets its own run-issue branch, draft pull request, execution state, and fixed-commit reviews; the owner sets auto-merge when both axes pass and starts the next ready issue without waiting for CI. Use when the user invokes /run-queue with issue numbers or asks one agent to work a queue of issues.
argument-hint: "[issue numbers in order, with dependencies]"
arguments:
  - queue
disable-model-invocation: true
---

# Run a queue of issues

One session owns a queue from start to finish, so it keeps context between related issues and does not wait idle for CI. Every issue in the queue still follows [run-issue](../run-issue/SKILL.md) and the [coding workflow](../../../docs/agents/coding-workflow.md) in full; this skill only adds ordering, auto-merge, and stacking.

## Accept the queue

1. The founder supplies the queue: issue numbers in order, and optionally which issues wait for which. Human selection sets the order ([ADR-0058](../../../docs/adr/0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)). Never add issues the founder did not list. If `$queue` is empty, ask for it.
2. For each listed issue, read its `## Depends on` section, labels, comments, and any branch or PR. Build the order: listed order, moved later only when a dependency is still open.
3. Skip, and report, any issue that is closed, labelled `ready-for-human`, or already owned by another open branch or PR. An existing branch or PR for a listed issue is resumed through [resume-issue](../resume-issue/SKILL.md) only when it has no other live owner.
4. Never query provider quota. Push checkpoints often, so another agent can resume any issue from its PR if this session stops.

## Per-issue loop

For the next issue whose dependencies are all closed, or whose only open dependency is a PR this session owns (see stacking):

1. Run the issue through `run-issue`: reservation branch `agent/issue-<N>`, draft PR, `Execution state`, verification, and independent Standards and Spec reviews pinned to the current commit. Fix findings under [Small changes](../../../docs/agents/coding-workflow.md#small-changes-adr-0065) when they qualify.
2. When both axes pass on the current commit, directly or carried forward by a `Delta` review, set auto-merge as [FINALIZATION.md](../run-issue/FINALIZATION.md#checks-and-merge) describes. GitHub merges the PR once the required `pr` check passes.
3. Do not wait for CI. Start the next ready issue. Come back to a PR when its check fails, when a reviewer or the founder comments, or when it merges.
4. After each merge, verify the issue closed through `Closes #N`, sync local `main`, and remove `blocked` from queued issues whose dependencies are now all closed, following [sprint-transitions.md](../../../docs/agents/sprint-transitions.md).

A failed check on an auto-merge PR leaves it open. Repair it within `run-issue`'s three-attempt cap; a content change re-runs the affected review before auto-merge is set again.

## Stacking

When the next issue depends on a PR of this queue that is reviewed but not merged yet:

1. Branch `agent/issue-<N>` from the parent's branch head, push it, and open the draft PR with the parent branch as its base. State the parent PR in the `Execution state`.
2. Review the stacked PR against its own diff. Do not set auto-merge on it and never merge it into its parent branch.
3. After the parent squash-merges, rebase the child onto `main`, dropping the parent's commits: `git rebase --onto origin/main <old-parent-head>`. Push with `--force-with-lease`, then `gh pr edit <PR> --base main`.
4. Rebasing changes the child's commit. Re-run the review axes whose evidence the rebase changed, or record a `Delta` review of the rebased commit, then set auto-merge.

Keep stacks shallow: at most one unmerged parent per child. Wait instead when a rebase would need a semantic conflict resolution.

## Stop and report

Pause the affected issue, comment on it, and move to the next independent issue when work needs:

- a product, design, or architecture decision;
- a human-only action, such as credentials, a store console, production, or a physical device; or
- a root failure that survived three focused repair attempts ([BAIL-AND-RECOVERY.md](../run-issue/BAIL-AND-RECOVERY.md)).

Label a paused issue `ready-for-human` only when a human must act. Stop the queue when every remaining issue is paused, blocked, or waiting on another owner.

## Final report

For each listed issue: its PR, merged commit or current state, evidence by acceptance criterion, gates run, missing evidence, follow-up issues filed, and labels changed. List skipped and paused issues with the reason.
