---
name: wireframe
description: Produces a low-fidelity, task-centered AutoTM wireframe grounded in current product scope, information architecture, usability heuristics, platform conventions, and implementation reality. Use when designing or revising a screen, flow, navigation structure, form, or interaction before visual specification.
argument-hint: "<screen-or-flow> [platform] [standalone]"
---

# Wireframe an AutoTM screen or flow

Produce structure and behavior, not visual polish. Treat user-facing decisions as decisions, never missing facts to invent.

## Resolve the target

1. Parse `$ARGUMENTS` for screen/flow, platform (`mobile`, `web`, `admin`, or multiple), and optional `standalone` export mode.
2. If the target is ambiguous, inspect the roadmap, PRD/flow, issue, routes, and current UI before asking a focused product question.
3. Distinguish a new target, a proposal to redesign a shipped screen, and maintenance of a current-state UI mirror.

## Read authority in order

Read [the domain glossary](../../../docs/domain/GLOSSARY.md) for canonical engineering and domain labels. It does not specify screen behavior or user-facing copy.

1. `GRILL-OUTCOME.md` and accepted ADRs.
2. Target PRD/flow, current roadmap, and active issue/sprint delta.
3. Relevant `CONTEXT.md` and current implementation.
4. Actual routes, components, i18n, and token sources.
5. Mutable UI guidance: IA, Kolesa findability, design principles, accessibility, and platform split.

Kolesa informs UX/IA/findability only—never AutoTM visuals or deferred feature breadth. If mutable guidance conflicts with higher authority or code reality, surface the drift instead of copying it.

## Apply UX foundations

When available, apply the user-global `ux-heuristics` and `design-everyday-things` skills. The required fallback is in [REFERENCE.md](REFERENCE.md): user goal, mental model, findability, affordances, signifiers, mapping, constraints, system feedback, control/freedom, error prevention/recovery, cognitive load, and accessibility order.

## Produce and review

Follow the output contract in [REFERENCE.md](REFERENCE.md) and the compact examples in [EXAMPLES.md](EXAMPLES.md).

- Cover Default, Loading, Empty, Error, and Offline; use `N/A` only with a concrete reason.
- Map every primary action, exit/back path, blocked state, retry, and preserved user input.
- Use canonical domain meaning when labeling concepts, but take realistic one-language placeholder copy from product/i18n evidence. Flag every new string for hi-fi RU/TK/EN work; never translate glossary definitions into UI copy.
- Include a heuristic score, discoverability score, severity-rated findings, and concrete improvements toward 10/10.
- Leave token values, detailed motion, and visual styling to `/hifi-design`.

Preview the complete wireframe in chat. Ask product questions only when facts cannot settle user-facing behavior.

## Save

Save only after explicit confirmation to `docs/prd/ui/wireframes/<platform>-<route-or-screen>.md`, normally one screen/platform per file. Use one flow file only when cross-screen transitions are the artifact. Write on the current safe branch; do not silently create a branch, push, or open a PR.

In `standalone` mode, materialize a concise “Resolved constraints and sources” section so the saved/pasted artifact remains understandable without embedding a permanent copy of mutable project guidance.
