---
name: run-issue
description: Runs one ready AutoTM GitHub issue end to end through portable execution state, verification, fixed-commit review, pull request, squash merge, local sync, and dependent unblocking. Use when the user invokes /run-issue with an issue number or asks Codex or Claude to execute one unblocked issue from the ready-for-agent queue.
argument-hint: "[issue-number]"
arguments:
  - issue
disable-model-invocation: true
---

# Run one issue

Execute exactly one issue. Invocation authorizes the normal reservation-branch-to-merge flow; pause only at the decision boundaries below. Codex and Claude are interchangeable implementer, reviewer, resume, and integration roles.

## Resolve the issue

1. Read `CLAUDE.md`, `GRILL-OUTCOME.md`, `docs/prd/03-roadmap.md`, [the domain glossary](../../../docs/domain/GLOSSARY.md), `CONTEXT-MAP.md`, ADR-0019, ADR-0020, ADR-0058, `docs/agents/sprint-transitions.md`, and the issue-relevant sprint, ADR, agent, and `CONTEXT.md` files. Definitions settle vocabulary, not requirements or implementation status.
2. If `$issue` is empty, list open `ready-for-agent` issues without `blocked` and ask the user to pick. Never auto-pick interactive work.
3. Fetch the chosen issue, labels, dependencies, comments, local and remote branches/worktrees, and PRs.
4. Require an open issue, `ready-for-agent`, no `blocked`, closed dependencies, and an intelligible problem plus testable acceptance criteria.
5. Accept either the rich sprint-child template or a lean issue. Derive missing file/read/test details from repository facts; stop if product intent remains ambiguous.

## Preflight and reservation

- Require a clean working tree. Report overlapping user changes and stop; never stash, discard, or absorb them.
- Follow [the worktree lifecycle](../../../docs/agents/worktree-lifecycle.md). Reuse a host-created isolated worktree and record any unchanged scaffold branch for later cleanup.
- Start from updated `main` on `agent/issue-<N>` and push that branch before editing. The remote branch is the reservation.
- If a local/remote canonical branch, issue worktree, or PR already exists, including a reservation-only branch with no checkpoint commits, route through `resume-issue <N>` and continue the existing attempt instead of creating a duplicate.
- A design pause may leave only the reservation branch. After its design PR merges, `resume-issue` verifies that the branch has no unique work and fast-forwards it to current `main` before implementation.
- Build a scoped execution plan mapping every acceptance criterion to implementation and evidence.
- Record relevant canonical terms and avoided synonyms. Do not silently migrate unrelated names.
- Consult Context7 for every external library touched, following `docs/agents/documentation-lookups.md`.
- Never query an agent provider for remaining quota before starting.

## Decision boundaries

Pause for explicit direction only when work would require:

- scope expansion beyond the acceptance criteria;
- a new architecture or product decision;
- nontrivial missing UI design;
- destructive recovery; or
- a merge conflict with multiple valid resolutions.

Do not add confirmation gates for ordinary implementation mechanics. Keep one issue and one integration owner.

## Execute

1. Read [EXECUTION-STATE.md](EXECUTION-STATE.md). Commit and push meaningful checkpoints. After the first checkpoint, open the one draft PR and keep its `Execution state` current.
2. For UI work, follow [UI-MODE.md](UI-MODE.md).
3. Select single-session or mandatory [SUBAGENT-MODE.md](SUBAGENT-MODE.md) using its auto-detect gate.
4. Implement the smallest complete vertical slice. Tests and required current-state docs are in scope even when omitted from a file list.
5. Follow [VERIFICATION.md](VERIFICATION.md). Repair an in-scope root failure at most three focused times. Update the PR after each completed or failed verification phase.
6. Follow [FINALIZATION.md](FINALIZATION.md) to pin the implementation commit, pass independent Standards and Spec review, make the PR ready, wait for required checks, squash-merge, sync, and unblock dependents.
7. Resolve valid findings in new checkpoint commits, rerun proportionate verification, and repeat each affected review axis against the new SHA.
8. On any stop or failed finalization, follow [BAIL-AND-RECOVERY.md](BAIL-AND-RECOVERY.md).

## Completion

Report the issue and PR, merged commit, evidence by acceptance criterion, tests and host-only gates, documentation changes, dependent labels changed, and any honest residual risks. Stop after this issue.
