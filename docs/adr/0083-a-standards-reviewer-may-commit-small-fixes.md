# ADR-0083: A Standards reviewer may commit small fixes (trial)

- **Status**: Accepted
- **Date**: 2026-10-05
- **Deciders**: AutoTM founder
- **Amends**: [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)'s rule that every reviewer is read-only, [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md)'s restatement that each verdict comes from a "fresh, read-only context", and [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md)'s Reviewers and Models rules that a Standards reviewer is read-only, does not check the commit out, never edits, commits, or pushes, and runs as `queue-reviewer`, for the Standards axis and the fixes below only, during the trial. [ADR-0071](0071-codex-queue-models-and-owned-worktrees.md)'s rule that Codex reviewers are read-only is not amended, because the trial runs on Claude Code hosts only. [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md)'s fix-in-place limits and `Delta` review, and [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md)'s one-writer and worktree rules, stay in force and bound this decision.

## Context

ADR-0058 makes each reviewer a fresh read-only context. It rejected Sandcastle's editable reviewer because that reviewer "mixes implementation and review ownership": the agent that wrote the fix also judged it, and nobody independent looked again.

Small accepted findings are expensive under that rule. On [PR #659](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/659) the orchestrator accepted four findings (Spec 1 and 3, Standards 3 and 4), each a few lines. Fixing them took a whole fresh implementer, which re-read the issue and PR from scratch, and then a `Delta` review. The reviewer that found them already held the context to fix them.

The same PR shows the limit. The Spec reviewer overruled Standards finding 5, and the orchestrator rejected it. A Standards reviewer that had committed that fix would have changed behaviour the Spec axis covered. So only small, in-scope Standards fixes are committed, and Spec stays read-only.

Matt Pocock argues the opposite default on the AI Engineer podcast: "The reviewer should commit. It should make fixes." His v1.3 `implement-spec` skill still ends with a review and one fixer agent, which is the cost this trial measures against.

## Decision

**During the trial, the Standards reviewer may commit fixes for its own findings when each fix is within ADR-0065's fix-in-place limits and changes no behaviour an acceptance criterion covers. A fresh `Delta` reviewer then reviews those commits.**

- **Scope.** Only the Standards axis commits, and only on Claude Code hosts; on Codex the Standards reviewer stays read-only. Spec and `Delta` stay read-only. A finding qualifies when its fix is about 50 lines or fewer, stays in the PR's scope, needs no migration, contract change or product decision, and changes no behaviour an acceptance criterion covers. Every other finding stays a comment.
- **One writer.** The orchestrator launches the committing reviewer only after the implementer has stopped and with auto-merge off. The reviewer works in its own host-created worktree, detached at the pinned SHA, and pushes fast-forward with `git push origin HEAD:<branch>`. If the branch head has moved past the pinned SHA, it pushes nothing and reports.
- **Commits.** One commit per finding, on top of the pinned SHA. The reviewer runs the focused checks for the touched files before each push.
- **Verdict.** The Standards verdict names the pinned SHA and lists each finding as `fixed in <sha>` or `left as finding`.
- **Independence.** A fresh read-only `Delta` reviewer checks the reviewer's commits against their findings and carries both verdicts forward, as ADR-0065 describes. That `Delta` review replaces a full Standards re-review of the reviewer's commits: the commits alone do not void the Standards verdict, and ADR-0065's full re-review applies only to an axis the `Delta` reviewer finds no longer holds. The author of a fix never passes it.
- **Rejected commit.** When the `Delta` reviewer rejects a reviewer's commit, a fresh implementer reverts or repairs that commit on the PR branch, and the `Delta` review reruns on the new head.
- **Trial.** The next five queue PRs. An integration PR ([ADR-0084](0084-related-issues-of-one-parent-may-ship-on-one-integration-branch.md)) counts as one of the five. For each, the orchestrator records in the PR's `Execution state` the time from Standards verdict to `Delta` pass, the tokens the fix round used, the `Delta` findings against reviewer commits, and any revert. A later ADR records whether the founder keeps, changes or ends the rule after the trial.

## Consequences

### Positive

- Small findings are fixed by the agent that already holds their context, with no fresh implementer.
- The `Delta` review keeps an independent check on every committed fix.

### Negative / accepted costs

- The Standards reviewer becomes a writer for part of the round, so ADR-0069's one-writer rule depends on the orchestrator's launch order.
- A reviewer that can commit may favour findings it can fix; the `left as finding` list and the `Delta` review make that visible.
- Five PRs is a small sample.

### Neutral

- Spec review, the read-only `Delta` review and the full re-review of an axis whose verdict no longer holds are unchanged.
- Findings outside the limits still go to a fresh implementer.

## Alternatives considered

- **Keep every reviewer read-only.** Rejected for the trial: PR #659's four small fixes cost a whole implementer round.
- **Let both axes commit.** Rejected: Spec judges whether the PR meets its criteria, and PR #659 shows Spec overruling a Standards finding. A Spec reviewer that edits behaviour would review its own change.
- **Let the committing reviewer pass its own fixes.** Rejected: that is the Sandcastle model ADR-0058 rejected.

## References

- [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md), [ADR-0064](0064-any-supported-client-may-review-either-axis-and-issues-have-no-concurrency-limit.md), [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md), [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md), [ADR-0071](0071-codex-queue-models-and-owned-worktrees.md)
- Issue [#662](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/662); [PR #659](https://github.com/bagtyyarkovusov/auto.tm-rewrite/pull/659)
- Matt Pocock's skills: [implement-spec](https://github.com/mattpocock/skills/blob/main/skills/engineering/implement-spec/SKILL.md), [chief-of-staff](https://github.com/mattpocock/skills/blob/main/skills/in-progress/chief-of-staff/SKILL.md), [pr](https://github.com/mattpocock/skills/blob/main/skills/engineering/pr/SKILL.md)
- [Skills changelog v1.3](https://www.aihero.dev/skills-changelog-v13-implement-spec-pr-retro-and-glossary-md)
- [Matt Pocock on the AI Engineer podcast](https://finance.biggo.com/news/4884c941b185405c)
