---
name: shape-with-docs
description: Shapes an AutoTM capability or sprint through decision grilling, vocabulary alignment, and repository-owned specifications before executable tickets exist. Use when the user invokes /shape-with-docs or asks to shape an idea, feature, or pending sprint.
argument-hint: "<topic>"
arguments:
  - topic
disable-model-invocation: true
---

# Shape with docs

Turn an unsettled product idea into reviewed AutoTM documentation. Do not create executable tickets or change implementation code in this workflow.

## Establish the evidence base

1. Resolve `$topic`; if it is empty or could identify more than one capability, ask the user to name the shaping target.
2. Read `CLAUDE.md`, `GRILL-OUTCOME.md`, `docs/prd/03-roadmap.md`, [the domain glossary](../../../docs/domain/GLOSSARY.md), `CONTEXT-MAP.md`, and the relevant current-state `CONTEXT.md` files.
3. Read the relevant target PRDs, flows, pending sprint documents, existing issues, and code. Always include [ADR-0019](../../../docs/adr/0019-context-md-describes-current-state.md), [ADR-0020](../../../docs/adr/0020-document-hierarchy-and-mutability.md), and [ADR-0042](../../../docs/adr/0042-domain-glossary-authority-and-mutability.md), plus every topic-specific ADR.
4. State the evidence already settled by the repository separately from decisions that still require the user. Do not ask the user questions the repository can answer.

## Grill the decision space

Apply the user-global grilling discipline breadth-first: purpose, users and roles, scope, workflows, invariants, failure paths, data ownership, permissions, operations, migration, rollout, and explicit non-goals. Challenge vague or conflicting answers with concrete scenarios until the choices are executable.

Apply domain-modeling discipline to terminology, examples, invariants, ownership boundaries, and code cross-references. AutoTM's document rules override any generic instruction to use `CONTEXT.md` as a glossary or planning document.

After each round:

- record decisions and remaining unknowns;
- flag conflicts with charter decisions, accepted ADRs, or current implementation;
- identify canonical terms, rejected synonyms, and overloaded names; and
- keep alternatives visible until the user chooses.

Do not silently resolve a product choice, material scope change, or architecture decision.

## Route each durable result

| Result | Canonical destination |
|---|---|
| Canonical term, definition, or rejected synonym | `docs/domain/GLOSSARY.md` |
| Target capability or end-to-end behavior | Mutable file under `docs/prd/features/` or `docs/prd/flows/` |
| Pending sprint delta, DoD, risks, or file/test plan | Eligible pending file under `docs/prd/sprints/` |
| Current implemented entities, invariants, ports, events, routes, or package shape | No shaping edit; update the relevant `CONTEXT.md` only in the implementation PR that ships the change |
| Material semantic redefinition, bounded-context ownership change, or architecture/product decision | A new ADR through [`new-adr`](../new-adr/SKILL.md), with its approval gates |
| Routine vocabulary addition or clarification within accepted decisions | Glossary edit without a new ADR |

Never edit an accepted ADR, a locked in-progress sprint plan, or an append-only retro. If the requested change has no legal mutable destination, stop and explain which governing decision must be superseded.

## Prepare the shaping delivery

1. Produce a decision record in the conversation: problem, outcomes, scope, non-goals, actors, scenarios, invariants, terminology, risks, unresolved questions, and evidence.
2. Map each accepted decision to its canonical document before editing. Reject duplicate specifications that would give two artifacts the same job.
3. Create a dedicated `shape/<slug>` branch from current `main`; keep implementation code and executable ticket mutations off it.
4. Edit only the approved mutable documents, glossary, agent guidance, and a new ADR when its separate workflow has been authorized.
5. Run applicable structural checks, link checks, and `git diff --check`. Show the complete documentation diff and any new-ADR implications for review.
6. After user approval, commit, push, and open a documentation PR. Do not create executable tickets until that PR is reviewed and merged.

## Hand off

After the shaping PR merges, follow the [coding workflow router](../../../docs/agents/coding-workflow.md): use [`create-sprint-issues`](../create-sprint-issues/SKILL.md) for an approved pending sprint, then execute one accepted issue at a time with [`run-issue`](../run-issue/SKILL.md). Each implementation must pass independent Standards and Spec review before merge.

Report the merged shaping PR, changed canonical artifacts, accepted vocabulary, superseding ADRs, unresolved risks, and the exact next workflow. Stop before creating or running tickets.
