# Subagent implementation mode

Use isolated implementer and reviewer contexts for substantial designed UI work while the main session remains the integration owner.

## Auto-detect

Subagent mode is mandatory when all three conditions hold:

1. The issue ships user-visible `mobile`, `web`, or `admin` UI.
2. A wireframe or hi-fi spec exists for at least one shipped screen/flow.
3. The implementation spans at least three distinct screens, components, hooks, or other files that form more than one logical UI unit.

Otherwise use the normal single-session flow. Never force subagents onto a one-file UI correction or work whose acceptance criteria cannot be partitioned safely.

## Decompose

Before dispatch, show an ordered checklist of logical groups. One group is a screen or interaction plus its supporting components, hooks, contracts, and tests.

- Put shared foundations needed by later groups first.
- Keep behavior and its enforcement/tests together.
- Reserve a final integration group for cross-group polish and required `CONTEXT.md` updates.
- Give every group explicit files, acceptance criteria, design sources, allowed scope, and verification commands.

## Per-group loop

For each group in order:

1. Record the pre-group commit.
2. Dispatch one fresh general-purpose **implementer subagent** in the current issue branch. It must read `CLAUDE.md`, the issue, relevant current-state docs, design specs, and external-library evidence; it may edit only the assigned group and must report files, commits, criteria evidence, tests, and concerns.
3. Dispatch a separate **spec reviewer subagent** against the pre/post-group diff. It checks the issue criteria and design artifacts only; it does not edit.
4. If the spec review finds an in-scope defect, dispatch a focused fix subagent and repeat the spec review.
5. Dispatch a fresh **code-quality reviewer subagent**. It checks repository standards, architecture boundaries, tests, accessibility, and maintainability without editing.
6. If code review finds an in-scope defect, dispatch a focused fix subagent, then repeat both reviews.
7. Advance only when both reviewers pass or explicitly report no blocking finding.

The main session verifies every diff, owns shared state, prevents overlapping dispatches, and never lets a subagent invent product behavior or modify locked documents.

## Integration and bail

After all groups, the main session runs the complete [verification gate](VERIFICATION.md) across every touched workspace before [finalization](FINALIZATION.md).

Apply [the bail contract](BAIL-AND-RECOVERY.md) when:

- the same group reports `BLOCKED` twice;
- a reviewer exposes scope expansion or an unresolved product/architecture decision;
- an out-of-scope change cannot be cleanly reverted without risking user work;
- a critical issue survives two review/fix cycles; or
- the repository-wide verification reaches the normal three-attempt cap.
