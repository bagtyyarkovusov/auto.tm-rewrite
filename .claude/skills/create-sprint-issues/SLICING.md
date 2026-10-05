# Slicing reference

The sprint file owns the sprint-wide promise. Issues own independently reviewable vertical work.

## Extract facts

- sprint number/name, phase, milestone, demo line, DoD, risks, explicit files, tests, references, and no-gos;
- relevant canonical glossary terms and avoided synonyms;
- current implementation from source and tests, located through relevant overviews;
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

Do not slice below one outcome that can be verified on its own; pieces that cannot be reviewed or verified alone stay in one issue ([ADR-0065](../../../docs/adr/0065-small-changes-skip-the-issue-ceremony.md)). Split unrelated bounded-context behavior. Keep schema + contract + enforcement together when splitting would create an unusable intermediate state.

## Slices inside one issue

Under [ADR-0082](../../../docs/adr/0082-an-issue-may-carry-up-to-three-ordered-slices.md), put slices in one issue when they serve one user-visible outcome and each depends on the one before, such as an endpoint and the screen that is its only consumer. Cap it at three slices and about 800 changed lines excluding tests. Give each slice a numbered section with its own acceptance criteria and one focused check. Keep separate issues for slices that could run in parallel and for any slice that changes authentication or sessions, upload ownership, a destructive or data-moving migration, the worker, or external egress.

## AFK versus HITL

Use `ready-for-agent` when acceptance criteria and implementation authority are settled and the available environment can verify the slice. Add `blocked` while any dependency is open.

Use `ready-for-human` when the slice requires credentials, store-console action, hardware/on-site work, irreversible product judgment, or another capability an autonomous agent cannot safely complete. Do not label HITL work `ready-for-agent` merely to fill a queue.

## UI quality

For user-visible slices, name every screen/platform and link existing wireframe/hi-fi artifacts. If design is missing, make the design prerequisite explicit rather than embedding unresolved UI invention in an implementation issue. Include light/dark, five page states, accessibility, localization, and host verification when relevant.

## Body quality

AFK sprint children use the canonical body in `docs/agents/issue-tracker.md`:

- Summary
- Governing references and owning area
- Acceptance criteria
- Out of scope
- Depends on
- Special verification when the standard gate cannot prove the outcome

When domain vocabulary matters, reference `docs/domain/GLOSSARY.md` and use its canonical terms without treating definitions as behavioral requirements. Existing inconsistent names remain out of scope unless the sprint explicitly owns a migration; harmful ambiguity becomes separately scoped follow-up work.

HITL children may adapt the execution details but still require a testable completion signal. Parent issues are dashboards, not executable prompts.

## Verification wording

Distinguish three environments:

- common agent gate: typecheck, lint, and Docker-free unit tests;
- interactive host `run-issue` gate: all relevant repository tests and guides;
- CI/host-only gates: Testcontainers/e2e, credentials, hardware, and Expo simulator/runtime evidence.

ADR-0060 requires an overview update in the same PR when its documented ownership, boundary, constraint, or important limitation changes. Routine implementation details remain in source and tests.
