# ADR-0059: Source-first agent context and task-scoped guidance

- **Status**: Accepted direction; implementation and review tracked in #417
- **Date**: 2026-09-28
- **Deciders**: AutoTM founder, following the repository cleanup audit
- **Supersedes**: ADR-0019's exhaustive implementation-mirror and per-field documentation requirement
- **Amends**: ADR-0020's CONTEXT.md role and update trigger; ADR-0042's description of that role
- **Preserves**: ADR-0042 vocabulary authority, ADR-0040's single skill layer, and ADR-0058 execution/review gates

## Context

The September audit found 21 local context documents, including an 8,539-word mobile overview. Root policies require 16,514 words of common startup reading before local code. Repeated descriptions have drifted: root guidance names User.refreshTokenHash despite Session ownership, and the mobile context describes already-removed photo props as a current defect. Copying implementation into prose creates another source an agent must reconcile.

The founder authorized a sustained cleanup in one isolated worktree, including relying on code and tests for implementation facts. Matt Pocock's CONTEXT.md convention is a glossary; AutoTM already gives that job to docs/domain/GLOSSARY.md. Adopting his principle of selective context does not require renaming or duplicating our glossary.

## Decision

**Code and tests own implementation facts. Local CONTEXT.md files provide concise orientation, loaded only when the task touches that area.**

Keep ownership, non-obvious current constraints, important cross-context boundaries, known limitations that affect safe changes, and links to source, tests, and relevant decisions. Do not maintain exhaustive lists of fields, methods, routes, files, package versions, or completed work. Do not relocate those inventories into another mandatory document. A context may name a specific field or method when the distinction prevents a likely mistake; it must point to the implementation that verifies it.

Update the owning overview in the same PR when ownership, a documented constraint, a public boundary, or an important limitation changes. Adding a routine field, internal method, use-case, or route does not independently require a prose mirror. Reviewers verify the actual code and tests, then ensure the overview remains accurate. Documentation is navigation, never proof that a behavior is implemented.

Root AGENTS.md and CLAUDE.md expose the same short policy. Keep one maintained instruction body, with the other host entry point explicitly loading it. Conditional pointers select domain, mobile, library, deployment, and workflow guidance. Do not require the full charter, roadmap, glossary, sprint history, or unrelated tutorials on every task. Load the issue and its governing specification; consult roadmap/sprint scope when scheduling or capability scope matters, and the charter/ADRs when the decision matters.

The document roles are:

| Question | Authority |
|---|---|
| What does a project term mean? | docs/domain/GLOSSARY.md |
| What is implemented and how does it behave? | Source, schema, tests, and runtime evidence |
| Where should I look, and which boundary must I respect? | CONTEXT-MAP.md and relevant local CONTEXT.md |
| What must this change deliver? | Issue acceptance criteria and owning PRD/sprint specification |
| Why did we choose this? | Applicable ADRs and charter decisions |
| How do I execute and verify this task? | Task-triggered docs/agents guidance and tracked .claude/skills |
| What has this implementation attempt completed? | The PR's single Execution state |

Codex, Claude Desktop/Claude Code, and Claude-Kimi consume the same repository guidance. A host that does not discover .claude/skills automatically follows its links and reads the skill manually. A tool or provider change does not create another skill copy or weaken verification. Sandcastle remains suspended until #406 implements ADR-0058; a provider's availability is not permission to use the retired integration path.

## Boundaries

- Keep accepted ADRs immutable, locked sprint commitments intact, and retros append-only. This decision changes the active interpretation without rewriting those historical artifacts.
- Keep glossary authority and its parseable vocabulary checks. New terminology can precede implementation without claiming shipped capability.
- Keep cross-context ports, framework-free domain logic, real integration tests, mobile runtime checks, independent fixed-SHA reviews, required CI, and merge-driven closure.
- Do not remove a necessary constraint solely to meet a word count. Judge guidance by the behavior it changes and whether the same fact already has an owner.
- Generic global domain-modeling skills must route vocabulary to AutoTM's glossary, not apply their glossary-only CONTEXT.md convention to local overviews.

## Consequences and verification

Agents read less unrelated prose and inspect implementation directly. The cost is that navigation and test boundaries must be clear, and important cross-cutting constraints still need a concise written home. Removing stale text alone does not prove improved task completion.

Issue #417 checks entry-point consistency, active document links, representative API/mobile/docs/resume routes, and before/after reading size. Runtime removals need their own consumer and behavior evidence. The final PR requires fresh Codex and Claude reviews under ADR-0058. Any later performance claim needs comparable task runs; word reduction is not a success-rate measurement.

## Sources

- [AI Hero: domain modeling](https://www.aihero.dev/skills-domain-modeling)
- [AI Hero: AGENTS.md](https://www.aihero.dev/a-complete-guide-to-agents-md)
- [AI Hero: writing for agents](https://www.aihero.dev/skills-writing-for-agents)
- [AI Hero: codebase design](https://www.aihero.dev/how-to-make-codebases-ai-agents-love)
- [ADR-0019](0019-context-md-describes-current-state.md), [ADR-0020](0020-document-hierarchy-and-mutability.md), [ADR-0042](0042-domain-glossary-authority-and-mutability.md), [ADR-0058](0058-portable-coding-agent-issue-execution-and-pull-request-gates.md)
