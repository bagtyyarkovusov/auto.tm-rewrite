---
name: run-issue
description: Runs one ready AutoTM GitHub issue end to end through implementation, verification, pull request, squash merge, local sync, and dependent unblocking. Use when the user invokes /run-issue with an issue number or asks to execute one unblocked issue from the ready-for-agent queue.
argument-hint: "[issue-number]"
arguments:
  - issue
disable-model-invocation: true
---

# Run one issue

Execute exactly one issue. Invocation authorizes the normal branch-to-merge flow; pause only at the decision boundaries below.

## Resolve the issue

1. Read `CLAUDE.md`, `GRILL-OUTCOME.md`, `docs/prd/03-roadmap.md`, `CONTEXT-MAP.md`, ADR-0019, ADR-0020, and the issue-relevant sprint, ADR, agent, and `CONTEXT.md` files.
2. If `$issue` is empty, list open `ready-for-agent` issues without `blocked` and ask the user to pick. Never auto-pick.
3. Fetch the chosen issue, labels, dependencies, comments, branches, and PRs.
4. Require an open issue, `ready-for-agent`, no `blocked`, closed dependencies, and an intelligible problem plus testable acceptance criteria.
5. Accept either the rich sprint-child template or a lean issue. Derive missing file/read/test details from repository facts; stop if product intent remains ambiguous.

## Preflight

- Require a clean working tree. Report user changes and stop; never stash, discard, or absorb them.
- Start from updated `main` on `agent/issue-<N>`.
- Reuse a clean zero-ahead branch preserved by a design pause.
- If a branch is modified/ahead, exists only remotely, or has an open PR, route to `/resume-issue <N>` instead of overwriting or duplicating it.
- Build a scoped execution plan mapping every acceptance criterion to implementation and evidence.
- Consult Context7 for every external library touched, following `docs/agents/documentation-lookups.md`.

## Decision boundaries

Pause for explicit direction only when work would require:

- scope expansion beyond the acceptance criteria;
- a new architecture or product decision;
- nontrivial missing UI design;
- destructive recovery; or
- a merge conflict with multiple valid resolutions.

Do not add confirmation gates for ordinary implementation mechanics. You may group work and use subagents when useful, but keep one issue and one integration owner.

## Execute

1. For UI work, follow [UI-MODE.md](UI-MODE.md).
2. Select single-session or mandatory [SUBAGENT-MODE.md](SUBAGENT-MODE.md) using its auto-detect gate.
3. Implement the smallest complete vertical slice. Tests and required current-state docs are in scope even when omitted from a file list.
4. Follow [VERIFICATION.md](VERIFICATION.md). Repair an in-scope root failure at most three focused times.
5. Follow [FINALIZATION.md](FINALIZATION.md) to stage exact paths, create and pin the implementation commit, pass independent Standards and Spec review, then push, open the PR, check, squash-merge, sync, and unblock dependents.
6. Resolve valid review findings in new commits, rerun proportionate verification, pin the new SHA, and repeat each affected review axis before delivery continues.
7. On any stop or failed finalization, follow [BAIL-AND-RECOVERY.md](BAIL-AND-RECOVERY.md).

## Completion

Report the issue and PR, merged commit, evidence by acceptance criterion, tests and host-only gates, documentation changes, dependent labels changed, and any honest residual risks. Stop after this issue.
