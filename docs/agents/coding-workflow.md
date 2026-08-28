# AutoTM coding workflow

This is the repository router for moving an idea from shaping to shipped code. It maps generic coding-workflow concepts onto AutoTM's governed documents and repository skills; it does not add a second skill layer.

## Phase map

| Phase | AutoTM entry point | Durable output | Boundary |
|---|---|---|---|
| Shaping | [`shape-with-docs`](../../.claude/skills/shape-with-docs/SKILL.md) | Reviewed vocabulary and mutable product, flow, or pending-sprint documents; a new ADR when required | Work stays on `shape/<slug>` and contains no executable tickets or implementation |
| Specification | The same shaping PRD, flow, and pending-sprint artifacts governed by ADR-0020 | Testable outcomes, scope, non-goals, scenarios, invariants, risks, DoD, and evidence plan | There is no duplicate standalone specification artifact |
| Sprint issue creation | [`create-sprint-issues`](../../.claude/skills/create-sprint-issues/SKILL.md) | Confirmed parent and dependency-ordered child issues plus the roadmap-start PR | Starts only after the shaping documentation PR is reviewed and merged |
| Issue execution | [`run-issue`](../../.claude/skills/run-issue/SKILL.md), or `resume-issue` for an interrupted run | One verified implementation PR and its required current-state documentation | Fresh execution context per issue; one issue and one integration owner |
| Review | Independent Standards review and Spec review of the fixed implementation commit | Findings resolved or explicitly rejected with evidence | Both axes pass before merge |
| Sprint control | `sprint-status`, then `close-sprint` when the sprint is complete | Queue visibility, shipped-vs-planned verification, retro, and roadmap update | Retros remain append-only; sprint locks remain in force |

UI-heavy implementation issues insert `design-grill` after issue creation and before `run-issue`. The design workflow refines the accepted issue; it does not reopen product shaping silently.

## Document routing

Use the [canonical domain glossary](../domain/GLOSSARY.md) for engineering and domain vocabulary only. A term's presence accepts its meaning; it does not claim that behavior is planned or implemented.

| Question | Canonical artifact |
|---|---|
| What does this term mean? | `docs/domain/GLOSSARY.md` |
| What should the completed capability do? | `docs/prd/features/` or `docs/prd/flows/` |
| What does a pending sprint add? | `docs/prd/sprints/` |
| What exists in code now? | The relevant `CONTEXT.md` found through `CONTEXT-MAP.md` |
| Why was a material decision made? | A new immutable ADR under `docs/adr/` |
| What is the cross-sprint trajectory? | `docs/prd/03-roadmap.md` |

Vocabulary additions and routine clarifications go directly to the glossary. Semantic redefinitions, bounded-context ownership changes, and vocabulary changes caused by material product or architecture decisions require a new ADR. Planned behavior never enters `CONTEXT.md`; the implementation PR updates `CONTEXT.md` when the corresponding invariant actually ships.

## Context and approval boundaries

- Keep one conversation through decision grilling, documentation editing, and approval of the shaping PR so unresolved choices remain visible.
- Start issue creation only from merged shaping documents. Its confirmation authorizes issue and roadmap mutations, not execution.
- Start each implementation issue in a fresh execution context with the issue, canonical vocabulary, governing specification, ADRs, and current-state context reloaded.
- A normal `run-issue` invocation authorizes its branch-to-merge flow, subject to its decision boundaries and both review axes.
- Never edit user-global skills or copy their generic instructions into the repository. AutoTM's canonical workflows live once under `.claude/skills/`.

## Review contract

The Standards reviewer checks repository policy, architecture, tests, documentation hierarchy, vocabulary use, and maintainability. The Spec reviewer checks every acceptance criterion and expected behavior against the fixed commit. They review independently; implementation ownership and review ownership must remain distinct when subagents are used.

Resolve valid findings with focused changes, rerun proportionate verification, and repeat the affected review axis. Only a fixed, green commit proceeds to pull-request merge.
