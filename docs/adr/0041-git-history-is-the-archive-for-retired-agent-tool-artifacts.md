# ADR-0041: Git history is the archive for retired agent-tool artifacts

- **Status**: Accepted
- **Date**: 2026-07-22
- **Deciders**: AutoTM founder + AI architect
- **Supersedes**: ADR-0040's consequence that retained `docs/superpowers/*` as historical working-tree documents

## Context

ADR-0040 consolidated the executable project workflow into nine repository skills under `.claude/skills/`, but deliberately left historical Superpowers plans in the working tree. A broader consolidation audit then found several other agent-tool artifacts with no current runtime or governance role:

- `docs/superpowers/*` describes completed May/June implementation work and stale skill paths;
- `.mastra/*` is run-specific evidence from an abandoned local worktree, not product documentation;
- `skills-lock.json` inventories a retired skill installer layer;
- `scripts/patch-codegen.js` and `scripts/patch-expo-router.js` are obsolete post-install patches with no package-script caller; and
- ignored `.commandcode/` and `.impeccable/` directories are local tool output rather than project source.

Keeping these artifacts beside current ADRs, PRDs, `CONTEXT.md` files, and workflow skills makes repository search less trustworthy and creates false maintenance obligations. Git already preserves the historical versions and their provenance.

## Decision

**Retired agent-tool plans, run evidence, inventories, patches, and local critique output are removed from the working tree; Git history is their archive.**

- Delete `docs/superpowers/`, `.mastra/`, `skills-lock.json`, and the two unused patch scripts.
- Remove repository ignore exceptions/rules that existed only for the retired skill mirrors or local CommandCode/Impeccable output.
- Keep current project workflow in `.claude/skills/` as decided by ADR-0040.
- Keep `.sandcastle/` and its active dependency cache contract; Sandcastle remains the AFK implementation from ADR-0028 and ADR-0033.
- Do not treat this as permission for broad runtime dead-code deletion. Future removals still require evidence that the artifact has no current owner or caller.

## Consequences

### Positive

- Repository search returns current sources of truth with less historical/tool noise.
- The nine workflow skills no longer coexist with stale command-era specifications or evidence formats.
- Historical material remains recoverable from Git without being presented as maintained documentation.

### Negative / accepted costs

- Readers must use Git history to inspect the retired Superpowers plans or Mastra evidence.
- External links to deleted working-tree paths will no longer resolve at the branch tip.

### Neutral

- This changes no product behavior, runtime architecture, or Sandcastle execution contract.
- ADR-0040 remains authoritative for skill location and names; only its historical-document retention consequence is superseded.

## Alternatives considered

- **Move the artifacts into a repository archive directory** — rejected because it preserves search noise and an implied maintenance surface while duplicating Git's role.
- **Keep all historical files in place with deprecation banners** — rejected because several formats are tool-generated evidence, not durable documentation, and banners do not remove conflicting paths.
- **Delete active Sandcastle assets as part of the cleanup** — rejected because Sandcastle remains an implemented execution path with current configuration and caches.

## References

- [ADR-0020](0020-document-hierarchy-and-mutability.md)
- [ADR-0028](0028-kimi-sandcastle-afk-orchestrator.md)
- [ADR-0033](0033-sandcastle-copy-to-worktree-dependencies.md)
- [ADR-0040](0040-repo-canonical-workflow-skills.md)
- Repository consolidation grill, 2026-07-22
