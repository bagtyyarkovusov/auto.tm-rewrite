---
name: run-queue
description: Orchestrate a founder-selected queue or explicitly delegated outcome with isolated writers, durable issue state and protected merges.
argument-hint: "[issue numbers in order, or explicitly delegated outcome]"
arguments:
  - queue
disable-model-invocation: true
---

# Run a queue of issues

One orchestrator owns selection, ordering, review and integration; separate implementers own code in their worktrees. Each issue follows [run-issue](../run-issue/SKILL.md) and the [coding workflow](../../../docs/agents/coding-workflow.md). Load the reference for the current phase or branch, rather than reading all references at startup.

## Accept the queue

1. Accept either a founder-numbered queue or an explicitly founder-delegated outcome ([ADR-0087](../../../docs/adr/0087-founder-delegated-outcome-orchestration.md)). For a numbered queue, retain the supplied scope and order; add issues only if the founder explicitly delegates selection. For a delegated outcome, follow [Outcome selection](#outcome-selection) before dispatch. Ask for a queue or delegation only when neither is supplied in the request or existing session.
2. For each selected issue, read its `## Depends on` section, labels, comments, and any branch or PR. Dispatch only open `ready-for-agent` issues with testable acceptance criteria and no unresolved dependency or blocking label, subject to [Stacking](#stacking). Build the order: supplied order for numbered queues, dependency order for delegated outcomes.
3. Skip, and report, any issue that is closed, labelled `ready-for-human`, or already owned by another open branch or PR. An existing branch or PR for a selected issue is resumed through [resume-issue](../resume-issue/SKILL.md) only when it has no other live owner.
4. Never query provider quota. Implementers push checkpoints often, so another agent can resume any issue from its PR if a session stops.
5. Confirm a supported worktree route: Claude host-created isolation or Codex writer-created ownership under [ADR-0071](../../../docs/adr/0071-codex-queue-models-and-owned-worktrees.md). If neither is available, see [Hosts without isolated subagents](#hosts-without-isolated-subagents).

## Outcome selection

For an explicitly delegated outcome, read [OUTCOMES.md](OUTCOMES.md#outcome-selection) before selecting or preparing issues. It owns the bounded parent record and selection authority. A numbered queue retains the founder's scope and order.

## Agent types and models

Before the first dispatch, read [DISPATCH.md](DISPATCH.md). It owns host-specific agent types, the [model profile](../../../docs/agents/queue-models.md), worktree ownership, checkpoint and hand-back rules. Re-read affected rules when the host or dispatch mode changes.

## Implementers and worktrees

Follow [dispatch ownership](DISPATCH.md#implementers-and-worktrees) and the [worktree lifecycle](../../../docs/agents/worktree-lifecycle.md#queue-implementer-worktrees) before launching a writer. The orchestrator never implements or writes in another agent's worktree.

### Limits

Apply [dispatch limits](DISPATCH.md#limits) throughout the queue; waiting issues do not need running implementers.

### Resume a stopped implementer

When a writer stops before reporting, read [RECOVERY.md](RECOVERY.md#resume-a-stopped-implementer) before resuming it. Recover pushed state and preserve uncommitted drafts in the stopped worktree.

### Hosts without isolated subagents

If neither supported isolation route is available, follow [the host fallback](RECOVERY.md#hosts-without-isolated-subagents); the founder runs one issue session at a time.

## Per-issue loop

Before dispatching the first issue, read [QUEUE-LOOP.md](QUEUE-LOOP.md#per-issue-loop). Follow its verification, one review/fix round, auto-merge, CI follow-up, dependent-unblocking and cleanup sequence for each issue. Keep durable Execution state current and return to pending PRs on meaningful changes.

## Stacking

When the next issue depends on a reviewed, unmerged PR this queue owns, read [STACKING.md](STACKING.md#stacking) before branching. It owns the one-level eligibility gate, review base, retargeting and rebase proof; wait when those conditions do not hold.

## Integration branches

When the founder groups related issues under one parent specification, read [INTEGRATION.md](INTEGRATION.md#integration-branches) before creating the shared branch. It owns issue checkpoints, the single merger, grouped review/fix round and branch retirement.

## Stop and report

Apply [stop conditions](QUEUE-LOOP.md#stop-and-report) whenever a decision, human-owned action, guard refusal or exhausted repair cap blocks an issue. Move only to independent ready work; stop when none remains.

## Final report

At queue end, follow [the final report](QUEUE-LOOP.md#final-report), including evidence, missing gates, issue/PR state and the cleanup report. Use existing durable records rather than reconstructing completion from chat history.
