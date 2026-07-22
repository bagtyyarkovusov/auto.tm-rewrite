---
name: sprint-status
description: Produces a read-only AutoTM sprint dashboard with issue progress, pull requests, unblocked work, documentation drift signals, and a suggested next action. Use when the user asks for sprint status, the ready queue, current blockers, open sprint PRs, or what to do next.
argument-hint: "[sprint-number]"
arguments:
  - sprint
---

# Sprint status

This skill is strictly read-only. Do not edit files, labels, issues, PRs, branches, or roadmap state.

## Resolve scope

1. Read `docs/prd/03-roadmap.md`, ADR-0019, ADR-0020, `docs/agents/issue-tracker.md`, and the applicable sprint file/retro.
2. If `$sprint` is supplied, report that sprint without changing the roadmap's current pointer.
3. Otherwise use the roadmap current-sprint block.
4. “No shaped sprint” is valid: show the pending betting-table state, omit issue/DoD rollups, and suggest shaping the documented next bet. Never infer or create S11.

## Gather bounded evidence

When a sprint exists, query:

- its parent and all child issues, open and closed;
- labels and open dependencies;
- open PRs against `main` plus recently merged sprint PRs;
- relevant `agent/issue-*` and `sandcastle/issue-*` branch signals;
- sprint DoD versus issue/PR evidence; and
- roadmap, retro, ADR, `CONTEXT.md`, and `CONTEXT-MAP.md` consistency.

Avoid a repository-wide forensic audit. Fetch full bodies only when needed to determine dependencies or acceptance state.

## Classification

- **Closed:** issue closed with merged evidence.
- **In flight:** branch or open PR exists.
- **Blocked:** `blocked` label or an open `## Depends on` issue.
- **Unblocked:** open, ready label, no open dependencies, no active branch/PR.
- **Bookkeeping drift:** labels/body/roadmap disagree with observed state.
- **Unknown:** evidence is ambiguous or not structurally available. Never convert unknown to pass.

Doc checks are signals, not repairs. ADR-0019 means current-state docs should match code; ADR-0020 defines which documents may still change. Report suspected drift with paths and evidence.

## Output

Print compact conditional sections:

1. **Current sprint** — number/name/status/phase/milestone/plan.
2. **Progress** — closed, in flight, blocked, unblocked, total, and percentage when meaningful.
3. **Open PRs** — state/checks/review attention.
4. **Unblocked queue** — next five ordered by dependency and issue number.
5. **Flags** — partial runs, stale branches, label/body disagreements, host-only gates.
6. **Drift check** — roadmap, sprint/retro, ADR, `CONTEXT.md`, and map results as pass/finding/unknown.
7. **Suggested next action** — one evidence-based action, never an automatic mutation.

If a requested sprint cannot be resolved, report what is missing and stop without side effects.
