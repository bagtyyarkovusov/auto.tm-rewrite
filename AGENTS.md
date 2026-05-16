# Agents — auto.tm-rewrite

Same policy as `CLAUDE.md` in this repository. AI agents working in this repo should treat the two files as identical sources of truth.

## Read first

1. `GRILL-OUTCOME.md` — locked design decisions
2. `docs/prd/03-roadmap.md` — current sprint + cross-sprint trajectory
3. `CONTEXT-MAP.md` — index of every `CONTEXT.md`
4. The local `CONTEXT.md` for the area you're working in
5. Relevant ADRs in `docs/adr/`
6. `docs/prd/sprints/sprint-NN-<name>.md` — current sprint's DoD + file list + risks

For the full agent policy (architecture rules, never-do list, verification checklist, documentation system), read `CLAUDE.md`.

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical five-role vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context — see `CONTEXT-MAP.md` and `docs/agents/domain.md`.

### Mobile / Expo checks

For any `mobile` issue, SDK/package debugging, Metro failure, or Expo Go runtime crash, read `docs/agents/mobile-expo.md` before changing package versions, Metro config, Codegen, or `node_modules` resolution.

### TypeScript runtime boundaries

For any TypeScript module-resolution, package `exports`, `.js`/extensionless import, or runtime-shared workspace package issue, read `docs/agents/typescript-runtime.md` first. `@auto-tm/db` and `@auto-tm/contracts` are built packages for runtime consumers; do not point their exports back at raw `src/*.ts`.

### Library documentation lookups (Context7 MCP)

**Use Context7 MCP for every library doc lookup.** Before writing or debugging code that touches an external library, framework, SDK, API, CLI, or cloud service — including well-known ones (React, Next.js, Prisma, Expo, Tailwind, NestJS) — resolve and query it via Context7. Your training data lags; the version we run may have renamed, removed, or changed the API you remember.

The canonical workflow, the pinned library-ID table for this stack (NestJS 11, Prisma 7, Next.js 16, React 19, Expo SDK 55, NativeWind v4, TanStack Query v5, and ~25 others), and recipes for the most-touched libraries live in [`docs/agents/documentation-lookups.md`](docs/agents/documentation-lookups.md). Locked in [ADR-0017](docs/adr/0017-context7-as-canonical-doc-source.md).

The verification gate requires that you consulted Context7 for every external library your change touched (or recorded in the PR description why you didn't).

### Sprint + design skill set (cross-agent SKILL.md format)

Eight project-specific skills live under [`.agents/skills/`](./.agents/skills/) in the [Anthropic Agent Skills open-standard format](https://agentskills.io/specification) (YAML frontmatter + markdown body). Any agent that reads SKILL.md files — Claude Code, OpenAI Codex CLI, Cursor, Windsurf, Cline, Aider, Gemini CLI (via skill discovery), VS Code Copilot Agent Skills — can pick these up by name or by description-matched trigger:

| Skill | Phase of sprint lifecycle |
|---|---|
| [`create-sprint-issues-agent-skill`](./.agents/skills/create-sprint-issues-agent-skill/SKILL.md) | Start of sprint — reads `docs/prd/sprints/sprint-NN-*.md`, proposes a slicing, creates parent + child issues on GitHub, bumps roadmap to 🟡 |
| [`run-issue-agent-skill`](./.agents/skills/run-issue-agent-skill/SKILL.md) | During sprint — picks one issue, branches, optional design check, implements, PRs, self-merges, syncs main, unblocks dependents |
| [`resume-issue-agent-skill`](./.agents/skills/resume-issue-agent-skill/SKILL.md) | During sprint — picks up an issue a previous run bailed on; offers continue / rebase-and-continue / abandon-and-restart |
| [`sprint-status-agent-skill`](./.agents/skills/sprint-status-agent-skill/SKILL.md) | Anytime — read-only dashboard of current sprint, open PRs, unblocked queue, suggested next action |
| [`close-sprint-agent-skill`](./.agents/skills/close-sprint-agent-skill/SKILL.md) | End of sprint — verifies shipped-vs-planned, detects drift, writes retro doc, proposes doc-update commits |
| [`new-adr-agent-skill`](./.agents/skills/new-adr-agent-skill/SKILL.md) | Anytime — scaffolds a new ADR at `docs/adr/`, auto-numbers, offers PR rhythm (ADRs are immutable after merge) |
| [`wireframe-agent-skill`](./.agents/skills/wireframe-agent-skill/SKILL.md) | Pre-implementation — low-fi structural sketch of a screen, mobile-first, brand-aware, anti-pattern-free |
| [`hifi-design-agent-skill`](./.agents/skills/hifi-design-agent-skill/SKILL.md) | Pre-implementation — token-precise hi-fi spec with light+dark, all 5 states, motion, accessibility, trilingual copy, component shape |

These are mirrors of the Claude Code slash commands at `.claude/commands/<name>.md`. The Claude Code commands are the canonical source; the SKILL.md variants are adapted for cross-agent discovery and won't drift from the commands as long as both are updated together.

Each SKILL.md is self-contained (BRAND CONTEXT inlined where relevant) so non-Claude-Code agents have all the project context they need to operate without reading 12 separate UI/PRD docs.
