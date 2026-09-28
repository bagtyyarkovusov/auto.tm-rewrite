# ADR-0064: Any supported client may review either axis, and issues have no concurrency limit

- **Status**: Accepted
- **Date**: 2026-09-28
- **Deciders**: AutoTM founder
- **Supersedes**: [ADR-0062](0062-the-human-in-the-loop-may-assign-both-review-axes-to-kimi-per-pull-request.md) in full; the high-risk review-provider rule in [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md) and [ADR-0059](0059-kimi-code-as-a-third-interactive-coding-agent.md); and ADR-0058's limit of two issues in flight during its pilot. The rest of ADR-0058 and ADR-0059 remains in force.

## Context

ADR-0058 requires one Codex review and one Claude Code review across the Standards and Spec axes for authentication, authorization, database migrations, deployment workflows, production configuration, credential handling, destructive operations, and agent-workflow changes. ADR-0059 narrowed that to an OpenAI-backed Codex desktop review and an Anthropic-backed Claude Code desktop review, so the Kimi-backed `claude-kimi` CLI could not fill either slot. ADR-0062 then let the founder assign both axes to Kimi one pull request at a time. ADR-0058 also caps its pilot at two implementation issues in flight.

In practice the provider rule holds finished work waiting for one specific client's capacity. On 2026-09-28 the founder waived it by hand for PR #357, PR #414 and PR #416. Each waiver needed its own durable record, and the work sat idle until the founder answered. The two-issue cap blocks parallel work across the three available clients for the same reason. Each review already runs in a fresh read-only context pinned to a fixed commit, and that independence from the implementer is what the review gate relies on.

## Decision

**Codex desktop, Claude Code desktop, and the `claude-kimi` CLI may each perform either review axis, or both, on any pull request, including high-risk changes. There is no limit on how many implementation issues are in flight.**

- Every pull request still needs a Standards verdict and a Spec verdict on its current fixed commit. Each comes from a fresh, read-only context that did not implement that commit. The same client and model provider may supply both.
- There is no provider-diversity requirement and no per-pull-request waiver. High-risk changes follow the same review rule as ordinary ones.
- Each verdict still records its actual `Provider` (`OpenAI`, `Anthropic`, or `Kimi`) and `Client` (`Codex desktop`, `Claude Code desktop`, or `claude-kimi (Claude Code CLI)`), so the record shows who reviewed.
- Any number of issues may be in flight at once. Each still has exactly one `agent/issue-<N>` branch, worktree, draft pull request, and integration owner, and an existing reservation is resumed rather than duplicated.
- Required checks, `Closes #N` closure, squash-merge, and the human-owned actions in ADR-0058 are unchanged. Sandcastle dispatch stays suspended until issue #406 merges.

## Consequences

### Positive

- A pull request can proceed as soon as any available client finishes its reviews.
- The three clients can work on several issues in parallel.
- Review records no longer carry per-pull-request exceptions.

### Negative / accepted costs

- High-risk changes lose the guaranteed second model provider. Blind spots shared by one provider can pass both axes.
- More issues in flight means more merge conflicts with `main` and more stale review verdicts to repeat after a rebase or merge.
- The founder watches parallel work through the pull-request records, not through a fixed cap.

### Neutral

- The two review axes, fixed-commit pinning, reviewer independence from the implementer, and provider and client attribution do not change.
- The founder may still ask for a particular client or a second-provider review on a specific pull request.

## Alternatives considered

- **Keep the cross-provider rule and waive it per pull request.** Rejected: that is the current practice, and it stalls finished work waiting for a waiver or for capacity.
- **Keep the rule only for authentication and migrations.** Rejected: those are exactly the pull requests that were waiting, so the delay would remain.
- **Raise the in-flight limit instead of removing it.** Rejected: any fixed number stops parallel work across the three clients for no gain the pull-request record does not already give.

## References

- [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md) - portable execution and fixed-commit review gates
- [ADR-0059](0059-kimi-code-as-a-third-interactive-coding-agent.md) - Kimi Code as a third interactive coding agent
- [ADR-0062](0062-the-human-in-the-loop-may-assign-both-review-axes-to-kimi-per-pull-request.md) - per-PR Kimi review exception, superseded here
- [`docs/agents/coding-workflow.md`](../agents/coding-workflow.md) - review contract
- [`.claude/skills/run-issue/FINALIZATION.md`](../../.claude/skills/run-issue/FINALIZATION.md) - fixed-commit finalization
- PR #357, PR #414, PR #416 - founder waivers recorded on 2026-09-28
