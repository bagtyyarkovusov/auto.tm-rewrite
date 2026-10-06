# ADR-0085: One review round, one fix round, no re-review

- **Status**: Accepted
- **Date**: 2026-10-07
- **Deciders**: AutoTM founder
- **Supersedes**: [ADR-0083](0083-a-standards-reviewer-may-commit-small-fixes.md), whose trial ends.
- **Amends**: [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)'s rule that any content change invalidates the affected verdict and that both axes pass on the latest commit; [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md)'s restatement of it; [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md)'s `Delta` review and full re-review after a fix; [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md)'s and [ADR-0084](0084-related-issues-of-one-parent-may-ship-on-one-integration-branch.md)'s fix-round steps that end in a `Delta` review. Reviewer eligibility (ADR-0064), provider attribution ([ADR-0059](0059-kimi-code-as-a-third-interactive-coding-agent.md)), test-first evidence ([ADR-0070](0070-test-first-behaviour-and-ui-evidence.md)) and ADR-0065's no-issue small change stay in force.

## Context

A fix after review needed a `Delta` review, and a larger fix a full re-review of both axes. On 2026-10-07 that rule ran seven reviews across [PR #704](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/704) and [PR #708](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/708), about 750,000 tokens. The re-review rounds were about 300,000 of them and found no defect in the fix commits; each one re-read the same code and returned a new list of advisories. Every finding that changed code came from a reviewer seeing the diff for the first time.

Matt Pocock's `implement-spec` skill ends with one `code-review` and one fix: "call the Skill tool with `code-review` on the integration branch. Fix all issues raised by the code review in a single implementer subagent", then mark the PR ready. His `code-review` runs Standards and Spec as two parallel sub-agents, each report under 400 words. His `pr` skill writes the body as Summary, Evidence and Merge Danger. The founder decided AutoTM follows the same principle.

## Decision

**A pull request gets one review round and one fix round. Nothing re-reviews the fixes. The orchestrator merges from the PR body.**

- **Review.** One Standards and one Spec reviewer, fresh, read-only, in parallel, pinned to the final verified commit. Each returns a report under 400 words: blocking findings first, each with file and line. The orchestrator posts both in one PR comment with their provider and client.
- **Fix.** The orchestrator accepts or rejects each finding and records why. One implementer fixes every accepted finding in one round; an orchestrator that wrote the PR fixes them itself. A finding that needs a product or architecture decision goes to the founder. Non-blocking findings may be deferred to the area's follow-up batch.
- **No re-review.** No `Delta` review and no second Standards or Spec review follow the fix round. A fix does not void the verdicts. The orchestrator reads the fix diff, confirms it stays within the findings, reruns the affected local gates, and waits for the hosted `pr` check on the new head.
- **Reviewers do not commit.** The ADR-0083 trial ends and the `queue-review-fixer` agent is removed.
- **Merge.** The orchestrator records each finding in the PR body as `fixed in <sha>`, `deferred to <issue>` or `rejected: <reason>`, marks the PR ready, and sets auto-merge. The required `pr` check and branch protection are unchanged.
- **PR body.** `Closes #<N>`, the `Execution state`, then `Summary`, `Evidence` and `Merge danger`. Acceptance criteria and test runs sit under `Evidence`.
- **Second look on request.** The founder may ask for another review of any pull request. No rule triggers one.
- **Stacked and rebased PRs.** A clean rebase needs no review; the orchestrator confirms with `git range-diff` that the PR's own diff is unchanged and records it.
- **Pull requests already in review** finish under this rule from their current state.

## Consequences

### Positive

- A pull request costs two short reviews and at most one fix round.
- The PR body is the one record the orchestrator merges from.

### Negative / accepted costs

- Nobody independent reads the fix round. A wrong fix is caught only by the orchestrator's read, the tests and the `pr` check.
- A 400-word report drops low-value advisories, and sometimes a useful one.

### Neutral

- The failing-test-first rule, the fixed review commit, reviewer eligibility and attribution, and human ownership of production steps are unchanged.

## Alternatives considered

- **Keep `Delta` and full re-reviews.** Rejected: the cost above, with no defect found in a fix.
- **One reviewer for both axes that also commits its fixes.** Rejected: the founder chose the `implement-spec` shape, where the two axes stay separate so one cannot mask the other, and the reviewers stay read-only.
- **Keep a second look for sign-in, migrations and guards.** Not adopted: the founder chose the same rule for every pull request and may ask for a second look case by case.

## References

- Issue [#709](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/709); [PR #704](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/704), [PR #708](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/708)
- Matt Pocock's skills: [implement-spec](https://github.com/mattpocock/skills/blob/main/skills/engineering/implement-spec/SKILL.md), [code-review](https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md), [pr](https://github.com/mattpocock/skills/blob/main/skills/engineering/pr/SKILL.md)
