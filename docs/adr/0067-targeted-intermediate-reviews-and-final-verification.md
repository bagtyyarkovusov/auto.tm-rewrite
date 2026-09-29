# ADR-0067: Target intermediate reviews and verify the final commit

- **Status**: Proposed
- **Date**: 2026-09-29
- **Deciders**: AutoTM founder
- **Amends**: ADR-0058's checkpoint and review procedure; preserves its fixed-commit Standards and Spec gate

## Context

ADR-0058 requires recoverable checkpoints and two independent reviews of the final implementation. The current UI skill adds a Spec review and a code-quality review after every implementation group, then repeats both axes on the integrated commit. Three groups require eight reviewer contexts before any findings. Root guidance also says to run repository tests and typecheck before each commit, while the execution skill asks for frequent checkpoint commits. That makes recovery commits costly and leaves the timing of final verification unclear.

ADR-0060 already made context task-scoped. Workflow instructions can follow the same principle: each phase should load its own contract rather than restating later phases.

## Decision

**Use intermediate review to resolve a named risk, and use the integrated, verified commit for the mandatory independent Standards and Spec reviews.**

- The integration owner may divide substantial UI work into non-overlapping groups. It inspects and tests each integrated group. It requests a fresh intermediate review when a group crosses a contract or ownership boundary, has an uncertain design interpretation, or has behavior that later groups would make expensive to correct. The review targets that risk; it is not a substitute for final review.
- Two fresh, read-only reviewers independently check Standards and Spec against the same fixed implementation commit. They may work concurrently. Both verdicts must pass for that commit, directly or through the existing ADR-0065 delta rule. The reviewer and implementer remain distinct contexts.
- Agents push meaningful checkpoint commits to make interrupted work recoverable. Focused checks accompany the affected change. Before final review, run the repository test and typecheck gates, affected lint and other applicable runtime, integration, build, or UI checks. Record unavailable gates as missing evidence. Any later change invalidates evidence for inputs it affects and requires proportionate re-verification and review.
- The issue and pull request keep one Execution state. Context, requirements, and specialist guides are read when the task needs them; reviewers receive the issue criteria, governing decisions, diff, and evidence rather than the implementation conversation.

## Consequences

The number of intermediate reviewer contexts depends on risk rather than file count. The complete implementation still receives both independent review axes and required CI. Recovery commits can be frequent without claiming they are merge-ready. The integration owner must identify risks explicitly and cannot treat a passed intermediate review as a final verdict.

## Alternatives considered

- **Review every UI group twice.** Rejected because the integrated commit already receives both reviews and group boundaries alone do not indicate additional risk.
- **Review only the final commit and never review a group.** Rejected because an uncertain contract or design decision can be cheaper to resolve before later work builds on it.
- **Run full repository gates at every checkpoint.** Rejected because checkpoints preserve progress; only the final reviewed state is eligible to merge.

## References

- [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)
- [ADR-0060](0060-source-first-agent-context-and-task-scoped-guidance.md)
- [ADR-0065](0065-small-changes-skip-the-issue-ceremony.md)
- [Agent workflow audit](../research/2026-09-29-agent-workflow-audit.md)
