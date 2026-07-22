# Slicing reference

The sprint file owns the sprint-wide promise. Issues own independently reviewable vertical work.

## Extract facts

- sprint number/name, phase, milestone, demo line, DoD, risks, explicit files, tests, references, and no-gos;
- current implementation from relevant `CONTEXT.md` and code;
- dependencies already established by ADRs or earlier sprints; and
- host-only gates such as Testcontainers, CI credentials, Expo export, or simulator/runtime checks.

Do not convert future roadmap bets into this sprint.

## Slice as tracer bullets

A good child issue:

- produces one coherent, testable behavior;
- crosses layers only when required for that behavior;
- includes its enforcement and tests;
- is independently reviewable and mergeable;
- avoids overlapping files with parallel siblings where practical;
- has explicit out-of-scope siblings; and
- leaves the repository valid when merged before later children.

Split unrelated bounded-context behavior. Keep schema + contract + enforcement together when splitting would create an unusable intermediate state.

## AFK versus HITL

Use `ready-for-agent` when acceptance criteria and implementation authority are settled and the available environment can verify the slice. Add `blocked` while any dependency is open.

Use `ready-for-human` when the slice requires credentials, store-console action, hardware/on-site work, irreversible product judgment, or another capability an autonomous agent cannot safely complete. Do not label HITL work `ready-for-agent` merely to fill a queue.

## UI quality

For user-visible slices, name every screen/platform and link existing wireframe/hi-fi artifacts. If design is missing, make the design prerequisite explicit rather than embedding unresolved UI invention in an implementation issue. Include light/dark, five page states, accessibility, localization, and host verification when relevant.

## Body quality

AFK sprint children use the rich canonical body in `docs/agents/issue-tracker.md`:

- Summary
- Read first
- Files to create / modify
- Implementation notes when needed
- Acceptance criteria
- Out of scope
- Depends on
- Completion signal

HITL children may adapt the execution details but still require a testable completion signal. Parent issues are dashboards, not executable prompts.

## Verification wording

Distinguish three environments:

- common agent gate: typecheck, lint, and Docker-free unit tests;
- Claude host `/run-issue` gate: all relevant repository tests and guides;
- CI/host-only gates: Testcontainers/e2e, credentials, hardware, and Expo simulator/runtime evidence.

ADR-0019 always requires invariant-changing code and its current-state `CONTEXT.md` update in the same PR.
