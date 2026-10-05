# ADR-0084: Related issues of one parent may ship on one integration branch and pull request

- **Status**: Proposed
- **Date**: 2026-10-05
- **Deciders**: AutoTM founder
- **Amends**: [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)'s one-pull-request-per-issue rule, for issues the founder groups under one parent spec. ADR-0058's reservation branches, `Execution state`, fixed-commit reviews and CI gate, [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md)'s worktree rules and [ADR-0082](0082-an-issue-may-carry-up-to-three-ordered-slices.md)'s slices stay in force.

## Context

Each issue still costs a full cycle: an implementer, a Standards and a Spec review, usually a fix round, the required `pr` check and a native capture. ADR-0082 cut that cost inside one outcome by letting an issue carry up to three ordered slices. Related outcomes of one parent spec still pay it once per issue, and each PR's reviewers see only their part of the parent. The identity work of [#353](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/353) is one such parent: [#640](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/640) "Set a display name" and [#644](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/644) "Show the seller's and the chat partner's name and avatar" touch the same identity model.

Matt Pocock's `implement-spec` skill builds every ticket of one spec on one integration branch: each implementer works its own branch from it and merges its tip before reporting, a merger subagent merges the finished work, and the branch is reviewed once. [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md)'s batch PR already closes several issues of one area in one PR.

## Decision

**Issues the founder groups under one parent spec ship on one integration branch and one pull request, reviewed once. Unrelated issues keep one PR each.**

- **Integration branch.** The orchestrator creates `agent/spec-<parent>-<slug>` from `origin/main` and pushes it.
- **Issue branches.** Each issue's implementer works on `agent/issue-<N>` from the integration branch, pushes checkpoints, and opens no PR. Before it reports, it merges the integration branch's current tip into its branch, reruns its focused checks, and pushes.
- **Merger.** A merger agent merges each finished issue branch into the integration branch and opens one draft PR into `main`. Its body has a `Closes #<N>` line for every issue and one `Execution state` per issue.
- **Review.** One Standards and one Spec review of the integration PR at its head. The Spec reviewer checks every issue's acceptance criteria and every slice's. Findings, `Delta` reviews and the merge follow the normal rules for that one PR.
- **First group.** #640 and #644, under parent #353, on `agent/spec-353-identity`.

## Consequences

### Positive

- Related issues pay one review cycle, one `pr` check and one capture session.
- Reviewers see the whole parent outcome in one diff, so seams between issues are visible.

### Negative / accepted costs

- The PR is larger, and review quality falls with size. The founder's grouping is the guard.
- One failing issue holds back the others in the group until it is fixed or moved out.
- The squash merge lands the group as one commit on `main`, so a revert removes every issue in it.
- The merger agent and per-issue `Execution state` sections add orchestration work.

### Neutral

- Issue branches still serve as reservations; an issue in a group is resumed from its own branch.
- Ungrouped issues, sliced issues and the small-change path are unchanged.

## Alternatives considered

- **Keep one PR per issue.** Rejected for related issues: it pays the full cycle per issue and splits the parent's seams across reviews.
- **Stacked PRs.** Rejected, as in ADR-0082: the squash-only flow has no stack tooling and stacking removes no reviews.
- **Several issues in one worktree on one branch.** Rejected, as in ADR-0082: a stopped agent leaves work nobody can attribute to an issue.

## References

- [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md), [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md), [ADR-0069](0069-queue-implementers-run-in-host-created-worktrees.md), [ADR-0082](0082-an-issue-may-carry-up-to-three-ordered-slices.md)
- Issues [#662](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/662), [#353](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/353), [#640](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/640), [#644](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/644)
- Matt Pocock's skills: [implement-spec](https://github.com/mattpocock/skills/blob/main/skills/engineering/implement-spec/SKILL.md), [chief-of-staff](https://github.com/mattpocock/skills/blob/main/skills/in-progress/chief-of-staff/SKILL.md)
- [Skills changelog v1.3](https://www.aihero.dev/skills-changelog-v13-implement-spec-pr-retro-and-glossary-md)
