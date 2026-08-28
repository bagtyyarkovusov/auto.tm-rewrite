# Agents — auto.tm-rewrite

Same policy as `CLAUDE.md` in this repository. AI agents working in this repo should treat the two files as identical sources of truth.

## Read first

1. `GRILL-OUTCOME.md` — locked design decisions
2. `docs/prd/03-roadmap.md` — current sprint + cross-sprint trajectory
3. [`docs/domain/GLOSSARY.md`](docs/domain/GLOSSARY.md) — canonical vocabulary; a term's presence does not claim implementation
4. `CONTEXT-MAP.md` — index of every `CONTEXT.md` (mirrors current code, per ADR-0019)
5. The local `CONTEXT.md` for the area you're working in
6. Relevant ADRs in `docs/adr/`. **Always include [ADR-0019](docs/adr/0019-context-md-describes-current-state.md) (CONTEXT.md = current state) and [ADR-0020](docs/adr/0020-document-hierarchy-and-mutability.md) (doc hierarchy + mutability rules).** These two ADRs govern every artifact in the repo.
7. `docs/prd/sprints/sprint-NN-<name>.md` — current sprint's DoD + file list + risks

For the full agent policy (architecture rules, never-do list, verification checklist, documentation system), read `CLAUDE.md`.

## Documentation hierarchy + CONTEXT.md rule (load-bearing)

Two ADRs lock how docs work in this repo. Read both before editing any artifact:

- **[ADR-0019](docs/adr/0019-context-md-describes-current-state.md) — CONTEXT.md describes current state.** Every `CONTEXT.md` file mirrors current implemented code, not aspirational spec. **Any PR that changes domain invariants (Prisma field, port, use-case, event, route, app/package structure) must update the relevant CONTEXT.md in the same PR.** Enforced by item 3 of the verification gate in `CLAUDE.md` and by `/run-issue` §5.5.

- **[ADR-0020](docs/adr/0020-document-hierarchy-and-mutability.md) — Document hierarchy and mutability rules.** Each artifact has exactly one job + one mutability rule. PRD features describe target capability (mutable; material revisions get an ADR). Sprint files describe per-sprint DoD (mutable until the sprint starts; locked at 🟡). Retros are append-only. ADRs are immutable after merge. ADR-0020 contains the full table, the workflow for adding a new PRD, and the rules for when a PRD revision requires its own ADR.

Where each kind of state lives:

| Question | Answer artifact |
|---|---|
| "What does this term mean?" | `docs/domain/GLOSSARY.md` |
| "What does this feature DO when complete?" | `docs/prd/features/*.md` |
| "What does this sprint ADD?" | `docs/prd/sprints/sprint-NN-*.md` |
| "Why did we decide this approach?" | `docs/adr/*.md` |
| "What's in code today?" | `CONTEXT.md` |
| "Where are we in the trajectory?" | `docs/prd/03-roadmap.md` |
| "What did we agree at the charter level?" | `GRILL-OUTCOME.md` |

If two artifacts try to answer the same question → that's drift. Pick the canonical one (per ADR-0020) and prune the other.

## Agent skills

### Coding workflow

Shape, specify, ticket, implement, and review through [`docs/agents/coding-workflow.md`](docs/agents/coding-workflow.md).

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Canonical vocabulary — see [`docs/domain/GLOSSARY.md`](docs/domain/GLOSSARY.md). Current implementation remains multi-context — see `CONTEXT-MAP.md` and `docs/agents/domain.md`.

### Mobile / Expo checks

For any `mobile` issue, SDK/package debugging, Metro failure, or Expo Go runtime crash, read `docs/agents/mobile-expo.md` before changing package versions, Metro config, Codegen, or `node_modules` resolution.

### TypeScript runtime boundaries

For any TypeScript module-resolution, package `exports`, `.js`/extensionless import, or runtime-shared workspace package issue, read `docs/agents/typescript-runtime.md` first. `@auto-tm/db` and `@auto-tm/contracts` are built packages for runtime consumers; do not point their exports back at raw `src/*.ts`.

### Library documentation lookups (Context7 MCP)

**Use Context7 MCP for every library doc lookup.** Before writing or debugging code that touches an external library, framework, SDK, API, CLI, or cloud service — including well-known ones (React, Next.js, Prisma, Expo, Tailwind, NestJS) — resolve and query it via Context7. Your training data lags; the version we run may have renamed, removed, or changed the API you remember.

The canonical workflow, the pinned library-ID table for this stack (NestJS 11, Prisma 7, Next.js 16, React 19, Expo SDK 55, NativeWind v4, TanStack Query v5, and ~25 others), and recipes for the most-touched libraries live in [`docs/agents/documentation-lookups.md`](docs/agents/documentation-lookups.md). Locked in [ADR-0017](docs/adr/0017-context7-as-canonical-doc-source.md).

The verification gate requires that you consulted Context7 for every external library your change touched (or recorded in the PR description why you didn't).

### Sprint + design skill set (project skills, `.claude/skills/`)

Ten project-specific skills live under [`.claude/skills/`](./.claude/skills/) in Claude Code skill format (YAML frontmatter + progressive-disclosure reference files), tracked in git and reviewed via PR. This is the **only** agent-skill layer in the repo — there are no slash-command mirrors and no cross-agent copies. Locked in [ADR-0040](docs/adr/0040-repo-canonical-workflow-skills.md). Generic skills (grilling, tdd, write-a-skill, …) are user-global personal tooling and are never committed.

| Skill | Phase of sprint lifecycle |
|---|---|
| [`shape-with-docs`](./.claude/skills/shape-with-docs/SKILL.md) | Before tickets — grills an unsettled capability, routes vocabulary and specifications to canonical docs, and delivers a reviewed shaping PR |
| [`create-sprint-issues`](./.claude/skills/create-sprint-issues/SKILL.md) | Start of sprint — reads `docs/prd/sprints/sprint-NN-*.md`, proposes a slicing, creates parent + child issues on GitHub, bumps roadmap to 🟡 |
| [`run-issue`](./.claude/skills/run-issue/SKILL.md) | During sprint — picks one issue, branches, optional design check, implements, PRs, self-merges, syncs main, unblocks dependents |
| [`resume-issue`](./.claude/skills/resume-issue/SKILL.md) | During sprint — picks up an issue a previous run bailed on; offers continue / rebase-and-continue / abandon-and-restart |
| [`sprint-status`](./.claude/skills/sprint-status/SKILL.md) | Anytime — read-only dashboard of current sprint, open PRs, unblocked queue, suggested next action |
| [`close-sprint`](./.claude/skills/close-sprint/SKILL.md) | End of sprint — verifies shipped-vs-planned, detects drift, writes retro doc, proposes doc-update commits |
| [`new-adr`](./.claude/skills/new-adr/SKILL.md) | Anytime — scaffolds a new ADR at `docs/adr/`, auto-numbers, offers PR rhythm (ADRs are immutable after merge) |
| [`wireframe`](./.claude/skills/wireframe/SKILL.md) | Pre-implementation — low-fi structural sketch of a screen, mobile-first, brand-aware, anti-pattern-free |
| [`hifi-design`](./.claude/skills/hifi-design/SKILL.md) | Pre-implementation — token-precise hi-fi spec with light+dark, all 5 states, motion, accessibility, trilingual copy, component shape |
| [`design-grill`](./.claude/skills/design-grill/SKILL.md) | Pre-implementation design phase for UI-heavy issues — foundation check, wireframe + hi-fi via design subagents, handoff, then `/run-issue` |
