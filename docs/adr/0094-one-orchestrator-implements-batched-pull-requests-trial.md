# ADR-0094: One orchestrator session implements batched pull requests (trial)

- **Status**: Accepted
- **Date**: 2026-10-10
- **Deciders**: AutoTM founder, in a grilling session with the Claude Code desktop orchestrator on 2026-10-10 ([issue #804](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/804))
- **Amends**, for work run through the [`run-batch`](../../.claude/skills/run-batch/SKILL.md) skill during the trial only:
  - [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md) and [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md): one `agent/issue-<N>` branch and draft PR per issue, and read-only reviewers.
  - [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md): the orchestrator never implements, and implementers run in their own worktrees.
  - [ADR-0084](0084-related-issues-of-one-parent-may-ship-on-one-integration-branch.md): only issues the founder groups under one parent share a pull request.
  - [ADR-0085](0085-one-review-round-one-fix-round-no-re-review.md): separate Standards and Spec reviewers, reviewers do not commit, and one implementer fixes the accepted findings.
  - [ADR-0091](0091-docs-lane-after-a-green-pull-request-head.md)'s workflow rule (in the coding workflow) to push documentation separately after a green code head.
  - The [AGENTS.md](../../AGENTS.md) rule against querying provider quota, for measurement reads only.

  run-queue, run-issue, the small-change path and every other rule stay in force.

## Context

Every issue under [run-queue](../../.claude/skills/run-queue/SKILL.md) starts a fresh `queue-implementer` and two fresh reviewers. Each one reloads AGENTS.md, the skills, the issue, the specification and the code. That input is billed in full. A long-running session pays far less for context it has already read: Claude's prompt cache bills a cache read at 0.1 times the base input price, a 5-minute cache write at 1.25 times and a 1-hour write at 2 times ([prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). On 2026-10-10 the orchestrator session's own transcript showed about 1.17 million cache-read tokens against 189,000 cache-write tokens. The founder also finds that Claude Code desktop works better with more context in hand.

The cheaper route has limits:

- Every turn rereads the whole context. A long session saves only while its context stays lean.
- A cache entry lives 5 minutes by default. A session that idles longer writes its full context again at the write price.
- When the context fills, compaction summarizes it, loses detail and drops the cache. Durable state must live in git and the pull request, never in chat alone.
- An author reviewing its own work shares its blind spots. Under ADR-0085 every finding that changed code came from a reviewer reading the diff for the first time.

Repository facts that bound the shape: `main` allows only squash merges, so one pull request lands as one commit and one revert. `main` auto-deploys to staging ([ADR-0039](0039-phased-cloud-first-hosting.md)), while production is promoted by hand. The median of the last 30 merged pull requests was 258 changed lines and the largest 3,356. A docs-only `pr` check took 47 to 59 seconds on the last five docs pull requests; a full run took about 9.5 minutes. Branch protection applies to administrators.

ADR-0085 recorded the baseline: seven reviews across [PR #704](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/704) and [PR #708](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/708) used about 750,000 tokens.

## Decision

**For three batches, one Claude Code desktop orchestrator session implements several issues itself on one batch branch and pull request. One fresh reviewer reviews each batch on both axes and may commit small fixes. The founder then keeps, changes or ends the rule from measured results.**

- **Scope.** Any issue may join a batch, including features and migrations. Each item still has an issue, except a small change that qualifies for [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md)'s no-issue path, which the batch lists in its PR body.
- **Implementer.** The orchestrator session writes the code in its own worktree, with test-first evidence ([ADR-0070](0070-test-first-behaviour-and-ui-evidence.md)) and the usual verification gates. Each issue gets its own commits, and each commit message names its issue. A subagent is used only for heavy, isolated exploration or for truly independent parallel work, where a cold start costs less than bloating the session.
- **Batch branch and PR.** `agent/batch-<n>-<slug>` from `origin/main`, pushed before editing. After the first checkpoint the orchestrator opens one draft PR with a `Closes #<N>` line per issue and one `Execution state` that holds a row per issue. It comments the PR link on each issue so other agents see the owner.
- **Size and risk.** A batch stays near 800 to 1,000 changed lines, excluding tests. A migration, an authentication or authorization change, or a published API contract change goes in its own PR, so it can be reverted alone. Each batch merges when it is green; nothing waits for a release train.
- **Review.** One fresh `batch-reviewer` agent, pinned to the final verified commit, reviews Standards and Spec in one context. It may commit a fix for its own finding when the fix is about 50 lines or fewer, stays in scope, and needs no migration, contract change or product decision, with one commit per finding and focused checks before it pushes. It pushes only while the branch head still equals the pinned commit. Larger findings come back to the orchestrator. Its report stays under 400 words and marks each finding `fixed in <sha>` or `left as finding`. No `Delta` review follows.
- **Merge.** The orchestrator reads the reviewer's fix diff, confirms it stays within the findings, reruns the affected local gates, records each finding in `Execution state`, marks the PR ready and sets auto-merge. The required `pr` check and branch protection are unchanged.
- **Documentation.** Docs ride in the batch and go up in the same push as code, after local lint, glossary and doc checks. The required `pr` check still runs.
- **Measurement.** At batch start and at merge the orchestrator records plan usage (5-hour and weekly percentages) and the tokens used by itself and by the reviewer, taken from the session transcripts and de-duplicated by message ID. Both go in the batch's `Execution state`. These reads measure; they never decide whether to start work.
- **Session lifecycle.** The orchestrator writes a handoff to the PR and hands off when the 5-hour plan limit reaches 95 percent. It suggests `/compact` at a batch boundary, or when earlier context has stopped being useful, and warns before auto-compaction. Long command output goes to files and is read with `tail` or `grep`.
- **Other agents.** While a batch is open, other sessions work only in areas it does not touch.
- **Evaluation.** After three batches the orchestrator compares tokens per merged issue with the ADR-0085 baseline and lists escaped defects: bugs found after merge in code a batch touched. A later ADR records whether the founder keeps, changes or ends the rule.

## Consequences

### Positive

- Context is loaded once per session instead of once per agent, and later reads are billed at the cache price.
- A batch pays one review, one `pr` run per push and one Railway PR environment, where run-queue pays one each per issue.
- The reviewer that found a small defect fixes it with the context it already holds.

### Negative / accepted costs

- Nobody independent reads the reviewer's fix commits; the orchestrator's read, the tests and the `pr` check are the guard. ADR-0085 kept the reviewers read-only and the axes in separate contexts so one could not mask the other; this trial accepts that risk.
- A squash merge lands a batch as one commit, and a revert removes every issue in it. The size cap bounds that.
- A long session can lose its cache to idle gaps and its detail to compaction. Checkpoints, the PR's `Execution state` and the handoff carry the state instead.
- One failing issue holds its batch until it is fixed or moved out.
- Larger diffs lower review quality; the size cap and the risk split are the guard.

### Neutral

- run-queue, run-issue, integration branches and the small-change path are unchanged and remain available.
- Ending the trial means deleting the `run-batch` skill, the `batch-reviewer` agent and their pointers.

## Alternatives considered

- **One pull request per release train.** Rejected: one squash revert would remove everything, review quality falls with size, and backend fixes would wait to reach staging.
- **Keep cold implementer subagents per issue.** Rejected for this trial: each pays full price to reload context this session already holds.
- **Self-review in the orchestrator session.** Rejected: an author shares its own blind spots, and independent first reads found every code-changing finding under ADR-0085.
- **ADR-0085's two read-only reviewers.** Not adopted: the founder chose one reviewer that reads the code once and fixes small findings itself.
- **Merge docs-only changes without the `pr` check.** Rejected: the docs lane already takes under a minute, and skipping it would mean weakening protection on `main`.

## References

- [Issue #804](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/804)
- [ADR-0039](0039-phased-cloud-first-hosting.md), [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md), [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md), [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md), [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md), [ADR-0070](0070-test-first-behaviour-and-ui-evidence.md), [ADR-0083](0083-a-standards-reviewer-may-commit-small-fixes.md), [ADR-0084](0084-related-issues-of-one-parent-may-ship-on-one-integration-branch.md), [ADR-0085](0085-one-review-round-one-fix-round-no-re-review.md), [ADR-0091](0091-docs-lane-after-a-green-pull-request-head.md)
- [run-batch skill](../../.claude/skills/run-batch/SKILL.md), [batch-reviewer agent](../../.claude/agents/batch-reviewer.md)
- [Claude prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) and [pricing](https://platform.claude.com/docs/en/about-claude/pricing)
