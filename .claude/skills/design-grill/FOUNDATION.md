# Foundation verdicts

## READY

The owning PRD/flow/issue settles user behavior; current state and platform boundaries are understood; no prerequisite design-system capability is missing.

## DOC_GAP

Repository facts cannot settle one or more product decisions. Return one numbered frontier with recommendation and evidence. Resume after answers. Factual typos may be proposed separately; material capability changes require `/new-adr` under ADR-0020.

## NEEDS_FOUNDATION

A reusable component, token, navigation contract, product rule, or prerequisite behavior must ship first. Draft exactly one issue:

```markdown
## Summary
<foundation capability and why target issue needs it>

## Read first
- <charter/ADR/PRD/CONTEXT/current component sources>

## Direction
<settled implementation boundary, not invented product scope>

## Files to create / modify
- `<path>` — <purpose>

## Acceptance criteria
- [ ] <testable behavior and documentation>

## Out of scope
- Target issue #N implementation

## Depends on
- None | #...

## Completion signal
<repository gates and same-PR CONTEXT rule>
```

Preview title/body/labels/dependency update. After approval, create it with existing labels, link/comment on #N, mark #N blocked when appropriate, and stop. Do not create a tenth project skill.

## NOT_UI

The issue has no meaningful user-facing design surface. Explain and route to `/run-issue`.

## ALREADY_DESIGNED

Applicable specs exist and match target/current authority. Cite them and route to `/run-issue`; do not regenerate artifacts for ceremony.
