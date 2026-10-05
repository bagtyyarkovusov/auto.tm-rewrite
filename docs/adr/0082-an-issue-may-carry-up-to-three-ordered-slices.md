# ADR-0082: An issue may carry up to three ordered slices

- **Status**: Accepted
- **Date**: 2026-10-05
- **Deciders**: AutoTM founder (orchestration chat, 2026-10-05)
- **Amends**: [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md)'s reviewer eligibility, for sliced issues only. Complements [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md), [ADR-0067](0067-targeted-intermediate-reviews-and-final-verification.md) and [ADR-0070](0070-test-first-behaviour-and-ui-evidence.md), which stay in force.

## Context

Until now a feature was cut into one issue per layer. The identity work of [#353](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/353) became eight issues, #638 to #645, three of them an API issue followed by the mobile issue that is its only consumer. The mobile half waits for the API half anyway, so the split bought no parallel work. Each extra issue still cost a full cycle: an implementer, two independent reviews, usually a fix round, the required `pr` check and a native capture.

The split also hid a defect. PRs [#633](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/633) and [#632](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/632) shared one P1 (resuming a draft reset Photos and the later steps). It survived two review rounds because each PR's route specs mocked `useUploadQueue`, the seam between the two.

Two other routes were considered and rejected in the chat: several issues in one worktree, and stacked PRs. Shopify's published practice ([Roast](https://shopify.engineering/introducing-roast), [their agentic harness](https://shopify.engineering/building-an-agentic-harness-that-outlasts-the-model)) points the same way as the choice below: ordered steps with saved state that a failed run resumes from, a reviewer on a different model than the author, and proof through the real stack.

## Decision

**One issue may carry up to three ordered slices. It still owns one `agent/issue-<N>` branch, one draft PR, one Execution state and one writing worktree, and it merges as one squash commit. The gate below decides whether work may be sliced into one issue or must stay separate issues.**

### The gate

1. **One user-visible outcome.** The issue title names it, such as "Set a display name". A set of outcomes, such as "all of identity", is several issues.
2. **At most three slices, each depending on the one before.** Slices that could be built in parallel stay separate issues, so the queue keeps its parallelism.
3. **A risky slice is its own issue.** Anything that changes authentication or sessions, upload ownership, a destructive or data-moving migration, the worker, or external egress is not combined with other slices.
4. **A diff budget of about 800 changed lines,** not counting tests, generated files, snapshots and lockfiles. An implementer that passes it stops at the next slice boundary, records the remaining slices in Execution state, and reports. The orchestrator or founder moves those slices to a follow-up issue.
5. **Implementer strength.** A three-slice issue goes to a Claude Opus or Codex implementer. Kimi implementers take issues of one or two slices until the founder records otherwise.

### The issue body

Each slice is a numbered section with its own acceptance criteria and one focused check, a command that passes when the slice is done. The last slice's criteria include the outcome seen end to end.

### Execution

- The implementer works the slices in order. After each slice it runs that slice's check, pushes a checkpoint commit, and ticks the slice in the PR's Execution state with the commit SHA. A later implementer resumes at the first unticked slice.
- **One proof through the real path.** At least one test or native capture exercises the outcome without a mock on the seam between slices: the real hook, the real contract, the real endpoint. A mocked seam alone does not pass Spec review.

### Review

- One Standards and one Spec review at the final head, as today. The Spec reviewer checks every slice's criteria and the real-path proof.
- **A different model reviews.** At least one of the two final reviews runs on a different model than the one that implemented the issue. Where no other model is available, the verdict comment says so and the founder or orchestrator accepts it there. Reviews of a Kimi-built sliced issue never run on Kimi.
- One native capture session covers the whole issue.

Unsliced issues, the small-change path of ADR-0065 and every other rule of the coding workflow are unchanged.

## Consequences

### Positive

- Fewer review cycles, checks and capture sessions for the same outcome.
- The API and its only consumer reach one reviewer in one diff, so a mismatch at the seam is visible.
- A stopped agent leaves a known resume point.

### Negative / accepted costs

- PRs get larger, and review quality falls with size. The slice cap, the risky-slice rule and the diff budget are the guard, and the budget's number is a first estimate to tune.
- A late slice that fails holds back the earlier, finished slices until it is fixed or moved to a follow-up issue.
- The different-model rule can wait on another provider's quota.

### Neutral

- Issues already ticketed one per layer may be folded into sliced issues by the orchestrator or stay as they are.
- [`docs/agents/coding-workflow.md`](../agents/coding-workflow.md), [`run-queue`](../../.claude/skills/run-queue/SKILL.md) and [`SLICING.md`](../../.claude/skills/create-sprint-issues/SLICING.md) carry the operating detail.

## Alternatives considered

- **Several issues in one worktree.** Rejected. It breaks the one issue, one branch, one PR, one Execution state rule; a stopped agent leaves a worktree nobody can attribute; reviewers have no single specification; and a squash merge lands the issues as one commit anyway.
- **Stacked PRs merged as a stack.** Rejected. The squash-only flow has no stack tooling (this queue already needed hand-made `-s ours` merges for two stacked PRs), and it removes no reviews.
- **Keep one issue per layer.** Rejected for the cost and the hidden seam described in Context.
- **No slice cap.** Rejected. It recreates the PRs that were hard to review.

## References

- Issue [#353](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/353) and its tickets #638 to #645
- PRs [#633](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/633) and [#632](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/632)
- [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md), [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md), [ADR-0067](0067-targeted-intermediate-reviews-and-final-verification.md), [ADR-0070](0070-test-first-behaviour-and-ui-evidence.md)
- Shopify Engineering: [Introducing Roast](https://shopify.engineering/introducing-roast), [Building an agentic harness that outlasts the model](https://shopify.engineering/building-an-agentic-harness-that-outlasts-the-model)
