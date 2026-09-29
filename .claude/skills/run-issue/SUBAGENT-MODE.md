# Subagent implementation mode

Use this mode when substantial designed UI work can be divided into groups with distinct acceptance criteria and non-overlapping files. One screen or interaction, its supporting code, and its tests form a group. The main session remains the integration owner. A one-file correction or tightly coupled flow stays in one session.

## Divide the work

List the groups in dependency order. Put shared foundations first and reserve final integration for cross-group behavior, polish, and required current-state documentation. Give each implementer its acceptance criteria, allowed files, governing design, constraints, and focused verification commands. The implementer reports changed files, tests, and unresolved risks.

## Integrate each group

1. Record the pre-group commit. Dispatch an implementer in the issue branch for the assigned group.
2. Inspect its diff against the group criteria and design. Run focused checks before building later groups on it.
3. Request a fresh, read-only intermediate review when the group crosses a contract or ownership boundary, has uncertain design interpretation, or could make later groups expensive to correct. State the specific risk and pre/post-group commits. A reviewer checks that risk; the integration owner resolves findings before dependent work proceeds.
4. Record the group result and remaining risks in the PR's single Execution state. Do not treat an intermediate review as either final verdict.

After integration, run [Verification](VERIFICATION.md) on the full change and [Finalization](FINALIZATION.md) on one fixed commit. Final Standards and Spec reviewers remain fresh and independent, and may work concurrently. Follow [Bail and recovery](BAIL-AND-RECOVERY.md) when authority, required evidence, or a safe resolution is missing.
