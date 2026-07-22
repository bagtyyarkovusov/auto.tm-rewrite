# Design orchestration

Use mandatory separate subagent contexts for evidence, design, and critique, with the main session owning integration and every user decision. The orchestrator does not author the design artifacts itself.

## Isolation contract

- Dispatch the foundation auditor and both reviewers as read-only `Explore` subagents.
- Dispatch one fresh general-purpose wireframe designer, then one fresh general-purpose hi-fi designer. Never reuse either designer as its own reviewer.
- When a designer identifies a factual gap, the orchestrator must dispatch an `Explore` oracle with one bounded question and return the cited answer to that designer. The oracle may answer `DOC_GAP`; it may not edit or choose product behavior.
- Keep wireframe and hi-fi sequential because hi-fi consumes the approved wireframe. Do not run dependent design phases in parallel.
- Require each role to report sources, files or findings, unresolved questions, and a terminal status.

## 1. Foundation auditor

Dispatch one `Explore` subagent for read-only exploration. It identifies screens/platforms, authority documents, current implementation, existing specs, scope contradictions, missing product decisions, and stale guidance. It may inspect code to distinguish present from target, but never proposes visual detail as a product decision.

Return evidence paths plus one verdict from `FOUNDATION.md`.

## 2. Wireframe designer

After foundation settles, dispatch one fresh general-purpose wireframe designer. Preload/use the repo `wireframe` skill and, when available, user-global `ux-heuristics` and `design-everyday-things`. Otherwise use the same rubric embedded in the wireframe reference.

The designer produces draft artifacts only. It must return every factual gap to the orchestrator; the orchestrator routes each gap through the read-only oracle before the designer finalizes the affected section.

## 3. Wireframe UX review

Dispatch a new `Explore` reviewer, isolated from the designer, to evaluate:

- Krug/Nielsen heuristics and severity 0–4;
- user goal, mental model, IA/findability, recognition versus recall;
- gulfs of execution/evaluation;
- affordances, signifiers, mappings, constraints, feedback, control, and recovery;
- cognitive load, honest UX, and accessibility order; and
- all five page states.

Return usability and discoverability scores 0–10 plus improvements toward 10. Severity 3–4 blocks. Product choices become one numbered user frontier; factual fixes return to the designer.

## 4. Hi-fi designer

Only after wireframe approval, dispatch one fresh general-purpose hi-fi designer. Preload/use repo `hifi-design` plus the three user-global UX skills when available, including `microinteractions`. Resolve actual tokens/components/i18n from code rather than copying mutable constants, and route factual gaps through the same oracle loop.

## 5. Final review

Dispatch a fresh `Explore` reviewer to repeat the heuristic/discoverability review and add microinteraction quality:

- Trigger, Rules, Feedback, Loops/Modes;
- repeated/interrupted/boundary behavior;
- honest progress, motion/reduced motion;
- light/dark, interaction states;
- exact accessibility behavior; and
- RU/TK/EN copy with native-review markers.

Require no severity 3–4 finding and ≥8/10 in usability, discoverability/error tolerance, and microinteraction quality. List remaining gaps to 10/10 rather than claiming perfection.

## Fact versus decision rule

Agents find facts. The user decides behavior, scope, tradeoffs, and acceptance of risk. Do not “close” open questions by editing a PRD, sprint plan, or `CONTEXT.md`. Classify them and pause.
