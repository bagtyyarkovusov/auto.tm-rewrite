# ADR-0019: CONTEXT.md describes current state, not aspirational spec

- **Status**: Accepted
- **Date**: 2026-05-17

## Context

This repo documents architecture across multiple artifacts:

| Artifact | Role |
|---|---|
| **ADRs** (`docs/adr/`) | Immutable, dated decisions — why we chose this path |
| **PRD vision/scope** (`docs/prd/00-vision.md`, `02-phases.md`) | What we're building, at the charter level |
| **PRD features** (`docs/prd/features/`) | Per-feature product spec — capabilities, flows, edge cases |
| **PRD sprints** (`docs/prd/sprints/sprint-NN-*.md`) | Per-sprint DoD — what each sprint adds |
| **CONTEXT.md** (per app, per package, per bounded context) | Originally framed as "what is true right now" |

During the pre-S3 grill (2026-05-17), `apps/api/src/modules/catalog/CONTEXT.md` was found to describe 10 entities with rich fields (logoUrl, isActive, displayOrder, slug, iconKey, …) while Prisma had only 7 entities with skinnier columns. Two interpretations of CONTEXT.md's role emerged:

1. **CONTEXT.md describes target state** — sprints broaden to match what CONTEXT describes. (Briefly locked at 4pm 2026-05-17, reverted by 6pm.)
2. **CONTEXT.md describes current state** — code is truth; CONTEXT mirrors it; aspirational content lives in PRD features and sprint files.

The first interpretation was tried and quickly created friction:

- Sprint 3's estimate doubled (~1 week → ~2-3 weeks) catching up to aspirational text.
- A cross-repo audit surfaced ~70 field drifts + 10 missing entities + 5 missing ports across 6 other bounded contexts — every one of those would have become per-sprint "broadening" work catching up to text nobody had cost-benefit-validated.
- AI agents pick up an issue and have to reconcile two truths: "what does code look like now?" + "what does CONTEXT describe as the spec?" → cognitive load and ambiguity.
- The "spec" role overlapped with PRD features files, which already exist for that purpose.

The team reversed the choice. This ADR locks the second interpretation.

## Decision

**CONTEXT.md files describe the current implemented state of their context — not the spec.**

They are the mutable, agent-readable mirror of code reality. The CONTEXT.md for a bounded context lists the entities + fields that exist in `schema.prisma` today, the ports + methods that exist in `domain/ports/` today, the events that have running emit/consume code today.

**Aspirational state — what we plan to build — lives elsewhere:**

| Concern | Where it lives |
|---|---|
| Product capability ambition | `docs/prd/features/*.md` |
| Sprint-scoped additions | `docs/prd/sprints/sprint-NN-*.md` (DoD lists) |
| Architectural decisions | `docs/adr/*.md` (this folder) |
| Locked charter decisions | `GRILL-OUTCOME.md` |
| What CONTEXT.md becomes after sprint N ships | Inferred from the diff (current CONTEXT + sprint DoD additions) |

**When code changes domain invariants, the PR that changes the code MUST update the relevant CONTEXT.md in the same PR.** This is enforced by the verification-before-completion checklist in `CLAUDE.md`.

CONTEXT.md may be edited only to:
- Reflect newly-shipped changes (forward updates that match new code)
- Fix outright factual errors (typos, broken cross-references)
- Add a "Planned additions" sub-section pointing at the sprint file that owns each future addition

CONTEXT.md is **never** edited to "match aspirational text that was written ahead of code" — that text relocates to the PRD features file or the sprint file where it belongs.

## Consequences

### Positive

- **One source of truth per concern.** PRD describes ambition, sprint files describe what each sprint adds, CONTEXT describes what's shipped. No overlap, no reconciliation tax.
- **AI agents have a clean mental model.** Read CONTEXT → know reality. Read sprint file → know what to add. The two are independent, never contradictory.
- **Verification is mechanical.** A PR that changes a Prisma model is required to update CONTEXT.md in the same PR; a future CI gate can diff CONTEXT entity descriptions against schema fields.
- **No retroactive "broadening" exercises.** Sprints plan against the actual current code + the actual product need (per PRD), not against aspirational text written months ago.
- **Domain experts review CONTEXT.md confidently.** It describes shipped state — closer to user reality than ambition.
- **Pre-existing CLAUDE.md rule is honored.** The rule "Update the CONTEXT.md when domain invariants change. That file should always reflect today, not last quarter." already encodes the current-state model. This ADR makes that the canonical interpretation.

### Negative / accepted costs

- **One-time cleanup**: 17 CONTEXT.md files in the repo currently contain aspirational content. Each needs a tightening pass + relocation of aspirational text into the appropriate PRD features file or sprint file. Estimated 3-4 hours of focused work.
- **Two artifacts updated per PR that changes invariants** (code + CONTEXT.md). Small but real overhead — mitigated by verification gate making it routine.
- **The "vision" instinct of CONTEXT.md original authors needs another home** — most aspirational content from CONTEXT.md relocates to PRD features files or sprint files cleanly; some content gets dropped if it was never cost-benefit-validated.

### Neutral

- ADRs unchanged in role (still immutable decisions)
- PRD vision/features/sprint files unchanged in role
- CLAUDE.md gets one new verification-gate item (CONTEXT updated when invariants change)
- CONTEXT-MAP.md wording updated to clarify the current-state framing and the boundary with PRD/sprint files

## Alternatives considered

- **CONTEXT.md as binding spec (current-state ignores aspirational content).** Tried 2026-05-17 4pm-6pm. Reversed because: doubled S3 scope estimate, surfaced ~70 cross-repo "drifts" requiring per-sprint catch-up, made every issue body need to reconcile two truths, duplicated the role of PRD features files. Locked as superseded.
- **CONTEXT.md as aspirational / non-binding.** Rejected: no anchor for "what is true now" — agents have to derive it from source code each time.
- **Separate `SPEC.md` alongside CONTEXT.md.** Rejected: doubles the doc surface for no gain — PRD features files already serve the spec role.
- **Eliminate CONTEXT.md entirely; rely on code + PRD.** Rejected: CONTEXT serves a real role for AI agents and onboarding humans (a single readable summary of context invariants per directory) that source code doesn't.

## References

- Commit `ed483ee` — first tightening of catalog/CONTEXT.md (right direction; was momentarily reverted under the wrong-direction principle)
- Commit `ce3033c` — `git revert ed483ee` (wrong direction under this ADR; will be re-reverted as part of the CONTEXT sweep)
- Commit `1d31714` — first sprint file rewritten under the wrong-direction principle (will be reverted: sprint-03-catalog.md returns to the PR #64 trim scope)
- PR #64 — pre-S3 housekeeping (the trim scope that is the active S3 plan after this ADR locks)
- `apps/api/src/modules/catalog/CONTEXT.md` — the case that surfaced the question
- `CLAUDE.md` — verification gate updated to require CONTEXT update in same PR as code change
- `CONTEXT-MAP.md` — wording updated to reflect current-state role + boundary with PRD/sprint files
- ADR-0001 (Architecture — bounded contexts) — context where CONTEXT.md files live
- Pre-existing CLAUDE.md rule: *"Update the CONTEXT.md when domain invariants change. That file should always reflect today, not last quarter."* — this ADR makes that the canonical interpretation
