# ADR-0065: Small changes skip the issue ceremony

- **Status**: Accepted
- **Date**: 2026-09-28
- **Deciders**: AutoTM founder
- **Amends**: [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)'s rule that any content change invalidates earlier review verdicts, and its requirement that every change go through an issue. ADR-0058's issue path, CI gate, squash-merge, and human-owned actions otherwise remain in force, as amended by [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md).

## Context

ADR-0058 gives every implementation issue a reservation branch, an early draft pull request, an `Execution state`, two fixed-commit reviews, and green CI. Any content change invalidates earlier verdicts. That suits a feature, but it makes small work expensive:

- A one-line fix for a review finding restarts both review axes, so agents defer it and file a follow-up issue instead. PRs #414 and #416 produced eight follow-up issues (#423–#427, #429, #430) this way on 2026-09-28, several of them a few lines each.
- Each follow-up then needs its own branch, draft pull request, `Execution state`, and two reviews, which costs more than the fix.
- Slicing can also produce issues too small to review or verify on their own.

## Decision

**Small, low-risk changes take a lighter path: fix them in the pull request that found them, or ship them without an issue; batch the rest by area; and slice issues no thinner than one verifiable outcome.**

1. **Fix in place.** When a review finding touches files the pull request already changes, is small, and needs no migration, API contract change, or product decision, fix it in the same pull request. Re-review only the new commits: one fresh read-only reviewer checks the delta against the finding and the earlier verdicts. The earlier verdicts carry forward to the new commit unless that reviewer finds the delta changes behaviour they covered.
2. **No-issue pull requests.** A change of about 50 lines or fewer, excluding tests, with no migration, API contract change, authentication or authorization change, deployment or production configuration change, or product decision, may ship without an issue. It uses a `fix/<slug>` or `chore/<slug>` branch, a pull request whose description states the problem and the fix, one fresh read-only review covering both standards and correctness, and green CI. It needs no reservation branch, no `Execution state`, and no `Closes #N`.
3. **Batch follow-ups.** Findings that cannot be fixed in place go into one issue per area, or into one pull request that closes several existing issues. A finding gets its own issue only when it needs a product or architecture decision, a human, or a change listed in rule 2's exclusions.
4. **Slice floor.** An issue created from a specification delivers at least one outcome that can be verified on its own. Pieces that cannot be reviewed or verified alone stay in one issue.

## Consequences

### Positive

- Review findings are fixed where they were found, without a new review cycle for the whole pull request.
- Small fixes merge in one short cycle.
- The issue tracker holds work that needs tracking or a decision, not every nit.

### Negative / accepted costs

- A delta-only re-review can miss an interaction between the fix and code outside the delta; the reviewer must widen the check when the fix touches shared logic.
- A no-issue pull request has no acceptance criteria, so its description has to carry the intent.
- "About 50 lines" is a judgement; when in doubt, use the issue path.

### Neutral

- Feature work, migrations, contract changes, and authentication changes keep the full ADR-0058 issue path.
- Required CI and squash-merge apply to every pull request.

## Alternatives considered

- **Keep full re-review on every change.** Rejected: it is what pushes small fixes into separate issues.
- **Let small fixes skip review entirely.** Rejected: review is cheap for agents, and small changes still break things.
- **Batch all follow-ups into a standing "misc" issue.** Rejected: unrelated changes in one pull request are harder to review and revert than one batch per area.

## References

- [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md) - portable execution and pull-request gates
- [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md) - review providers and concurrency
- [`docs/agents/coding-workflow.md`](../agents/coding-workflow.md) - workflow router
- [`.claude/skills/run-issue/FINALIZATION.md`](../../.claude/skills/run-issue/FINALIZATION.md) - fixed-commit finalization
- [`.claude/skills/create-sprint-issues/SLICING.md`](../../.claude/skills/create-sprint-issues/SLICING.md) - issue slicing
- [Google engineering practices: small CLs](https://google.github.io/eng-practices/review/developer/small-cls.html)
