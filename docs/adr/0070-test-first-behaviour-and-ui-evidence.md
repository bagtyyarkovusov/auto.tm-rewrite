# ADR-0070: Test-first behaviour and UI evidence

- **Status**: Proposed
- **Date**: 2026-09-30
- **Deciders**: AutoTM founder, acceptance pending
- **Complements**: [ADR-0067](0067-targeted-intermediate-reviews-and-final-verification.md)'s verification and review procedure

## Context

Issue #359's inline wizard error could not render. Its source-text test checked that a lookup key appeared, so it passed without proving the error was visible. Issue #456 reports that 48 of 117 mobile spec files use source reads. Tests written after implementation can confirm the implementation while missing the acceptance criterion.

UI design readiness and review cadence already have workflow guidance. The missing decision is how implementers establish behaviour and visual evidence. Mobile render-test infrastructure is enabling work in #457, outside this documentation issue.

## Decision

The proposed policy requires a failing test for each acceptance criterion that can be tested in code before its production code is written. The implementer runs the test, confirms that it fails because the criterion is unmet, commits and pushes a checkpoint, and records the failing run in the PR's Execution state. Then the implementer writes the code and reruns the same test to prove it passes. A setup, import, or dependency failure does not establish red behaviour evidence.

Visual look, generated files, and docs-only work are exempt from the failing-test requirement. Testable behaviour behind generated output remains subject to it. Existing passing tests alone do not establish the new criterion's red evidence.

UI behaviour is proven by tests that render the component or screen and exercise relevant taps, disabled states, errors, empty states, and loading states. Searching source text does not count as behaviour evidence. UI look is proven separately by simulator or emulator screenshots of every state listed in the governing design spec, attached to the PR and compared with that spec by the Spec reviewer. Screenshot or snapshot matching is not required.

The Spec reviewer checks whether each criterion's test would fail if its behaviour broke, checks the recorded red/green sequence or exemption, and compares required screenshots with the governing spec.

This ADR remains Proposed until the founder explicitly accepts it. The mutable workflow documents carry the requested procedure for #456; their publication does not claim founder acceptance of this decision.

## Consequences

### Positive

- The failing run demonstrates that a test detects unmet behaviour before implementation.
- Render tests catch unreachable UI that source-text assertions miss.
- Screenshots give the Spec reviewer evidence of every designed state.

### Negative / accepted costs

- Each testable criterion needs a pushed red checkpoint and durable evidence.
- UI issues need render-capable infrastructure and simulator or emulator access. If either is missing, the implementer records the missing gate and where it must run rather than claiming success.

### Neutral

- #457 owns mobile renderer setup and conversion of existing specs. This decision adds neither infrastructure nor CI changes.
- ADR-0067's final repository gates and independent fixed-commit reviews remain required.

## Alternatives considered

- **Write tests after production code.** Rejected by the proposal because it offers no prior proof that the test detects the unmet criterion.
- **Use source-text assertions as UI behaviour proof.** Rejected because text presence does not establish rendered behaviour.
- **Require pixel or snapshot matching.** Rejected because the requested visual proof is spec comparison by the reviewer.

## References

- [Issue #456](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/456)
- [Issue #457](https://github.com/bagtyyarkovusov/auto.tm-rewrite/issues/457)
- [Verification](../../.claude/skills/run-issue/VERIFICATION.md)
