# ADR-0068: Resolve Context7 IDs at lookup time

- **Status**: Accepted
- **Date**: 2026-09-29
- **Deciders**: AutoTM founder
- **Amends**: ADR-0017's pre-resolved library-ID shortcut; preserves its mandatory Context7 lookup policy

## Context

ADR-0017 established Context7 as the canonical source for external dependency documentation. Its guide carried pre-resolved library IDs and allowed agents to query those IDs directly. IDs, available versions, and source coverage can change. The current agent instruction requires `resolve-library-id` first unless the user supplies an exact `/org/project` ID. The guide needs to agree with that instruction without discarding the useful stack reference.

## Decision

**Treat the guide's library IDs as candidates and resolve the current ID before each lookup, except when the user supplies an exact ID.** Then query the selected ID with the full task question. Use workspace package files and the lockfile to identify the installed version; the guide's table is not version authority.

## Consequences

- Agents keep the mandatory Context7 lookup before writing or debugging code that touches an external dependency.
- The compact table remains a starting reference for major stack libraries, but a stale entry cannot silently bypass resolution.
- A lookup may take one more Context7 call than the shortcut in ADR-0017.

## Alternatives considered

- **Keep querying pre-resolved table IDs directly.** Rejected because it conflicts with the current resolve-first instruction and can preserve stale IDs.
- **Remove the table entirely.** Rejected because ADR-0017 calls for a discoverable stack reference and the compact candidate list still helps agents choose a result.

## References

- [ADR-0017](0017-context7-as-canonical-doc-source.md)
- [Documentation lookups](../agents/documentation-lookups.md)
- [Root agent policy](../../AGENTS.md)
