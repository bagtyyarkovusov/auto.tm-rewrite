# ADR-0042: Domain glossary authority and mutability

- **Status**: Proposed
- **Date**: 2026-08-13
- **Deciders**: AutoTM founder + AI architect

## Context

AutoTM's document hierarchy separates charter decisions, target capability, sprint commitments, and current implemented state. The repository does not yet have one place that answers a different recurring question: "What does this domain term mean?"

Without a canonical vocabulary source, shaping and implementation can introduce synonyms or overload existing names. Using `CONTEXT.md` as that source would violate [ADR-0019](0019-context-md-describes-current-state.md), because a term may need to be agreed during shaping before its behavior exists in code. It would also give `CONTEXT.md` a second job contrary to [ADR-0020](0020-document-hierarchy-and-mutability.md).

The repository's canonical workflow skills live under `.claude/skills/` per [ADR-0040](0040-repo-canonical-workflow-skills.md). Those workflows need a repository-native vocabulary artifact rather than relying on a user-global glossary convention.

## Decision

**AutoTM keeps one repository-wide canonical English domain glossary at [`docs/domain/GLOSSARY.md`](../domain/GLOSSARY.md).**

The glossary has exactly one job: define canonical engineering and domain vocabulary.

- Entries are grouped by bounded context, with a `Cross-context` group for genuinely shared terms.
- Each entry contains a canonical term and a one- or two-sentence definition. An optional `_Avoid_` line records ambiguous or rejected synonyms.
- A term may be added while work is being shaped. Its presence means the vocabulary is accepted; it does not claim that the associated capability is implemented or scheduled.
- The glossary does not contain implementation status, feature specifications, sprint scope, roadmaps, or user-facing translations.
- Charter decisions and accepted ADRs remain authoritative over the glossary. The glossary owns naming and definitions within those decisions; PRDs own target capability, sprint files own delivery deltas, and `CONTEXT.md` owns current implemented state.
- Routine additions and clarifications may edit the glossary directly. A semantic redefinition, bounded-context ownership change, or vocabulary change caused by a material product or architecture decision requires a new ADR under ADR-0020's threshold.
- Repository shaping and delivery workflows consult the glossary and route durable vocabulary decisions back to it instead of treating `CONTEXT.md` as a glossary.

A structural repository check enforces the glossary's parseable shape, unique canonical terms, synonym collisions, known bounded-context headings, and required integration references. Semantic accuracy remains a review responsibility.

## Consequences

### Positive

- Shaping, specifications, tickets, implementation, and review share one vocabulary source.
- Terms can be settled before implementation without making `CONTEXT.md` aspirational.
- Synonym drift and overloaded canonical names become visible during CI and review.
- The glossary convention is repository-owned and therefore available to every supported coding agent.

### Negative / accepted costs

- Contributors must maintain another small documentation artifact when introducing domain language.
- Structural validation cannot determine whether a definition is semantically correct; reviewers must compare it with higher-authority decisions.
- Material terminology changes may require both a new ADR and a glossary edit.

### Neutral

- Existing `CONTEXT.md` files keep their current-state role and mutability rule unchanged.
- Product translations remain owned by the existing RU/TK/EN i18n and design workflows.
- This ADR complements ADR-0019, ADR-0020, and ADR-0040; it supersedes none of them.

## Alternatives considered

- **Treat every `CONTEXT.md` as its bounded context's glossary.** Rejected because it conflates vocabulary with implemented state and prevents terms from being agreed safely during shaping.
- **Store vocabulary only inside feature PRDs.** Rejected because shared terms would be duplicated across capabilities and would inherit the wrong authority and mutability rules.
- **Use a user-global domain-modeling skill as the source of truth.** Rejected because personal tooling is not repository policy and its generic `CONTEXT.md` convention conflicts with ADR-0019.
- **Create one glossary per bounded context.** Rejected for now because AutoTM is small enough for a single searchable document, while cross-context collision checks are more reliable in one file.

## References

- [ADR-0019](0019-context-md-describes-current-state.md) — `CONTEXT.md` describes current state
- [ADR-0020](0020-document-hierarchy-and-mutability.md) — document hierarchy and mutability rules
- [ADR-0040](0040-repo-canonical-workflow-skills.md) — repository-canonical workflow skills
- [ADR-0013](0013-user-role-split.md) — marketplace role and dealership membership role are separate concerns
- [`GRILL-OUTCOME.md`](../../GRILL-OUTCOME.md) — charter-level bounded contexts and terminology
