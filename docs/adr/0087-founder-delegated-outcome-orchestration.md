# ADR-0087: Founder-delegated outcome orchestration

- **Status**: Accepted
- **Date**: 2026-10-07
- **Deciders**: AutoTM founder
- **Amends**: [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md) and [ADR-0066](0066-retire-sandcastle-queue-agents-replace-unattended-dispatch.md) for queue selection when the founder explicitly delegates an outcome.

## Context

The queue skill requires the founder to supply issue numbers and forbids the orchestrator from adding issues. On 2026-10-07 the founder instead explicitly delegated orchestration until the first Android release is ready, including necessary documentation and workflow changes. Requiring a new numbered queue for every discovered prerequisite prevents that delegation from working.

## Decision

An explicit founder-delegated outcome is an alternative to a founder-numbered queue. The coordinator owns the strategic scope and selects, orders and files only issues necessary to achieve that outcome; subagents own tactical implementation in isolated, writer-owned worktrees.

Before dispatch, the coordinator records the founder's authorization, bounded outcome, completion evidence, exclusions, selected issues and dependency order on a parent issue. Each selection states why it is necessary to the outcome. It keeps that record current as evidence changes and records human-owned or blocked steps separately. A numbered queue retains its supplied scope and order unless the founder delegates selection explicitly.

Selection does not make an issue ready. Every implementation issue still needs testable acceptance criteria, `ready-for-agent` eligibility, resolved dependencies and no competing live owner. Existing work resumes through the recovery workflow. Issue branches, pushed reservations, early draft PRs, durable Execution state, test-first evidence, verification and protected merge gates remain unchanged. Integration branches still require the founder's grouping decision.

Product or architecture ambiguity and scope expansion return to the founder. Production promotion, rollback, live-data migration, credential or domain changes, paid resources, store submission and destructive or ambiguous recovery remain human-owned. Delegation authorizes ordinary in-scope issue preparation and execution, not these operations.

The coordinator follows [ADR-0085](0085-one-review-round-one-fix-round-no-re-review.md): one independent Standards and Spec round, one fix round, no re-review, and a green required `pr` check before merge. A delegated outcome is complete only when its recorded completion evidence passes; otherwise the coordinator reports the exact missing evidence or required human action.

## Consequences

### Positive

- The coordinator can resolve necessary prerequisites without repeatedly asking the founder to enumerate issues.
- A parent issue exposes selection, dependencies and evidence to the founder and future sessions.

### Negative / accepted costs

- The coordinator can select the wrong prerequisite. A bounded outcome and a visible reason per issue make that choice reviewable.
- Human operations or missing evidence can prevent completion even after all selected code merges.

### Neutral

- The host's existing queue model, concurrency and worktree lifecycle still apply.
- This decision changes selection authority, not automation schedules or release scope by itself.

## Alternatives considered

- **Require issue numbers for every goal.** Rejected because the founder explicitly delegates prerequisite selection.
- **Allow unrestricted backlog selection.** Rejected because an outcome authorizes only necessary work within its recorded scope.

## References

- [Issue #715](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/715), recording the founder's October 7 authorization.
- [Queue workflow](../../.claude/skills/run-queue/SKILL.md)
- [Coding workflow](../agents/coding-workflow.md)
- [ADR-0070](0070-test-first-behaviour-and-ui-evidence.md), acceptance evidence.
- [ADR-0071](0071-codex-queue-models-and-owned-worktrees.md), owned worktrees and host profiles.
