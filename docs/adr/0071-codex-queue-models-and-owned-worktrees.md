# ADR-0071: Codex queue models and owned worktrees

- **Status**: Accepted
- **Date**: 2026-09-30
- **Deciders**: AutoTM founder
- **Amends**: [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md)'s model and host-created-worktree requirements for Codex only

## Context

On 2026-09-30 the founder approved a permanent Codex orchestration profile, recorded in issue #456. Codex writing agents create and own separate linked worktrees. Claude's existing host-created isolation and Sonnet/Opus roles remain appropriate for that host.

## Decision

Codex implementers, bug fixers, review-finding fixers, and other writing subagents use `gpt-6.1-sol` with `medium` reasoning effort. Standards, Spec, and Delta reviewers use `gpt-6.1-sol` with `high` reasoning effort. Reviewers are fresh, independent, read-only, and pinned to one commit; the coordinator posts their attributed verdicts.

Each Codex writing subagent creates and owns its own fresh separate linked worktree from the supplied base or pushed issue branch. All its edits and commands target that absolute worktree directory. The coordinator does not implement issue code, create worktrees for writers, or write in their worktrees. One issue has at most one writer. A refused write stops work and is reported exactly; this exception authorizes no guard bypass.

The queue runs about two writing agents at a time. An agent reports once and stops; the coordinator wakes it only for new work. Canonical reservation branches, early draft PRs, pushed checkpoints, durable Execution state, independent reviews, and protected merges remain required.

The host-specific model profile lives in [queue models](../agents/queue-models.md). Claude's model defaults and host-created worktrees remain unchanged. Worktree retention and cleanup continue to follow the lifecycle's safety gate. Dirty, locked, active, unmerged, evidence, and app-managed Codex worktrees are preserved. This decision grants no blanket cleanup authorization.

## Consequences

### Positive

- Codex can execute the queue with separate owned worktrees while the coordinator retains ordering and review responsibility.
- Writing and review roles have explicit model and effort choices for future sessions.

### Negative / accepted costs

- Each writer must create its worktree and install its own dependencies.
- Worktree ownership is enforced by task scope and explicit absolute directories; agents must still stop on a host refusal.

### Neutral

- ADR-0069 remains immutable and governs hosts outside this Codex exception.
- No global configuration, application behaviour, or CI changes are introduced.
- Test-first adoption remains the separate Proposed ADR-0070.

## Alternatives considered

- **Fall back to founder-started sessions for every Codex queue item.** Superseded for Codex by the explicitly approved owned-worktree exception.
- **Share the coordinator's checkout among writers.** Rejected because ownership and issue isolation would be lost.
- **Change Claude defaults too.** Outside the founder's approved scope.

## References

- [Founder approval on #456](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/456)
- [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md)
- [Worktree lifecycle](../agents/worktree-lifecycle.md)
